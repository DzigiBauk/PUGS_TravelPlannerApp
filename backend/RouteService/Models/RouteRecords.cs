namespace RouteService.Models;

public sealed class TravelPlanRecord
{
    public long Id { get; set; }
    public long UserId { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
}

public sealed class ActivityRecord
{
    public long Id { get; set; }
    public long TravelPlanId { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public TimeSpan Time { get; set; }
    public string? Location { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
}

public sealed class ShareTokenRecord
{
    public long Id { get; set; }
    public long TravelPlanId { get; set; }
    public string Token { get; set; } = string.Empty;
    public DateTime? ExpiresAt { get; set; }
}
