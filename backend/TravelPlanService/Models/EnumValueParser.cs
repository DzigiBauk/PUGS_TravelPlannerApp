using TravelPlanService.Models.Entities;

namespace TravelPlanService.Models;

public static class EnumValueParser
{
    public static bool TryParseActivityStatus(string? value, out ActivityStatus status)
    {
        switch (value?.Trim().ToLowerInvariant())
        {
            case "planned":
            case "planirano":
                status = ActivityStatus.Planned;
                return true;
            case "reserved":
            case "rezervisano":
                status = ActivityStatus.Reserved;
                return true;
            case "completed":
            case "zavrseno":
            case "zavr\u0161eno":
            case "zavr\u00e5\u00a1eno":
                status = ActivityStatus.Completed;
                return true;
            case "cancelled":
            case "canceled":
            case "otkazano":
                status = ActivityStatus.Cancelled;
                return true;
            default:
                status = default;
                return false;
        }
    }

    public static ActivityStatus ParseActivityStatus(string value)
    {
        return TryParseActivityStatus(value, out var status)
            ? status
            : throw new ArgumentException("Unsupported activity status.", nameof(value));
    }

    public static bool TryParseExpenseCategory(string? value, out ExpenseCategory category)
    {
        switch (value?.Trim().ToLowerInvariant())
        {
            case "transport":
            case "prevoz":
                category = ExpenseCategory.Transport;
                return true;
            case "accommodation":
            case "smjestaj":
            case "smje\u0161taj":
            case "smje\u00e5\u00a1taj":
                category = ExpenseCategory.Accommodation;
                return true;
            case "food":
            case "hrana":
                category = ExpenseCategory.Food;
                return true;
            case "tickets":
            case "ulaznice":
                category = ExpenseCategory.Tickets;
                return true;
            case "shopping":
            case "kupovina":
                category = ExpenseCategory.Shopping;
                return true;
            case "other":
            case "ostalo":
                category = ExpenseCategory.Other;
                return true;
            default:
                category = default;
                return false;
        }
    }

    public static ExpenseCategory ParseExpenseCategory(string value)
    {
        return TryParseExpenseCategory(value, out var category)
            ? category
            : throw new ArgumentException("Unsupported expense category.", nameof(value));
    }
}
