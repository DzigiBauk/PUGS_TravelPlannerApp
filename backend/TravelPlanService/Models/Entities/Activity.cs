namespace TravelPlanService.Models.Entities;

public class Activity
{
    public long Id { get; set; }
    public long TravelPlanId { get; set; }
    public long? DestinationId { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public TimeSpan Time { get; set; }
    public string? Location { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? Description { get; set; }
    public decimal? EstimatedCost { get; set; }
    public ActivityStatus Status { get; set; } = ActivityStatus.Planned;

    public TravelPlan TravelPlan { get; set; } = null!;
    public Destination? Destination { get; set; }
}

public enum ActivityStatus
{
    Planned = 0,
    Reserved = 1,
    Completed = 2,
    Cancelled = 3
}
