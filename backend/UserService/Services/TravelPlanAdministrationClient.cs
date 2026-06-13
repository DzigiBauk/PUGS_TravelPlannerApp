namespace UserService.Services;

public interface ITravelPlanAdministrationClient
{
    Task DeleteUserTravelPlansAsync(int userId, CancellationToken cancellationToken = default);
}

public sealed class TravelPlanAdministrationClient : ITravelPlanAdministrationClient
{
    private readonly HttpClient _httpClient;

    public TravelPlanAdministrationClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task DeleteUserTravelPlansAsync(int userId, CancellationToken cancellationToken = default)
    {
        using var response = await _httpClient.DeleteAsync(
            $"internal/users/{userId}/travel-plans",
            cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException(
                $"Travel-plan cleanup failed with HTTP status {(int)response.StatusCode}.");
        }
    }
}
