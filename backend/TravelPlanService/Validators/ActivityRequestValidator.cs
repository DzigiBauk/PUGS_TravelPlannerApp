using FluentValidation;
using TravelPlanService.Models;
using TravelPlanService.Models.Dtos;

namespace TravelPlanService.Validators;

public class ActivityRequestValidator : AbstractValidator<ActivityRequestDto>
{
    public ActivityRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Name is required.")
            .MaximumLength(200).WithMessage("Name must not exceed 200 characters.");

        RuleFor(x => x.Date)
            .NotEmpty().WithMessage("Date is required.");

        RuleFor(x => x.Time)
            .NotNull().WithMessage("Time is required.");

        RuleFor(x => x.Status)
            .Must(status => EnumValueParser.TryParseActivityStatus(status, out _))
            .WithMessage("Status must be one of: Planned, Reserved, Completed, Cancelled.");

        RuleFor(x => x.EstimatedCost)
            .GreaterThanOrEqualTo(0).When(x => x.EstimatedCost.HasValue)
            .WithMessage("Estimated cost cannot be negative.");

        RuleFor(x => x.Latitude)
            .InclusiveBetween(-90, 90).When(x => x.Latitude.HasValue)
            .WithMessage("Latitude must be between -90 and 90.");

        RuleFor(x => x.Longitude)
            .InclusiveBetween(-180, 180).When(x => x.Longitude.HasValue)
            .WithMessage("Longitude must be between -180 and 180.");

        RuleFor(x => x)
            .Must(x => x.Latitude.HasValue == x.Longitude.HasValue)
            .WithMessage("Latitude and longitude must be provided together.");

    }
}
