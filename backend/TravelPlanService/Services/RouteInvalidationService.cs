namespace TravelPlanService.Services;

public interface IRouteInvalidationService
{
    Task InvalidatePlanAsync(long planId, CancellationToken cancellationToken = default);
}

public sealed class RouteInvalidationService : IRouteInvalidationService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<RouteInvalidationService> _logger;

    public RouteInvalidationService(HttpClient httpClient, ILogger<RouteInvalidationService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task InvalidatePlanAsync(long planId, CancellationToken cancellationToken = default)
    {
        try
        {
            using var response = await _httpClient.DeleteAsync(
                $"internal/routes/{planId}/cache",
                cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "Route cache invalidation for plan {PlanId} returned HTTP {StatusCode}.",
                    planId,
                    (int)response.StatusCode);
            }
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            _logger.LogWarning("Route cache invalidation for plan {PlanId} timed out.", planId);
        }
        catch (HttpRequestException exception)
        {
            _logger.LogWarning(exception, "Route cache invalidation for plan {PlanId} failed.", planId);
        }
    }
}
