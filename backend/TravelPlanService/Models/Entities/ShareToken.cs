namespace TravelPlanService.Models.Entities;

public class ShareToken
{
    public long Id { get; set; }
    public long TravelPlanId { get; set; }
    public string Token { get; set; } = string.Empty;
    public ShareAccessType AccessType { get; set; } = ShareAccessType.VIEW;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ExpiresAt { get; set; }

    public TravelPlan TravelPlan { get; set; } = null!;
}

public enum ShareAccessType
{
    VIEW,
    EDIT
}
