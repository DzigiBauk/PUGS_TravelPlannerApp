using Microsoft.EntityFrameworkCore;
using TravelPlanService.Data;
using TravelPlanService.Models.Cache;
using TravelPlanService.Models.Entities;

namespace TravelPlanService.Services;

public interface ITravelPlanBudgetService
{
    decimal CalculateTotal(IEnumerable<Expense> expenses, IEnumerable<Activity> activities);
    Task<decimal> CalculateTotalAsync(long planId);
    Task RefreshCacheAsync(long planId);
}

public sealed class TravelPlanBudgetService : ITravelPlanBudgetService
{
    private readonly TravelPlanDbContext _dbContext;
    private readonly ITravelPlanCacheService _cacheService;

    public TravelPlanBudgetService(
        TravelPlanDbContext dbContext,
        ITravelPlanCacheService cacheService)
    {
        _dbContext = dbContext;
        _cacheService = cacheService;
    }

    public decimal CalculateTotal(IEnumerable<Expense> expenses, IEnumerable<Activity> activities)
    {
        var recordedExpenses = expenses.Sum(expense => expense.Amount);
        var activityCosts = activities
            .Where(activity => activity.Status != ActivityStatus.Cancelled)
            .Sum(activity => activity.EstimatedCost ?? 0m);

        return recordedExpenses + activityCosts;
    }

    public async Task<decimal> CalculateTotalAsync(long planId)
    {
        var recordedExpenses = await _dbContext.Expenses
            .Where(expense => expense.TravelPlanId == planId)
            .SumAsync(expense => expense.Amount);
        var activityCosts = await _dbContext.Activities
            .Where(activity => activity.TravelPlanId == planId
                && activity.Status != ActivityStatus.Cancelled)
            .SumAsync(activity => activity.EstimatedCost ?? 0m);

        return recordedExpenses + activityCosts;
    }

    public async Task RefreshCacheAsync(long planId)
    {
        var plan = await _dbContext.TravelPlans
            .AsNoTracking()
            .FirstOrDefaultAsync(candidate => candidate.Id == planId);
        if (plan == null) return;

        var totalExpenses = await CalculateTotalAsync(planId);
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
}
