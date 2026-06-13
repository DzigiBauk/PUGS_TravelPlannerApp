using FluentValidation;
using TravelPlanService.Models;
using TravelPlanService.Models.Dtos;

namespace TravelPlanService.Validators;

public class ExpenseRequestValidator : AbstractValidator<ExpenseRequestDto>
{
    public ExpenseRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Name is required.")
            .MaximumLength(200).WithMessage("Name must not exceed 200 characters.");

        RuleFor(x => x.Category)
            .Must(category => EnumValueParser.TryParseExpenseCategory(category, out _))
            .WithMessage("Category must be one of: Transport, Accommodation, Food, Tickets, Shopping, Other.");

        RuleFor(x => x.Amount)
            .GreaterThanOrEqualTo(0).WithMessage("Amount cannot be negative.");

        RuleFor(x => x.Date)
            .NotEmpty().WithMessage("Date is required.");
    }
}
