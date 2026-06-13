using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelPlanService.Data;
using TravelPlanService.Models.Cache;
using TravelPlanService.Models.Dtos;
using TravelPlanService.Models.Entities;
using TravelPlanService.Services;

namespace TravelPlanService.Controllers;

[ApiController]
[Route("travel-plans")]
[Authorize]
public class TravelPlansController : ControllerBase
{
    private readonly TravelPlanDbContext _dbContext;
    private readonly IMapper _mapper;
    private readonly ITravelPlanCacheService _cacheService;
    private readonly ITravelPlanBudgetService _budgetService;
    private readonly IRouteInvalidationService _routeInvalidationService;
    private readonly ITravelPlanDeletionService _deletionService;

    public TravelPlansController(
        TravelPlanDbContext dbContext,
        IMapper mapper,
        ITravelPlanCacheService cacheService,
        ITravelPlanBudgetService budgetService,
        IRouteInvalidationService routeInvalidationService,
        ITravelPlanDeletionService deletionService)
    {
        _dbContext = dbContext;
        _mapper = mapper;
        _cacheService = cacheService;
        _budgetService = budgetService;
        _routeInvalidationService = routeInvalidationService;
        _deletionService = deletionService;
    }

    private long GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        return long.TryParse(userIdClaim, out var userId) ? userId : 0;
    }

    [HttpGet]
    public async Task<ActionResult<List<TravelPlanResponseDto>>> GetAll()
    {
        var userId = GetCurrentUserId();
        var plans = await _dbContext.TravelPlans
            .AsNoTracking()
            .Include(tp => tp.Activities)
            .Include(tp => tp.Expenses)
            .Where(tp => tp.UserId == userId)
            .OrderByDescending(tp => tp.CreatedAt)
            .ToListAsync();

        var dtos = _mapper.Map<List<TravelPlanResponseDto>>(plans);
        for (var index = 0; index < plans.Count; index++)
        {
            dtos[index].TotalExpenses = _budgetService.CalculateTotal(plans[index].Expenses, plans[index].Activities);
            dtos[index].RemainingBudget = plans[index].Budget - dtos[index].TotalExpenses;
        }
        return Ok(dtos);
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<TravelPlanResponseDto>> GetById(long id)
    {
        var userId = GetCurrentUserId();

        // Try cache first
        var cached = await _cacheService.GetAsync(id);
        if (cached != null)
        {
            var plan = await _dbContext.TravelPlans
                .AsNoTracking()
                .Include(tp => tp.Destinations)
                .Include(tp => tp.Activities)
                .Include(tp => tp.Expenses)
                .Include(tp => tp.ChecklistItems)
                .FirstOrDefaultAsync(tp => tp.Id == id && tp.UserId == userId);

            if (plan == null) return NotFound();

            var dto = _mapper.Map<TravelPlanResponseDto>(plan);
            dto.TotalExpenses = cached.TotalExpenses;
            dto.RemainingBudget = cached.RemainingBudget;
            return Ok(dto);
        }

        var planFromDb = await _dbContext.TravelPlans
            .AsNoTracking()
            .Include(tp => tp.Destinations)
            .Include(tp => tp.Activities)
            .Include(tp => tp.Expenses)
            .Include(tp => tp.ChecklistItems)
            .FirstOrDefaultAsync(tp => tp.Id == id && tp.UserId == userId);

        if (planFromDb == null) return NotFound();

        var totalExpenses = _budgetService.CalculateTotal(planFromDb.Expenses, planFromDb.Activities);
        var remainingBudget = planFromDb.Budget - totalExpenses;

        // Populate cache
        await _cacheService.SetAsync(new TravelPlanCacheEntry
        {
            Id = planFromDb.Id,
            Name = planFromDb.Name,
            Budget = planFromDb.Budget,
            TotalExpenses = totalExpenses,
            RemainingBudget = remainingBudget,
            CachedAt = DateTimeOffset.UtcNow
        });

        var responseDto = _mapper.Map<TravelPlanResponseDto>(planFromDb);
        responseDto.TotalExpenses = totalExpenses;
        responseDto.RemainingBudget = remainingBudget;
        return Ok(responseDto);
    }

    [HttpPost]
    public async Task<ActionResult<TravelPlanResponseDto>> Create([FromBody] TravelPlanRequestDto dto)
    {
        var userId = GetCurrentUserId();
        var plan = _mapper.Map<TravelPlan>(dto);
        plan.UserId = userId;
        plan.CreatedAt = DateTime.UtcNow;

        _dbContext.TravelPlans.Add(plan);
        await _dbContext.SaveChangesAsync();

        await _cacheService.SetAsync(new TravelPlanCacheEntry
        {
            Id = plan.Id,
            Name = plan.Name,
            Budget = plan.Budget,
            TotalExpenses = 0,
            RemainingBudget = plan.Budget,
            CachedAt = DateTimeOffset.UtcNow
        });

        var response = _mapper.Map<TravelPlanResponseDto>(plan);
        return CreatedAtAction(nameof(GetById), new { id = plan.Id }, response);
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] TravelPlanRequestDto dto)
    {
        var userId = GetCurrentUserId();
        var plan = await _dbContext.TravelPlans.FirstOrDefaultAsync(tp => tp.Id == id && tp.UserId == userId);
        if (plan == null) return NotFound();

        var startDate = dto.StartDate.Date;
        var endExclusive = dto.EndDate.Date.AddDays(1);
        var hasInvalidDestinations = await _dbContext.Destinations.AnyAsync(destination =>
            destination.TravelPlanId == id
            && (destination.ArrivalDate < startDate || destination.DepartureDate >= endExclusive));
        var hasInvalidActivities = await _dbContext.Activities.AnyAsync(activity =>
            activity.TravelPlanId == id
            && (activity.Date < startDate || activity.Date >= endExclusive));

        if (hasInvalidDestinations || hasInvalidActivities)
        {
            return BadRequest(new
            {
                message = "Travel plan dates cannot exclude existing destinations or activities."
            });
        }

        _mapper.Map(dto, plan);
        await _dbContext.SaveChangesAsync();
        await _routeInvalidationService.InvalidatePlanAsync(id);

        await _budgetService.RefreshCacheAsync(id);

        return NoContent();
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id)
    {
        var userId = GetCurrentUserId();
        var plan = await _dbContext.TravelPlans.FirstOrDefaultAsync(tp => tp.Id == id && tp.UserId == userId);
        if (plan == null) return NotFound();

        await _deletionService.DeletePlanAsync(id);
        return NoContent();
    }
}
