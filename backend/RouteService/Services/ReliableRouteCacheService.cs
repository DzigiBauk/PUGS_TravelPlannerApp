using System.Globalization;
using System.Text.Json;
using Microsoft.ServiceFabric.Data;
using Microsoft.ServiceFabric.Data.Collections;
using RouteService.Models;

namespace RouteService.Services;

public interface IRouteCacheService
{
    Task<RouteResponseDto?> GetAsync(long planId, DateTime? date, CancellationToken cancellationToken);
    Task SetAsync(RouteResponseDto route, CancellationToken cancellationToken);
    Task InvalidateAsync(long planId, DateTime? date, CancellationToken cancellationToken);
}

public sealed class ReliableRouteCacheService : IRouteCacheService
{
    private const string DictionaryName = "route-cache";
    private const string CacheVersion = "v2";
    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web);
    private readonly IReliableStateManager _stateManager;

    public ReliableRouteCacheService(IReliableStateManager stateManager)
    {
        _stateManager = stateManager;
    }

    public async Task<RouteResponseDto?> GetAsync(
        long planId,
        DateTime? date,
        CancellationToken cancellationToken)
    {
        var cache = await GetCacheAsync();
        using var transaction = _stateManager.CreateTransaction();
        var cached = await cache.TryGetValueAsync(
            transaction,
            CreateKey(planId, date),
            TimeSpan.FromSeconds(4),
            cancellationToken);

        if (!cached.HasValue)
        {
            return null;
        }

        var entry = JsonSerializer.Deserialize<RouteCacheEntry>(cached.Value, SerializerOptions);
        if (entry?.Route == null)
        {
            return null;
        }

        entry.Route.GeneratedAt = entry.GeneratedAt;
        entry.Route.FromCache = true;
        return entry.Route;
    }

    public async Task SetAsync(RouteResponseDto route, CancellationToken cancellationToken)
    {
        var cache = await GetCacheAsync();
        var entry = new RouteCacheEntry
        {
            GeneratedAt = route.GeneratedAt,
            Route = route
        };
        var payload = JsonSerializer.Serialize(entry, SerializerOptions);

        using var transaction = _stateManager.CreateTransaction();
        await cache.AddOrUpdateAsync(
            transaction,
            CreateKey(route.TravelPlanId, route.Date),
            payload,
            (_, _) => payload,
            TimeSpan.FromSeconds(4),
            cancellationToken);
        await transaction.CommitAsync();
    }

    public async Task InvalidateAsync(
        long planId,
        DateTime? date,
        CancellationToken cancellationToken)
    {
        var cache = await GetCacheAsync();

        if (date.HasValue)
        {
            using var transaction = _stateManager.CreateTransaction();
            await cache.TryRemoveAsync(
                transaction,
                CreateKey(planId, date),
                TimeSpan.FromSeconds(4),
                cancellationToken);
            await transaction.CommitAsync();
            return;
        }

        var keys = new List<string>();
        using (var readTransaction = _stateManager.CreateTransaction())
        {
            var entries = await cache.CreateEnumerableAsync(readTransaction, EnumerationMode.Unordered);
            using var enumerator = entries.GetAsyncEnumerator();
            while (await enumerator.MoveNextAsync(cancellationToken))
            {
                if (enumerator.Current.Key.StartsWith(CreatePlanPrefix(planId), StringComparison.Ordinal))
                {
                    keys.Add(enumerator.Current.Key);
                }
            }
        }

        using var writeTransaction = _stateManager.CreateTransaction();
        foreach (var key in keys)
        {
            await cache.TryRemoveAsync(
                writeTransaction,
                key,
                TimeSpan.FromSeconds(4),
                cancellationToken);
        }

        await writeTransaction.CommitAsync();
    }

    private Task<IReliableDictionary<string, string>> GetCacheAsync()
    {
        return _stateManager.GetOrAddAsync<IReliableDictionary<string, string>>(DictionaryName);
    }

    private static string CreateKey(long planId, DateTime? date)
    {
        var datePart = date.HasValue
            ? date.Value.Date.ToString("yyyyMMdd", CultureInfo.InvariantCulture)
            : "all";
        return $"{CreatePlanPrefix(planId)}{datePart}";
    }

    private static string CreatePlanPrefix(long planId) => $"{CacheVersion}:{planId}:";

    private sealed class RouteCacheEntry
    {
        public DateTimeOffset GeneratedAt { get; init; }
        public RouteResponseDto? Route { get; init; }
    }
}
