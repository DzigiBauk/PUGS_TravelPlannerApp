using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RouteService.Services;

namespace RouteService.Controllers;

[ApiController]
[Route("internal/routes/{planId:long}/cache")]
[AllowAnonymous]
public sealed class InternalRoutesController : ControllerBase
{
    private readonly IRouteCacheService _routeCacheService;
    private readonly InternalApiSettings _settings;

    public InternalRoutesController(
        IRouteCacheService routeCacheService,
        InternalApiSettings settings)
    {
        _routeCacheService = routeCacheService;
        _settings = settings;
    }

    [HttpDelete]
    public async Task<IActionResult> Invalidate(long planId)
    {
        if (!Request.Headers.TryGetValue("X-Route-Service-Key", out var suppliedKey)
            || !KeysMatch(suppliedKey.ToString(), _settings.Key))
        {
            return Unauthorized();
        }

        await _routeCacheService.InvalidateAsync(planId, null, HttpContext.RequestAborted);
        return NoContent();
    }

    private static bool KeysMatch(string suppliedKey, string configuredKey)
    {
        var suppliedBytes = Encoding.UTF8.GetBytes(suppliedKey);
        var configuredBytes = Encoding.UTF8.GetBytes(configuredKey);
        return suppliedBytes.Length == configuredBytes.Length
            && CryptographicOperations.FixedTimeEquals(suppliedBytes, configuredBytes);
    }
}
