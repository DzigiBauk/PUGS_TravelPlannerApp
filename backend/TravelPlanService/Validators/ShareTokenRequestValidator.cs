using FluentValidation;
using TravelPlanService.Models.Dtos;

namespace TravelPlanService.Validators;

public class ShareTokenRequestValidator : AbstractValidator<ShareTokenRequestDto>
{
    public ShareTokenRequestValidator()
    {
        RuleFor(x => x.AccessType)
            .Must(accessType => new[] { "VIEW", "EDIT" }
                .Contains(accessType, StringComparer.OrdinalIgnoreCase))
            .WithMessage("Access type must be VIEW or EDIT.");

        RuleFor(x => x.ExpiresAt)
            .GreaterThan(DateTime.UtcNow).When(x => x.ExpiresAt.HasValue)
            .WithMessage("Expiration date must be in the future.");
    }
}
