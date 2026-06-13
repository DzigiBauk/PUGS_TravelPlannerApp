using Microsoft.AspNetCore.Mvc;

namespace TravelPlanService.Controllers;

[ApiController]
[Route("[controller]")]
public class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        return Ok(new { status = "healthy", service = "TravelPlanService" });
    }
}
