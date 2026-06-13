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
[Route("admin/travel-plans")]
[Authorize(Roles = "Admin")]
public sealed class AdminTravelPlansController : ControllerBase
{
    private readonly TravelPlanDbContext _dbContext;
    private readonly IMapper _mapper;
    private readonly ITravelPlanBudgetService _budgetService;
    private readonly ITravelPlanDeletionService _deletionService;

    public AdminTravelPlansController(
        TravelPlanDbContext dbContext,
        IMapper mapper,
        ITravelPlanBudgetService budgetService,
        ITravelPlanDeletionService deletionService)
    {
        _dbContext = dbContext;
        _mapper = mapper;
        _budgetService = budgetService;
        _deletionService = deletionService;
    }

    [HttpGet]
    public async Task<ActionResult<List<AdminTravelPlanResponseDto>>> GetAll()
    {
        var plans = await _dbContext.TravelPlans
            .AsNoTracking()
            .OrderByDescending(plan => plan.CreatedAt)
            .Select(plan => new AdminTravelPlanResponseDto
            {
                Id = plan.Id,
                UserId = plan.UserId,
                Name = plan.Name,
                StartDate = plan.StartDate,
                EndDate = plan.EndDate,
                Budget = plan.Budget,
                TotalExpenses = plan.Expenses.Sum(expense => expense.Amount)
                    + plan.Activities
                        .Where(activity => activity.Status != ActivityStatus.Cancelled)
                        .Sum(activity => activity.EstimatedCost ?? 0m),
                CreatedAt = plan.CreatedAt
            })
            .ToListAsync();

        return Ok(plans);
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<TravelPlanResponseDto>> GetById(long id)
    {
        var plan = await _dbContext.TravelPlans
            .AsNoTracking()
            .Include(candidate => candidate.Destinations)
            .Include(candidate => candidate.Activities)
            .Include(candidate => candidate.Expenses)
            .Include(candidate => candidate.ChecklistItems)
            .FirstOrDefaultAsync(candidate => candidate.Id == id);

        if (plan == null) return NotFound();

        var response = _mapper.Map<TravelPlanResponseDto>(plan);
        response.TotalExpenses = _budgetService.CalculateTotal(plan.Expenses, plan.Activities);
        response.RemainingBudget = plan.Budget - response.TotalExpenses;
        return Ok(response);
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id)
    {
        return await _deletionService.DeletePlanAsync(id) ? NoContent() : NotFound();
    }
}
