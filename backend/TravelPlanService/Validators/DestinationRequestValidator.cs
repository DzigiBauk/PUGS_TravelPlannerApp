using FluentValidation;
using TravelPlanService.Models.Dtos;

namespace TravelPlanService.Validators;

public class DestinationRequestValidator : AbstractValidator<DestinationRequestDto>
{
    public DestinationRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Name is required.")
            .MaximumLength(200).WithMessage("Name must not exceed 200 characters.");

        RuleFor(x => x.Location)
            .NotEmpty().WithMessage("Location is required.")
            .MaximumLength(300).WithMessage("Location must not exceed 300 characters.");

        RuleFor(x => x.DepartureDate)
            .GreaterThanOrEqualTo(x => x.ArrivalDate).WithMessage("Departure date must be on or after arrival date.");
    }
}
