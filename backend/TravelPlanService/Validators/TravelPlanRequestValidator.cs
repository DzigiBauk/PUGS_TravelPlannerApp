using FluentValidation;
using TravelPlanService.Models.Dtos;

namespace TravelPlanService.Validators;

public class TravelPlanRequestValidator : AbstractValidator<TravelPlanRequestDto>
{
    public TravelPlanRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Name is required.")
            .MaximumLength(200).WithMessage("Name must not exceed 200 characters.");

        RuleFor(x => x.StartDate)
            .NotEmpty().WithMessage("Start date is required.");

        RuleFor(x => x.EndDate)
            .NotEmpty().WithMessage("End date is required.")
            .GreaterThanOrEqualTo(x => x.StartDate).WithMessage("End date must be on or after the start date.");

        RuleFor(x => x.Budget)
            .GreaterThanOrEqualTo(0).WithMessage("Budget cannot be negative.");
    }
}
