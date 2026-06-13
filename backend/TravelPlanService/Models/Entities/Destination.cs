namespace TravelPlanService.Models.Entities;

public class Destination
{
    public long Id { get; set; }
    public long TravelPlanId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public DateTime ArrivalDate { get; set; }
    public DateTime DepartureDate { get; set; }
    public string? Description { get; set; }

    public TravelPlan TravelPlan { get; set; } = null!;
    public ICollection<Activity> Activities { get; set; } = new List<Activity>();
}
