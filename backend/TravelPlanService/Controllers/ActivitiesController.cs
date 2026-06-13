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
[Route("travel-plans/{planId:long}/activities")]
[Authorize]
public class ActivitiesController : ControllerBase
{
    private readonly TravelPlanDbContext _dbContext;
    private readonly IMapper _mapper;
    private readonly ITravelPlanBudgetService _budgetService;
    private readonly IRouteInvalidationService _routeInvalidationService;

    public ActivitiesController(
        TravelPlanDbContext dbContext,
        IMapper mapper,
        ITravelPlanBudgetService budgetService,
        IRouteInvalidationService routeInvalidationService)
    {
        _dbContext = dbContext;
        _mapper = mapper;
        _budgetService = budgetService;
        _routeInvalidationService = routeInvalidationService;
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

    private async Task<bool> DestinationBelongsToPlan(long planId, long? destinationId)
    {
        return !destinationId.HasValue || await _dbContext.Destinations
            .AnyAsync(destination => destination.Id == destinationId.Value && destination.TravelPlanId == planId);
    }

    [HttpGet]
    public async Task<ActionResult<List<ActivityResponseDto>>> GetAll(long planId, [FromQuery] DateTime? date)
    {
        if (!await OwnsPlan(planId)) return NotFound();

        var query = _dbContext.Activities
            .AsNoTracking()
            .Where(a => a.TravelPlanId == planId);

        if (date.HasValue)
        {
            query = query.Where(a => a.Date.Date == date.Value.Date);
        }

        var activities = await query
            .OrderBy(a => a.Date)
            .ThenBy(a => a.Time)
            .ThenBy(a => a.Id)
            .ToListAsync();
        return Ok(_mapper.Map<List<ActivityResponseDto>>(activities));
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<ActivityResponseDto>> GetById(long planId, long id)
    {
        if (!await OwnsPlan(planId)) return NotFound();

        var activity = await _dbContext.Activities
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == id && a.TravelPlanId == planId);

        if (activity == null) return NotFound();
        return Ok(_mapper.Map<ActivityResponseDto>(activity));
    }

    [HttpPost]
    public async Task<ActionResult<ActivityResponseDto>> Create(long planId, [FromBody] ActivityRequestDto dto)
    {
        if (!await OwnsPlan(planId)) return NotFound();

        var plan = await _dbContext.TravelPlans.AsNoTracking().FirstAsync(tp => tp.Id == planId);
        if (dto.Date.Date < plan.StartDate.Date || dto.Date.Date > plan.EndDate.Date)
        {
            return BadRequest(new { message = "Activity date must be within the travel plan dates." });
        }
        if (!await DestinationBelongsToPlan(planId, dto.DestinationId))
        {
            return BadRequest(new { message = "The selected destination does not belong to this travel plan." });
        }

        var activity = _mapper.Map<Activity>(dto);
        activity.TravelPlanId = planId;

        _dbContext.Activities.Add(activity);
        await _dbContext.SaveChangesAsync();
        await _budgetService.RefreshCacheAsync(planId);
        await _routeInvalidationService.InvalidatePlanAsync(planId);

        return CreatedAtAction(nameof(GetById), new { planId, id = activity.Id }, _mapper.Map<ActivityResponseDto>(activity));
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long planId, long id, [FromBody] ActivityRequestDto dto)
    {
        if (!await OwnsPlan(planId)) return NotFound();

        var activity = await _dbContext.Activities
            .FirstOrDefaultAsync(a => a.Id == id && a.TravelPlanId == planId);

        if (activity == null) return NotFound();

        var plan = await _dbContext.TravelPlans.AsNoTracking().FirstAsync(tp => tp.Id == planId);
        if (dto.Date.Date < plan.StartDate.Date || dto.Date.Date > plan.EndDate.Date)
        {
            return BadRequest(new { message = "Activity date must be within the travel plan dates." });
        }
        if (!await DestinationBelongsToPlan(planId, dto.DestinationId))
        {
            return BadRequest(new { message = "The selected destination does not belong to this travel plan." });
        }

        _mapper.Map(dto, activity);
        await _dbContext.SaveChangesAsync();
        await _budgetService.RefreshCacheAsync(planId);
        await _routeInvalidationService.InvalidatePlanAsync(planId);

        return NoContent();
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long planId, long id)
    {
        if (!await OwnsPlan(planId)) return NotFound();

        var activity = await _dbContext.Activities
            .FirstOrDefaultAsync(a => a.Id == id && a.TravelPlanId == planId);

        if (activity == null) return NotFound();

        _dbContext.Activities.Remove(activity);
        await _dbContext.SaveChangesAsync();
        await _budgetService.RefreshCacheAsync(planId);
        await _routeInvalidationService.InvalidatePlanAsync(planId);

        return NoContent();
    }
}
