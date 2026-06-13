namespace TravelPlanService.Models.Entities;

public class TravelPlan
{
    public long Id { get; set; }
    public long UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public decimal Budget { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Destination> Destinations { get; set; } = new List<Destination>();
    public ICollection<Activity> Activities { get; set; } = new List<Activity>();
    public ICollection<Expense> Expenses { get; set; } = new List<Expense>();
    public ICollection<ChecklistItem> ChecklistItems { get; set; } = new List<ChecklistItem>();
    public ICollection<ShareToken> ShareTokens { get; set; } = new List<ShareToken>();
}
