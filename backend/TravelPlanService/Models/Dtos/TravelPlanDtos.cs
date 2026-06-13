namespace TravelPlanService.Models.Dtos;

public class TravelPlanRequestDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public decimal Budget { get; set; }
    public string? Notes { get; set; }
}

public class TravelPlanResponseDto
{
    public long Id { get; set; }
    public long UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public decimal Budget { get; set; }
    public decimal TotalExpenses { get; set; }
    public decimal RemainingBudget { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<DestinationResponseDto> Destinations { get; set; } = new();
    public List<ActivityResponseDto> Activities { get; set; } = new();
    public List<ExpenseResponseDto> Expenses { get; set; } = new();
    public List<ChecklistItemResponseDto> ChecklistItems { get; set; } = new();
}

public class DestinationRequestDto
{
    public string Name { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public DateTime ArrivalDate { get; set; }
    public DateTime DepartureDate { get; set; }
    public string? Description { get; set; }
}

public class DestinationResponseDto
{
    public long Id { get; set; }
    public long TravelPlanId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public DateTime ArrivalDate { get; set; }
    public DateTime DepartureDate { get; set; }
    public string? Description { get; set; }
}

public class ActivityRequestDto
{
    public long? DestinationId { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public TimeSpan? Time { get; set; }
    public string? Location { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? Description { get; set; }
    public decimal? EstimatedCost { get; set; }
    public string Status { get; set; } = "Planned";
}

public class ActivityResponseDto
{
    public long Id { get; set; }
    public long TravelPlanId { get; set; }
    public long? DestinationId { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public TimeSpan Time { get; set; }
    public string? Location { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? Description { get; set; }
    public decimal? EstimatedCost { get; set; }
    public string Status { get; set; } = string.Empty;
}

public class ExpenseRequestDto
{
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = "Other";
    public decimal Amount { get; set; }
    public DateTime Date { get; set; }
    public string? Description { get; set; }
}

public class ExpenseResponseDto
{
    public long Id { get; set; }
    public long TravelPlanId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateTime Date { get; set; }
    public string? Description { get; set; }
}

public class ChecklistItemRequestDto
{
    public string Name { get; set; } = string.Empty;
    public bool IsCompleted { get; set; }
}

public class ChecklistItemResponseDto
{
    public long Id { get; set; }
    public long TravelPlanId { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsCompleted { get; set; }
}

public class ShareTokenRequestDto
{
    public string AccessType { get; set; } = "VIEW";
    public DateTime? ExpiresAt { get; set; }
}

public class ShareTokenResponseDto
{
    public long Id { get; set; }
    public long TravelPlanId { get; set; }
    public string Token { get; set; } = string.Empty;
    public string AccessType { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
}

public class AdminTravelPlanResponseDto
{
    public long Id { get; set; }
    public long UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public decimal Budget { get; set; }
    public decimal TotalExpenses { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class SharedPlanAccessDto
{
    public string AccessType { get; set; } = string.Empty;
}

public class BudgetResponseDto
{
    public long TravelPlanId { get; set; }
    public decimal Budget { get; set; }
    public decimal TotalExpenses { get; set; }
    public decimal RemainingBudget { get; set; }
}
