namespace TravelPlanService.Models.Entities;

public class ChecklistItem
{
    public long Id { get; set; }
    public long TravelPlanId { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsCompleted { get; set; }

    public TravelPlan TravelPlan { get; set; } = null!;
}
