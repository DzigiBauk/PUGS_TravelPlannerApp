using AutoMapper;
using Microsoft.EntityFrameworkCore;
using UserService.Data;
using UserService.Models.Dtos;
using UserService.Models.Entities;

namespace UserService.Services;

public class AuthService : IAuthService
{
    private readonly UserDbContext _context;
    private readonly ITokenService _tokenService;
    private readonly IMapper _mapper;
    private readonly ITravelPlanAdministrationClient _travelPlanAdministrationClient;
    private readonly IWebHostEnvironment _environment;

    public AuthService(
        UserDbContext context,
        ITokenService tokenService,
        IMapper mapper,
        ITravelPlanAdministrationClient travelPlanAdministrationClient,
        IWebHostEnvironment environment)
    {
        _context = context;
        _tokenService = tokenService;
        _mapper = mapper;
        _travelPlanAdministrationClient = travelPlanAdministrationClient;
        _environment = environment;
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterRequestDto dto)
    {
        if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
        {
            throw new InvalidOperationException("User with this email already exists.");
        }

        var user = _mapper.Map<User>(dto);
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);
        var requestedRole = dto.Role.Equals("Admin", StringComparison.OrdinalIgnoreCase)
            ? "Admin"
            : "User";
        if (requestedRole == "Admin" && !_environment.IsDevelopment())
        {
            throw new InvalidOperationException("Admin self-registration is available only in Development.");
        }
        user.Role = requestedRole;

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var token = _tokenService.GenerateToken(user);
        return new AuthResponseDto
        {
            Token = token,
            User = _mapper.Map<UserDto>(user)
        };
    }

    public async Task<AuthResponseDto> LoginAsync(LoginRequestDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
        if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
        {
            throw new InvalidOperationException("Invalid email or password.");
        }

        var token = _tokenService.GenerateToken(user);
        return new AuthResponseDto
        {
            Token = token,
            User = _mapper.Map<UserDto>(user)
        };
    }

    public async Task<IEnumerable<UserDto>> GetAllUsersAsync()
    {
        var users = await _context.Users.OrderBy(user => user.Name).ThenBy(user => user.Id).ToListAsync();
        return _mapper.Map<IEnumerable<UserDto>>(users);
    }

    public async Task<UserDto?> GetUserByIdAsync(int id)
    {
        var user = await _context.Users.FindAsync(id);
        return user == null ? null : _mapper.Map<UserDto>(user);
    }

    public async Task<UserDto?> UpdateUserAsync(int id, UpdateUserRequestDto dto)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return null;

        if (await _context.Users.AnyAsync(u => u.Email == dto.Email && u.Id != id))
        {
            throw new InvalidOperationException("Email is already in use.");
        }

        user.Name = dto.Name;
        user.Email = dto.Email;

        await _context.SaveChangesAsync();
        return _mapper.Map<UserDto>(user);
    }

    public async Task<UserDto?> UpdateUserRoleAsync(int id, UpdateUserRoleRequestDto dto)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return null;

        var normalizedRole = dto.Role.Equals("Admin", StringComparison.OrdinalIgnoreCase)
            ? "Admin"
            : "User";

        if (user.Role == "Admin" && normalizedRole == "User")
        {
            var adminCount = await _context.Users.CountAsync(candidate => candidate.Role == "Admin");
            if (adminCount <= 1)
            {
                throw new InvalidOperationException("The last administrator cannot be demoted.");
            }
        }

        user.Role = normalizedRole;
        await _context.SaveChangesAsync();
        return _mapper.Map<UserDto>(user);
    }

    public async Task<bool> DeleteUserAsync(int id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return false;

        if (user.Role == "Admin")
        {
            var adminCount = await _context.Users.CountAsync(candidate => candidate.Role == "Admin");
            if (adminCount <= 1)
            {
                throw new InvalidOperationException("The last administrator cannot be deleted.");
            }
        }

        await _travelPlanAdministrationClient.DeleteUserTravelPlansAsync(id);

        _context.Users.Remove(user);
        await _context.SaveChangesAsync();
        return true;
    }
}
