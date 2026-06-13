namespace RouteService.Models;

public sealed class RouteResponseDto
{
    public long TravelPlanId { get; init; }
    public DateTime? Date { get; init; }
    public DateTimeOffset GeneratedAt { get; set; }
    public bool FromCache { get; set; }
    public List<RoutePointDto> Points { get; init; } = new();
    public List<RouteSegmentDto> Segments { get; init; } = new();
    public double TotalDistanceKilometers { get; init; }
    public int EstimatedDurationMinutes { get; init; }
}

public sealed class RoutePointDto
{
    public long ActivityId { get; init; }
    public string Name { get; init; } = string.Empty;
    public DateTime Date { get; init; }
    public TimeSpan Time { get; init; }
    public string? Location { get; init; }
    public double Latitude { get; init; }
    public double Longitude { get; init; }
}

public sealed class RouteSegmentDto
{
    public long FromActivityId { get; init; }
    public long ToActivityId { get; init; }
    public double DistanceKilometers { get; init; }
    public int EstimatedDurationMinutes { get; init; }
}
