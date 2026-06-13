using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelPlanService.Data;
using TravelPlanService.Models.Dtos;
using TravelPlanService.Models.Entities;

namespace TravelPlanService.Controllers;

[ApiController]
[Route("travel-plans/{planId:long}/checklist")]
[Authorize]
public class ChecklistController : ControllerBase
{
    private readonly TravelPlanDbContext _dbContext;
    private readonly IMapper _mapper;

    public ChecklistController(TravelPlanDbContext dbContext, IMapper mapper)
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

    [HttpGet]
    public async Task<ActionResult<List<ChecklistItemResponseDto>>> GetAll(long planId)
    {
        if (!await OwnsPlan(planId)) return NotFound();

        var items = await _dbContext.ChecklistItems
            .AsNoTracking()
            .Where(c => c.TravelPlanId == planId)
            .OrderBy(c => c.Id)
            .ToListAsync();

        return Ok(_mapper.Map<List<ChecklistItemResponseDto>>(items));
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<ChecklistItemResponseDto>> GetById(long planId, long id)
    {
        if (!await OwnsPlan(planId)) return NotFound();

        var item = await _dbContext.ChecklistItems
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id && c.TravelPlanId == planId);

        if (item == null) return NotFound();
        return Ok(_mapper.Map<ChecklistItemResponseDto>(item));
    }

    [HttpPost]
    public async Task<ActionResult<ChecklistItemResponseDto>> Create(long planId, [FromBody] ChecklistItemRequestDto dto)
    {
        if (!await OwnsPlan(planId)) return NotFound();

        var item = _mapper.Map<ChecklistItem>(dto);
        item.TravelPlanId = planId;

        _dbContext.ChecklistItems.Add(item);
        await _dbContext.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { planId, id = item.Id }, _mapper.Map<ChecklistItemResponseDto>(item));
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long planId, long id, [FromBody] ChecklistItemRequestDto dto)
    {
        if (!await OwnsPlan(planId)) return NotFound();

        var item = await _dbContext.ChecklistItems
            .FirstOrDefaultAsync(c => c.Id == id && c.TravelPlanId == planId);

        if (item == null) return NotFound();

        _mapper.Map(dto, item);
        await _dbContext.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long planId, long id)
    {
        if (!await OwnsPlan(planId)) return NotFound();

        var item = await _dbContext.ChecklistItems
            .FirstOrDefaultAsync(c => c.Id == id && c.TravelPlanId == planId);

        if (item == null) return NotFound();

        _dbContext.ChecklistItems.Remove(item);
        await _dbContext.SaveChangesAsync();

        return NoContent();
    }
}
