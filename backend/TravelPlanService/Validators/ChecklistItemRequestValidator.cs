using FluentValidation;
using TravelPlanService.Models.Dtos;

namespace TravelPlanService.Validators;

public class ChecklistItemRequestValidator : AbstractValidator<ChecklistItemRequestDto>
{
    public ChecklistItemRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Name is required.")
            .MaximumLength(200).WithMessage("Name must not exceed 200 characters.");
    }
}
