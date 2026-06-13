namespace TravelPlanService.Models.Entities;

public class Expense
{
    public long Id { get; set; }
    public long TravelPlanId { get; set; }
    public string Name { get; set; } = string.Empty;
    public ExpenseCategory Category { get; set; } = ExpenseCategory.Other;
    public decimal Amount { get; set; }
    public DateTime Date { get; set; }
    public string? Description { get; set; }

    public TravelPlan TravelPlan { get; set; } = null!;
}

public enum ExpenseCategory
{
    Transport = 0,
    Accommodation = 1,
    Food = 2,
    Tickets = 3,
    Shopping = 4,
    Other = 5
}
