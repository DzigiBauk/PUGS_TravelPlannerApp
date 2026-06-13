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
[Route("shared/{token}")]
[AllowAnonymous]
public class SharedPlanEditingController : ControllerBase
{
    private readonly TravelPlanDbContext _dbContext;
    private readonly IMapper _mapper;
    private readonly ITravelPlanCacheService _cacheService;
    private readonly IRouteInvalidationService _routeInvalidationService;

    public SharedPlanEditingController(
        TravelPlanDbContext dbContext,
        IMapper mapper,
        ITravelPlanCacheService cacheService,
        IRouteInvalidationService routeInvalidationService)
    {
        _dbContext = dbContext;
        _mapper = mapper;
        _cacheService = cacheService;
        _routeInvalidationService = routeInvalidationService;
    }

    private async Task<(ShareToken? Token, IActionResult? Error)> GetEditTokenAsync(string token)
    {
        var shareToken = await _dbContext.ShareTokens
            .AsNoTracking()
            .FirstOrDefaultAsync(st => st.Token == token);

        if (shareToken == null || (shareToken.ExpiresAt.HasValue && shareToken.ExpiresAt.Value < DateTime.UtcNow))
        {
            return (null, NotFound(new { message = "Invalid or expired share token." }));
        }

        if (shareToken.AccessType != ShareAccessType.EDIT)
        {
            return (null, StatusCode(StatusCodes.Status403Forbidden, new { message = "This share link is read-only." }));
        }

        return (shareToken, null);
    }

    private async Task UpdateCacheAsync(long planId)
    {
        var plan = await _dbContext.TravelPlans.AsNoTracking().FirstOrDefaultAsync(tp => tp.Id == planId);
        if (plan == null) return;

        var totalExpenses = await _dbContext.Expenses
            .Where(expense => expense.TravelPlanId == planId)
            .SumAsync(expense => expense.Amount);

        await _cacheService.SetAsync(new TravelPlanCacheEntry
        {
            Id = plan.Id,
            Name = plan.Name,
            Budget = plan.Budget,
            TotalExpenses = totalExpenses,
            RemainingBudget = plan.Budget - totalExpenses,
            CachedAt = DateTimeOffset.UtcNow
        });
    }

    [HttpPut("plan")]
    public async Task<IActionResult> UpdatePlan(string token, [FromBody] TravelPlanRequestDto dto)
    {
        var access = await GetEditTokenAsync(token);
        if (access.Error != null) return access.Error;

        var planId = access.Token!.TravelPlanId;
        var plan = await _dbContext.TravelPlans.FirstOrDefaultAsync(tp => tp.Id == planId);
        if (plan == null) return NotFound();

        var startDate = dto.StartDate.Date;
        var endExclusive = dto.EndDate.Date.AddDays(1);
        var invalidDestination = await _dbContext.Destinations.AnyAsync(destination =>
            destination.TravelPlanId == planId
            && (destination.ArrivalDate < startDate || destination.DepartureDate >= endExclusive));
        var invalidActivity = await _dbContext.Activities.AnyAsync(activity =>
            activity.TravelPlanId == planId
            && (activity.Date < startDate || activity.Date >= endExclusive));

        if (invalidDestination || invalidActivity)
        {
            return BadRequest(new { message = "Travel plan dates cannot exclude existing destinations or activities." });
        }

        _mapper.Map(dto, plan);
        await _dbContext.SaveChangesAsync();
        await UpdateCacheAsync(planId);
        await _routeInvalidationService.InvalidatePlanAsync(planId);
        return NoContent();
    }

    [HttpPost("destinations")]
    public async Task<IActionResult> CreateDestination(string token, [FromBody] DestinationRequestDto dto)
    {
        var access = await GetEditTokenAsync(token);
        if (access.Error != null) return access.Error;

        var planId = access.Token!.TravelPlanId;
        var plan = await _dbContext.TravelPlans.AsNoTracking().FirstOrDefaultAsync(tp => tp.Id == planId);
        if (plan == null) return NotFound();
        if (dto.ArrivalDate.Date < plan.StartDate.Date || dto.DepartureDate.Date > plan.EndDate.Date)
        {
            return BadRequest(new { message = "Destination dates must be within the travel plan dates." });
        }

        var destination = _mapper.Map<Destination>(dto);
        destination.TravelPlanId = planId;
        _dbContext.Destinations.Add(destination);
        await _dbContext.SaveChangesAsync();
        await _routeInvalidationService.InvalidatePlanAsync(planId);
        return Ok(_mapper.Map<DestinationResponseDto>(destination));
    }

    [HttpPut("destinations/{id:long}")]
    public async Task<IActionResult> UpdateDestination(string token, long id, [FromBody] DestinationRequestDto dto)
    {
        var access = await GetEditTokenAsync(token);
        if (access.Error != null) return access.Error;

        var planId = access.Token!.TravelPlanId;
        var plan = await _dbContext.TravelPlans.AsNoTracking().FirstOrDefaultAsync(tp => tp.Id == planId);
        if (plan == null) return NotFound();
        if (dto.ArrivalDate.Date < plan.StartDate.Date || dto.DepartureDate.Date > plan.EndDate.Date)
        {
            return BadRequest(new { message = "Destination dates must be within the travel plan dates." });
        }

        var destination = await _dbContext.Destinations.FirstOrDefaultAsync(d => d.Id == id && d.TravelPlanId == planId);
        if (destination == null) return NotFound();
        _mapper.Map(dto, destination);
        await _dbContext.SaveChangesAsync();
        await _routeInvalidationService.InvalidatePlanAsync(planId);
        return NoContent();
    }

    [HttpDelete("destinations/{id:long}")]
    public async Task<IActionResult> DeleteDestination(string token, long id)
    {
        var access = await GetEditTokenAsync(token);
        if (access.Error != null) return access.Error;
        var planId = access.Token!.TravelPlanId;

        var destination = await _dbContext.Destinations.FirstOrDefaultAsync(d => d.Id == id && d.TravelPlanId == planId);
        if (destination == null) return NotFound();
        var activities = await _dbContext.Activities
            .Where(activity => activity.TravelPlanId == planId && activity.DestinationId == id)
            .ToListAsync();
        _dbContext.Activities.RemoveRange(activities);
        _dbContext.Destinations.Remove(destination);
        await _dbContext.SaveChangesAsync();
        await _routeInvalidationService.InvalidatePlanAsync(planId);
        return NoContent();
    }

    [HttpPost("activities")]
    public async Task<IActionResult> CreateActivity(string token, [FromBody] ActivityRequestDto dto)
    {
        var access = await GetEditTokenAsync(token);
        if (access.Error != null) return access.Error;
        var planId = access.Token!.TravelPlanId;

        var validationError = await ValidateActivityAsync(planId, dto);
        if (validationError != null) return validationError;

        var activity = _mapper.Map<Activity>(dto);
        activity.TravelPlanId = planId;
        _dbContext.Activities.Add(activity);
        await _dbContext.SaveChangesAsync();
        await _routeInvalidationService.InvalidatePlanAsync(planId);
        return Ok(_mapper.Map<ActivityResponseDto>(activity));
    }

    [HttpPut("activities/{id:long}")]
    public async Task<IActionResult> UpdateActivity(string token, long id, [FromBody] ActivityRequestDto dto)
    {
        var access = await GetEditTokenAsync(token);
        if (access.Error != null) return access.Error;
        var planId = access.Token!.TravelPlanId;

        var activity = await _dbContext.Activities.FirstOrDefaultAsync(a => a.Id == id && a.TravelPlanId == planId);
        if (activity == null) return NotFound();
        var validationError = await ValidateActivityAsync(planId, dto);
        if (validationError != null) return validationError;

        _mapper.Map(dto, activity);
        await _dbContext.SaveChangesAsync();
        await _routeInvalidationService.InvalidatePlanAsync(planId);
        return NoContent();
    }

    [HttpDelete("activities/{id:long}")]
    public async Task<IActionResult> DeleteActivity(string token, long id)
    {
        var access = await GetEditTokenAsync(token);
        if (access.Error != null) return access.Error;
        var planId = access.Token!.TravelPlanId;
        var activity = await _dbContext.Activities.FirstOrDefaultAsync(a => a.Id == id && a.TravelPlanId == planId);
        if (activity == null) return NotFound();
        _dbContext.Activities.Remove(activity);
        await _dbContext.SaveChangesAsync();
        await _routeInvalidationService.InvalidatePlanAsync(planId);
        return NoContent();
    }

    [HttpPost("expenses")]
    public async Task<IActionResult> CreateExpense(string token, [FromBody] ExpenseRequestDto dto)
    {
        var access = await GetEditTokenAsync(token);
        if (access.Error != null) return access.Error;
        var planId = access.Token!.TravelPlanId;
        var expense = _mapper.Map<Expense>(dto);
        expense.TravelPlanId = planId;
        _dbContext.Expenses.Add(expense);
        await _dbContext.SaveChangesAsync();
        await UpdateCacheAsync(planId);
        return Ok(_mapper.Map<ExpenseResponseDto>(expense));
    }

    [HttpPut("expenses/{id:long}")]
    public async Task<IActionResult> UpdateExpense(string token, long id, [FromBody] ExpenseRequestDto dto)
    {
        var access = await GetEditTokenAsync(token);
        if (access.Error != null) return access.Error;
        var planId = access.Token!.TravelPlanId;
        var expense = await _dbContext.Expenses.FirstOrDefaultAsync(e => e.Id == id && e.TravelPlanId == planId);
        if (expense == null) return NotFound();
        _mapper.Map(dto, expense);
        await _dbContext.SaveChangesAsync();
        await UpdateCacheAsync(planId);
        return NoContent();
    }

    [HttpDelete("expenses/{id:long}")]
    public async Task<IActionResult> DeleteExpense(string token, long id)
    {
        var access = await GetEditTokenAsync(token);
        if (access.Error != null) return access.Error;
        var planId = access.Token!.TravelPlanId;
        var expense = await _dbContext.Expenses.FirstOrDefaultAsync(e => e.Id == id && e.TravelPlanId == planId);
        if (expense == null) return NotFound();
        _dbContext.Expenses.Remove(expense);
        await _dbContext.SaveChangesAsync();
        await UpdateCacheAsync(planId);
        return NoContent();
    }

    [HttpPost("checklist")]
    public async Task<IActionResult> CreateChecklistItem(string token, [FromBody] ChecklistItemRequestDto dto)
    {
        var access = await GetEditTokenAsync(token);
        if (access.Error != null) return access.Error;
        var item = _mapper.Map<ChecklistItem>(dto);
        item.TravelPlanId = access.Token!.TravelPlanId;
        _dbContext.ChecklistItems.Add(item);
        await _dbContext.SaveChangesAsync();
        return Ok(_mapper.Map<ChecklistItemResponseDto>(item));
    }

    [HttpPut("checklist/{id:long}")]
    public async Task<IActionResult> UpdateChecklistItem(string token, long id, [FromBody] ChecklistItemRequestDto dto)
    {
        var access = await GetEditTokenAsync(token);
        if (access.Error != null) return access.Error;
        var planId = access.Token!.TravelPlanId;
        var item = await _dbContext.ChecklistItems.FirstOrDefaultAsync(c => c.Id == id && c.TravelPlanId == planId);
        if (item == null) return NotFound();
        _mapper.Map(dto, item);
        await _dbContext.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("checklist/{id:long}")]
    public async Task<IActionResult> DeleteChecklistItem(string token, long id)
    {
        var access = await GetEditTokenAsync(token);
        if (access.Error != null) return access.Error;
        var planId = access.Token!.TravelPlanId;
        var item = await _dbContext.ChecklistItems.FirstOrDefaultAsync(c => c.Id == id && c.TravelPlanId == planId);
        if (item == null) return NotFound();
        _dbContext.ChecklistItems.Remove(item);
        await _dbContext.SaveChangesAsync();
        return NoContent();
    }

    private async Task<IActionResult?> ValidateActivityAsync(long planId, ActivityRequestDto dto)
    {
        var plan = await _dbContext.TravelPlans.AsNoTracking().FirstOrDefaultAsync(tp => tp.Id == planId);
        if (plan == null) return NotFound();
        if (dto.Date.Date < plan.StartDate.Date || dto.Date.Date > plan.EndDate.Date)
        {
            return BadRequest(new { message = "Activity date must be within the travel plan dates." });
        }
        if (dto.DestinationId.HasValue && !await _dbContext.Destinations.AnyAsync(destination =>
            destination.Id == dto.DestinationId.Value && destination.TravelPlanId == planId))
        {
            return BadRequest(new { message = "The selected destination does not belong to this travel plan." });
        }
        return null;
    }
}
