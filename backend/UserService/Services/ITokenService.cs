using UserService.Models.Entities;

namespace UserService.Services;

public interface ITokenService
{
    string GenerateToken(User user);
}
