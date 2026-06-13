using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RouteService.Data;
using RouteService.Models;
using RouteService.Services;

namespace RouteService.Controllers;

[ApiController]
[Route("routes/{planId:long}")]
[Authorize]
public sealed class RoutesController : ControllerBase
{
    private readonly RouteDbContext _dbContext;
    private readonly IRouteCalculator _routeCalculator;
    private readonly IRouteCacheService _routeCacheService;

    public RoutesController(
        RouteDbContext dbContext,
        IRouteCalculator routeCalculator,
        IRouteCacheService routeCacheService)
    {
        _dbContext = dbContext;
        _routeCalculator = routeCalculator;
        _routeCacheService = routeCacheService;
    }

    [HttpGet]
    public async Task<ActionResult<RouteResponseDto>> Get(long planId, [FromQuery] DateTime? date)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!long.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized();
        }

        var plan = await _dbContext.TravelPlans
            .AsNoTracking()
            .FirstOrDefaultAsync(candidate => candidate.Id == planId && candidate.UserId == userId);
        if (plan == null)
        {
            return NotFound();
        }

        return await BuildRouteAsync(plan, date);
    }

    [HttpGet("/shared-routes/{token}")]
    [AllowAnonymous]
    public async Task<ActionResult<RouteResponseDto>> GetShared(string token, [FromQuery] DateTime? date)
    {
        var shareToken = await _dbContext.ShareTokens
            .AsNoTracking()
            .FirstOrDefaultAsync(candidate => candidate.Token == token);

        if (shareToken == null || (shareToken.ExpiresAt.HasValue && shareToken.ExpiresAt.Value < DateTime.UtcNow))
        {
            return NotFound(new { message = "Invalid or expired share token." });
        }

        var plan = await _dbContext.TravelPlans
            .AsNoTracking()
            .FirstOrDefaultAsync(candidate => candidate.Id == shareToken.TravelPlanId);
        if (plan == null)
        {
            return NotFound(new { message = "Invalid or expired share token." });
        }

        return await BuildRouteAsync(plan, date);
    }

    private async Task<ActionResult<RouteResponseDto>> BuildRouteAsync(TravelPlanRecord plan, DateTime? date)
    {
        var planId = plan.Id;

        if (date.HasValue && (date.Value.Date < plan.StartDate.Date || date.Value.Date > plan.EndDate.Date))
        {
            return BadRequest(new { message = "Route date must be within the travel plan dates." });
        }

        var cachedRoute = await _routeCacheService.GetAsync(planId, date, HttpContext.RequestAborted);
        if (cachedRoute != null)
        {
            return Ok(cachedRoute);
        }

        var query = _dbContext.Activities
            .AsNoTracking()
            .Where(activity => activity.TravelPlanId == planId
                && (activity.Latitude.HasValue || activity.Longitude.HasValue));

        if (date.HasValue)
        {
            var routeDate = date.Value.Date;
            query = query.Where(activity => activity.Date >= routeDate && activity.Date < routeDate.AddDays(1));
        }

        var activities = await query
            .OrderBy(activity => activity.Date)
            .ThenBy(activity => activity.Time)
            .ThenBy(activity => activity.Id)
            .ToListAsync();

        var invalidActivity = activities.FirstOrDefault(activity =>
            !activity.Latitude.HasValue
            || !activity.Longitude.HasValue
            || activity.Latitude is < -90 or > 90
            || activity.Longitude is < -180 or > 180);
        if (invalidActivity != null)
        {
            return BadRequest(new
            {
                message = $"Activity {invalidActivity.Id} has malformed coordinates."
            });
        }

        var route = _routeCalculator.Calculate(planId, date, activities);
        route.GeneratedAt = DateTimeOffset.UtcNow;
        route.FromCache = false;
        await _routeCacheService.SetAsync(route, HttpContext.RequestAborted);

        return Ok(route);
    }

    [HttpDelete("cache")]
    public async Task<IActionResult> InvalidateCache(long planId, [FromQuery] DateTime? date)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!long.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized();
        }

        var plan = await _dbContext.TravelPlans
            .AsNoTracking()
            .FirstOrDefaultAsync(candidate => candidate.Id == planId && candidate.UserId == userId);
        if (plan == null)
        {
            return NotFound();
        }

        if (date.HasValue && (date.Value.Date < plan.StartDate.Date || date.Value.Date > plan.EndDate.Date))
        {
            return BadRequest(new { message = "Route date must be within the travel plan dates." });
        }

        await _routeCacheService.InvalidateAsync(planId, date, HttpContext.RequestAborted);
        return NoContent();
    }
}
