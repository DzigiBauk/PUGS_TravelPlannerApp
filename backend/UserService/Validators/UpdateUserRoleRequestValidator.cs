using FluentValidation;
using UserService.Models.Dtos;

namespace UserService.Validators;

public class UpdateUserRoleRequestValidator : AbstractValidator<UpdateUserRoleRequestDto>
{
    public UpdateUserRoleRequestValidator()
    {
        RuleFor(x => x.Role)
            .Must(role => string.Equals(role, "User", StringComparison.OrdinalIgnoreCase)
                || string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase))
            .WithMessage("Role must be User or Admin.");
    }
}
