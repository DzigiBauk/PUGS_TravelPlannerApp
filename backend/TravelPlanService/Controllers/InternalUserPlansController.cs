using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TravelPlanService.Services;

namespace TravelPlanService.Controllers;

[ApiController]
[Route("internal/users/{userId:long}/travel-plans")]
[AllowAnonymous]
public sealed class InternalUserPlansController : ControllerBase
{
    private readonly ITravelPlanDeletionService _deletionService;
    private readonly InternalApiSettings _settings;

    public InternalUserPlansController(
        ITravelPlanDeletionService deletionService,
        InternalApiSettings settings)
    {
        _deletionService = deletionService;
        _settings = settings;
    }

    [HttpDelete]
    public async Task<IActionResult> DeleteForUser(long userId)
    {
        if (!Request.Headers.TryGetValue("X-Travel-Plan-Service-Key", out var suppliedKey)
            || !KeysMatch(suppliedKey.ToString(), _settings.Key))
        {
            return Unauthorized();
        }

        var deletedCount = await _deletionService.DeleteUserPlansAsync(
            userId,
            HttpContext.RequestAborted);
        return Ok(new { deletedCount });
    }

    private static bool KeysMatch(string suppliedKey, string configuredKey)
    {
        var suppliedBytes = Encoding.UTF8.GetBytes(suppliedKey);
        var configuredBytes = Encoding.UTF8.GetBytes(configuredKey);
        return suppliedBytes.Length == configuredBytes.Length
            && CryptographicOperations.FixedTimeEquals(suppliedBytes, configuredBytes);
    }
}
