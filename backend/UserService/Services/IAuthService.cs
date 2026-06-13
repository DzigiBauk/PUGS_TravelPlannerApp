using UserService.Models.Dtos;

namespace UserService.Services;

public interface IAuthService
{
    Task<AuthResponseDto> RegisterAsync(RegisterRequestDto dto);
    Task<AuthResponseDto> LoginAsync(LoginRequestDto dto);
    Task<IEnumerable<UserDto>> GetAllUsersAsync();
    Task<UserDto?> GetUserByIdAsync(int id);
    Task<UserDto?> UpdateUserAsync(int id, UpdateUserRequestDto dto);
    Task<UserDto?> UpdateUserRoleAsync(int id, UpdateUserRoleRequestDto dto);
    Task<bool> DeleteUserAsync(int id);
}
