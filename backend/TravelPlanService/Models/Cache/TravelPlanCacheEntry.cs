namespace TravelPlanService.Models.Cache;

public class TravelPlanCacheEntry
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Budget { get; set; }
    public decimal TotalExpenses { get; set; }
    public decimal RemainingBudget { get; set; }
    public DateTimeOffset CachedAt { get; set; }
}
