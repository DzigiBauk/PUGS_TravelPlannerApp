using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelPlanService.Data;
using TravelPlanService.Models.Dtos;
using TravelPlanService.Models.Entities;

namespace TravelPlanService.Controllers;

[ApiController]
[Route("travel-plans/{planId:long}/share")]
[Authorize]
public class ShareTokensController : ControllerBase
{
    private readonly TravelPlanDbContext _dbContext;
    private readonly IMapper _mapper;

    public ShareTokensController(TravelPlanDbContext dbContext, IMapper mapper)
    {
        _dbContext = dbContext;
        _mapper = mapper;
    }

    private long GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        return long.TryParse(userIdClaim, out var userId) ? userId : 0;
    }

    private async Task<bool> OwnsPlan(long planId)
    {
        var userId = GetCurrentUserId();
        return await _dbContext.TravelPlans.AnyAsync(tp => tp.Id == planId && tp.UserId == userId);
    }

    [HttpPost]
    public async Task<ActionResult<ShareTokenResponseDto>> Create(long planId, [FromBody] ShareTokenRequestDto dto)
    {
        if (!await OwnsPlan(planId)) return NotFound();

        var token = new ShareToken
        {
            TravelPlanId = planId,
            Token = Guid.NewGuid().ToString("N"),
            AccessType = Enum.Parse<ShareAccessType>(dto.AccessType, true),
            ExpiresAt = dto.ExpiresAt
        };

        _dbContext.ShareTokens.Add(token);
        await _dbContext.SaveChangesAsync();

        return Ok(_mapper.Map<ShareTokenResponseDto>(token));
    }

    [HttpGet]
    public async Task<ActionResult<List<ShareTokenResponseDto>>> GetAll(long planId)
    {
        if (!await OwnsPlan(planId)) return NotFound();

        var tokens = await _dbContext.ShareTokens
            .AsNoTracking()
            .Where(st => st.TravelPlanId == planId)
            .OrderByDescending(st => st.CreatedAt)
            .ToListAsync();

        return Ok(_mapper.Map<List<ShareTokenResponseDto>>(tokens));
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long planId, long id)
    {
        if (!await OwnsPlan(planId)) return NotFound();

        var token = await _dbContext.ShareTokens
            .FirstOrDefaultAsync(st => st.Id == id && st.TravelPlanId == planId);

        if (token == null) return NotFound();

        _dbContext.ShareTokens.Remove(token);
        await _dbContext.SaveChangesAsync();

        return NoContent();
    }
}

[ApiController]
[Route("shared/{token}")]
[AllowAnonymous]
public class SharedPlansController : ControllerBase
{
    private readonly TravelPlanDbContext _dbContext;
    private readonly IMapper _mapper;

    public SharedPlansController(TravelPlanDbContext dbContext, IMapper mapper)
    {
        _dbContext = dbContext;
        _mapper = mapper;
    }

    [HttpGet]
    public async Task<ActionResult<TravelPlanResponseDto>> GetSharedPlan(string token)
    {
        var shareToken = await _dbContext.ShareTokens
            .AsNoTracking()
            .Include(st => st.TravelPlan)
            .ThenInclude(tp => tp!.Destinations)
            .Include(st => st.TravelPlan)
            .ThenInclude(tp => tp!.Activities)
            .Include(st => st.TravelPlan)
            .ThenInclude(tp => tp!.Expenses)
            .Include(st => st.TravelPlan)
            .ThenInclude(tp => tp!.ChecklistItems)
            .FirstOrDefaultAsync(st => st.Token == token);

        if (shareToken == null || (shareToken.ExpiresAt.HasValue && shareToken.ExpiresAt.Value < DateTime.UtcNow))
        {
            return NotFound(new { message = "Invalid or expired share token." });
        }

        var dto = _mapper.Map<TravelPlanResponseDto>(shareToken.TravelPlan);
        dto.TotalExpenses = shareToken.TravelPlan!.Expenses.Sum(e => e.Amount);
        dto.RemainingBudget = shareToken.TravelPlan.Budget - dto.TotalExpenses;
        return Ok(dto);
    }

    [HttpGet("access")]
    public async Task<ActionResult<SharedPlanAccessDto>> GetAccess(string token)
    {
        var shareToken = await _dbContext.ShareTokens
            .AsNoTracking()
            .FirstOrDefaultAsync(st => st.Token == token);

        if (shareToken == null || (shareToken.ExpiresAt.HasValue && shareToken.ExpiresAt.Value < DateTime.UtcNow))
        {
            return NotFound(new { message = "Invalid or expired share token." });
        }

        return Ok(new SharedPlanAccessDto { AccessType = shareToken.AccessType.ToString() });
    }
}
