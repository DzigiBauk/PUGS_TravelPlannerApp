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
[Route("travel-plans/{planId:long}/destinations")]
[Authorize]
public class DestinationsController : ControllerBase
{
    private readonly TravelPlanDbContext _dbContext;
    private readonly IMapper _mapper;
    private readonly ITravelPlanBudgetService _budgetService;
    private readonly IRouteInvalidationService _routeInvalidationService;

    public DestinationsController(
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

    private async Task<TravelPlan?> GetOwnedPlan(long planId)
    {
        var userId = GetCurrentUserId();
        return await _dbContext.TravelPlans
            .AsNoTracking()
            .FirstOrDefaultAsync(tp => tp.Id == planId && tp.UserId == userId);
    }

    private static bool IsWithinPlanDates(TravelPlan plan, DestinationRequestDto dto)
    {
        return dto.ArrivalDate.Date >= plan.StartDate.Date
            && dto.DepartureDate.Date <= plan.EndDate.Date;
    }

    [HttpGet]
    public async Task<ActionResult<List<DestinationResponseDto>>> GetAll(long planId)
    {
        if (!await OwnsPlan(planId)) return NotFound();

        var destinations = await _dbContext.Destinations
            .AsNoTracking()
            .Where(d => d.TravelPlanId == planId)
            .OrderBy(d => d.ArrivalDate)
            .ToListAsync();

        return Ok(_mapper.Map<List<DestinationResponseDto>>(destinations));
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<DestinationResponseDto>> GetById(long planId, long id)
    {
        if (!await OwnsPlan(planId)) return NotFound();

        var destination = await _dbContext.Destinations
            .AsNoTracking()
            .FirstOrDefaultAsync(d => d.Id == id && d.TravelPlanId == planId);

        if (destination == null) return NotFound();
        return Ok(_mapper.Map<DestinationResponseDto>(destination));
    }

    [HttpPost]
    public async Task<ActionResult<DestinationResponseDto>> Create(long planId, [FromBody] DestinationRequestDto dto)
    {
        var plan = await GetOwnedPlan(planId);
        if (plan == null) return NotFound();
        if (!IsWithinPlanDates(plan, dto))
        {
            return BadRequest(new { message = "Destination dates must be within the travel plan dates." });
        }

        var destination = _mapper.Map<Destination>(dto);
        destination.TravelPlanId = planId;

        _dbContext.Destinations.Add(destination);
        await _dbContext.SaveChangesAsync();
        await _routeInvalidationService.InvalidatePlanAsync(planId);

        return CreatedAtAction(nameof(GetById), new { planId, id = destination.Id }, _mapper.Map<DestinationResponseDto>(destination));
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long planId, long id, [FromBody] DestinationRequestDto dto)
    {
        var plan = await GetOwnedPlan(planId);
        if (plan == null) return NotFound();
        if (!IsWithinPlanDates(plan, dto))
        {
            return BadRequest(new { message = "Destination dates must be within the travel plan dates." });
        }

        var destination = await _dbContext.Destinations
            .FirstOrDefaultAsync(d => d.Id == id && d.TravelPlanId == planId);

        if (destination == null) return NotFound();

        _mapper.Map(dto, destination);
        await _dbContext.SaveChangesAsync();
        await _routeInvalidationService.InvalidatePlanAsync(planId);

        return NoContent();
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long planId, long id)
    {
        if (!await OwnsPlan(planId)) return NotFound();

        var destination = await _dbContext.Destinations
            .FirstOrDefaultAsync(d => d.Id == id && d.TravelPlanId == planId);

        if (destination == null) return NotFound();

        var activities = await _dbContext.Activities
            .Where(activity => activity.TravelPlanId == planId && activity.DestinationId == id)
            .ToListAsync();

        _dbContext.Activities.RemoveRange(activities);
        _dbContext.Destinations.Remove(destination);
        await _dbContext.SaveChangesAsync();
        await _budgetService.RefreshCacheAsync(planId);
        await _routeInvalidationService.InvalidatePlanAsync(planId);

        return NoContent();
    }
}
