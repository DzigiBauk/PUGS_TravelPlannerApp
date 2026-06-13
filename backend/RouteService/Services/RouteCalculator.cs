using Microsoft.Extensions.Options;
using RouteService.Models;

namespace RouteService.Services;

public sealed class RouteSettings
{
    public double EstimatedSpeedKilometersPerHour { get; set; } = 5;
}

public interface IRouteCalculator
{
    RouteResponseDto Calculate(long planId, DateTime? date, IReadOnlyList<ActivityRecord> activities);
}

public sealed class RouteCalculator : IRouteCalculator
{
    private const double EarthRadiusKilometers = 6371.0088;
    private readonly double _estimatedSpeedKilometersPerHour;

    public RouteCalculator(IOptions<RouteSettings> options)
    {
        _estimatedSpeedKilometersPerHour = options.Value.EstimatedSpeedKilometersPerHour;
        if (_estimatedSpeedKilometersPerHour <= 0)
        {
            throw new InvalidOperationException("RouteSettings:EstimatedSpeedKilometersPerHour must be greater than zero.");
        }
    }

    public RouteResponseDto Calculate(long planId, DateTime? date, IReadOnlyList<ActivityRecord> activities)
    {
        var points = activities.Select(ToPoint).ToList();
        var segments = new List<RouteSegmentDto>();

        for (var index = 1; index < points.Count; index++)
        {
            var from = points[index - 1];
            var to = points[index];
            var distance = CalculateDistance(from.Latitude, from.Longitude, to.Latitude, to.Longitude);
            segments.Add(new RouteSegmentDto
            {
                FromActivityId = from.ActivityId,
                ToActivityId = to.ActivityId,
                DistanceKilometers = Math.Round(distance, 3),
                EstimatedDurationMinutes = CalculateDurationMinutes(distance)
            });
        }

        return new RouteResponseDto
        {
            TravelPlanId = planId,
            Date = date?.Date,
            Points = points,
            Segments = segments,
            TotalDistanceKilometers = Math.Round(segments.Sum(segment => segment.DistanceKilometers), 3),
            EstimatedDurationMinutes = segments.Sum(segment => segment.EstimatedDurationMinutes)
        };
    }

    private int CalculateDurationMinutes(double distanceKilometers)
    {
        return (int)Math.Ceiling(distanceKilometers / _estimatedSpeedKilometersPerHour * 60);
    }

    private static RoutePointDto ToPoint(ActivityRecord activity)
    {
        return new RoutePointDto
        {
            ActivityId = activity.Id,
            Name = activity.Name,
            Date = activity.Date,
            Time = activity.Time,
            Location = activity.Location,
            Latitude = activity.Latitude!.Value,
            Longitude = activity.Longitude!.Value
        };
    }

    private static double CalculateDistance(double latitude1, double longitude1, double latitude2, double longitude2)
    {
        var latitudeDelta = ToRadians(latitude2 - latitude1);
        var longitudeDelta = ToRadians(longitude2 - longitude1);
        var firstLatitude = ToRadians(latitude1);
        var secondLatitude = ToRadians(latitude2);

        var haversine = Math.Pow(Math.Sin(latitudeDelta / 2), 2)
            + Math.Cos(firstLatitude) * Math.Cos(secondLatitude) * Math.Pow(Math.Sin(longitudeDelta / 2), 2);

        return EarthRadiusKilometers * 2 * Math.Atan2(Math.Sqrt(haversine), Math.Sqrt(1 - haversine));
    }

    private static double ToRadians(double degrees) => degrees * Math.PI / 180;
}
