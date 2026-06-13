using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelPlanService.Data;
using TravelPlanService.Models.Dtos;
using TravelPlanService.Models.Entities;
using TravelPlanService.Services;

namespace TravelPlanService.Controllers;

[ApiController]
[Route("travel-plans/{planId:long}/expenses")]
[Authorize]
public class ExpensesController : ControllerBase
{
    private readonly TravelPlanDbContext _dbContext;
    private readonly IMapper _mapper;
    private readonly ITravelPlanCacheService _cacheService;
    private readonly ITravelPlanBudgetService _budgetService;

    public ExpensesController(
        TravelPlanDbContext dbContext,
        IMapper mapper,
        ITravelPlanCacheService cacheService,
        ITravelPlanBudgetService budgetService)
    {
        _dbContext = dbContext;
        _mapper = mapper;
        _cacheService = cacheService;
        _budgetService = budgetService;
    }

    private long GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        return long.TryParse(userIdClaim, out var userId) ? userId : 0;
    }

    private async Task<bool> OwnsPlan(long planId)
    {
        var userId = GetCurrentUserId();
        return await _dbContext.TravelPlans.AnyAsync(tp => tp.Id == planId && tp.UserId == userId);
    }

    private async Task UpdateCacheAsync(long planId)
    {
        await _budgetService.RefreshCacheAsync(planId);
    }

    [HttpGet]
    public async Task<ActionResult<List<ExpenseResponseDto>>> GetAll(long planId)
    {
        if (!await OwnsPlan(planId)) return NotFound();

        var expenses = await _dbContext.Expenses
            .AsNoTracking()
            .Where(e => e.TravelPlanId == planId)
            .OrderByDescending(e => e.Date)
            .ToListAsync();

        return Ok(_mapper.Map<List<ExpenseResponseDto>>(expenses));
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<ExpenseResponseDto>> GetById(long planId, long id)
    {
        if (!await OwnsPlan(planId)) return NotFound();

        var expense = await _dbContext.Expenses
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == id && e.TravelPlanId == planId);

        if (expense == null) return NotFound();
        return Ok(_mapper.Map<ExpenseResponseDto>(expense));
    }

    [HttpPost]
    public async Task<ActionResult<ExpenseResponseDto>> Create(long planId, [FromBody] ExpenseRequestDto dto)
    {
        if (!await OwnsPlan(planId)) return NotFound();

        var expense = _mapper.Map<Expense>(dto);
        expense.TravelPlanId = planId;

        _dbContext.Expenses.Add(expense);
        await _dbContext.SaveChangesAsync();

        await UpdateCacheAsync(planId);

        return CreatedAtAction(nameof(GetById), new { planId, id = expense.Id }, _mapper.Map<ExpenseResponseDto>(expense));
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long planId, long id, [FromBody] ExpenseRequestDto dto)
    {
        if (!await OwnsPlan(planId)) return NotFound();

        var expense = await _dbContext.Expenses
            .FirstOrDefaultAsync(e => e.Id == id && e.TravelPlanId == planId);

        if (expense == null) return NotFound();

        _mapper.Map(dto, expense);
        await _dbContext.SaveChangesAsync();

        await UpdateCacheAsync(planId);

        return NoContent();
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long planId, long id)
    {
        if (!await OwnsPlan(planId)) return NotFound();

        var expense = await _dbContext.Expenses
            .FirstOrDefaultAsync(e => e.Id == id && e.TravelPlanId == planId);

        if (expense == null) return NotFound();

        _dbContext.Expenses.Remove(expense);
        await _dbContext.SaveChangesAsync();

        await UpdateCacheAsync(planId);

        return NoContent();
    }

    [HttpGet("budget")]
    public async Task<ActionResult<BudgetResponseDto>> GetBudget(long planId)
    {
        if (!await OwnsPlan(planId)) return NotFound();

        var cached = await _cacheService.GetAsync(planId);
        if (cached != null)
        {
            return Ok(new BudgetResponseDto
            {
                TravelPlanId = planId,
                Budget = cached.Budget,
                TotalExpenses = cached.TotalExpenses,
                RemainingBudget = cached.RemainingBudget
            });
        }

        var plan = await _dbContext.TravelPlans.AsNoTracking().FirstAsync(tp => tp.Id == planId);
        var totalExpenses = await _budgetService.CalculateTotalAsync(planId);

        var response = new BudgetResponseDto
        {
            TravelPlanId = planId,
            Budget = plan.Budget,
            TotalExpenses = totalExpenses,
            RemainingBudget = plan.Budget - totalExpenses
        };

        await _budgetService.RefreshCacheAsync(planId);

        return Ok(response);
    }
}
