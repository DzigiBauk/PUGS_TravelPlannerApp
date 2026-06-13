using Microsoft.EntityFrameworkCore;
using TravelPlanService.Data;

namespace TravelPlanService.Services;

public interface ITravelPlanDeletionService
{
    Task<bool> DeletePlanAsync(long planId, CancellationToken cancellationToken = default);
    Task<int> DeleteUserPlansAsync(long userId, CancellationToken cancellationToken = default);
}

public sealed class TravelPlanDeletionService : ITravelPlanDeletionService
{
    private readonly TravelPlanDbContext _dbContext;
    private readonly ITravelPlanCacheService _cacheService;
    private readonly IRouteInvalidationService _routeInvalidationService;

    public TravelPlanDeletionService(
        TravelPlanDbContext dbContext,
        ITravelPlanCacheService cacheService,
        IRouteInvalidationService routeInvalidationService)
    {
        _dbContext = dbContext;
        _cacheService = cacheService;
        _routeInvalidationService = routeInvalidationService;
    }

    public async Task<bool> DeletePlanAsync(long planId, CancellationToken cancellationToken = default)
    {
        var plan = await _dbContext.TravelPlans
            .FirstOrDefaultAsync(candidate => candidate.Id == planId, cancellationToken);
        if (plan == null) return false;

        await DeletePlansAsync([planId], cancellationToken);
        return true;
    }

    public async Task<int> DeleteUserPlansAsync(long userId, CancellationToken cancellationToken = default)
    {
        var planIds = await _dbContext.TravelPlans
            .Where(plan => plan.UserId == userId)
            .Select(plan => plan.Id)
            .ToListAsync(cancellationToken);

        await DeletePlansAsync(planIds, cancellationToken);
        return planIds.Count;
    }

    private async Task DeletePlansAsync(
        IReadOnlyCollection<long> planIds,
        CancellationToken cancellationToken)
    {
        if (planIds.Count == 0) return;

        var activities = await _dbContext.Activities
            .Where(entity => planIds.Contains(entity.TravelPlanId))
            .ToListAsync(cancellationToken);
        var destinations = await _dbContext.Destinations
            .Where(entity => planIds.Contains(entity.TravelPlanId))
            .ToListAsync(cancellationToken);
        var expenses = await _dbContext.Expenses
            .Where(entity => planIds.Contains(entity.TravelPlanId))
            .ToListAsync(cancellationToken);
        var checklistItems = await _dbContext.ChecklistItems
            .Where(entity => planIds.Contains(entity.TravelPlanId))
            .ToListAsync(cancellationToken);
        var shareTokens = await _dbContext.ShareTokens
            .Where(entity => planIds.Contains(entity.TravelPlanId))
            .ToListAsync(cancellationToken);
        var plans = await _dbContext.TravelPlans
            .Where(entity => planIds.Contains(entity.Id))
            .ToListAsync(cancellationToken);

        _dbContext.Activities.RemoveRange(activities);
        _dbContext.Destinations.RemoveRange(destinations);
        _dbContext.Expenses.RemoveRange(expenses);
        _dbContext.ChecklistItems.RemoveRange(checklistItems);
        _dbContext.ShareTokens.RemoveRange(shareTokens);
        _dbContext.TravelPlans.RemoveRange(plans);
        await _dbContext.SaveChangesAsync(cancellationToken);

        foreach (var planId in planIds)
        {
            await _cacheService.RemoveAsync(planId, cancellationToken);
            await _routeInvalidationService.InvalidatePlanAsync(planId, cancellationToken);
        }
    }
}
