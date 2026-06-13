using System.Collections.Concurrent;
using TravelPlanService.Models.Cache;

namespace TravelPlanService.Services;

public interface ITravelPlanCacheService
{
    Task<TravelPlanCacheEntry?> GetAsync(long id, CancellationToken cancellationToken = default);
    Task SetAsync(TravelPlanCacheEntry entry, CancellationToken cancellationToken = default);
    Task SeedAsync(IEnumerable<TravelPlanCacheEntry> entries, CancellationToken cancellationToken = default);
    Task RemoveAsync(long id, CancellationToken cancellationToken = default);
}

public class InMemoryTravelPlanCacheService : ITravelPlanCacheService
{
    private readonly ConcurrentDictionary<long, TravelPlanCacheEntry> _entries = new();

    public Task<TravelPlanCacheEntry?> GetAsync(long id, CancellationToken cancellationToken = default)
    {
        _entries.TryGetValue(id, out var entry);
        return Task.FromResult(entry);
    }

    public Task SetAsync(TravelPlanCacheEntry entry, CancellationToken cancellationToken = default)
    {
        _entries[entry.Id] = entry;
        return Task.CompletedTask;
    }

    public Task SeedAsync(IEnumerable<TravelPlanCacheEntry> entries, CancellationToken cancellationToken = default)
    {
        foreach (var entry in entries)
        {
            _entries[entry.Id] = entry;
        }

        return Task.CompletedTask;
    }

    public Task RemoveAsync(long id, CancellationToken cancellationToken = default)
    {
        _entries.TryRemove(id, out _);
        return Task.CompletedTask;
    }
}
