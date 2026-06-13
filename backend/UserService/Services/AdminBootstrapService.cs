using Microsoft.EntityFrameworkCore;
using UserService.Data;
using UserService.Models.Entities;

namespace UserService.Services;

public sealed class AdminBootstrapService
{
    private readonly UserDbContext _dbContext;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AdminBootstrapService> _logger;

    public AdminBootstrapService(
        UserDbContext dbContext,
        IConfiguration configuration,
        ILogger<AdminBootstrapService> logger)
    {
        _dbContext = dbContext;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task EnsureAdminAsync(CancellationToken cancellationToken = default)
    {
        var email = _configuration["AdminBootstrap:Email"]?.Trim();
        var password = _configuration["AdminBootstrap:Password"];
        var name = _configuration["AdminBootstrap:Name"]?.Trim();

        if (string.IsNullOrWhiteSpace(email) && string.IsNullOrWhiteSpace(password))
        {
            _logger.LogWarning("Admin bootstrap is not configured. No initial admin account will be created.");
            return;
        }

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            throw new InvalidOperationException(
                "Admin bootstrap requires both AdminBootstrap__Email and AdminBootstrap__Password.");
        }

        if (password.Length < 12)
        {
            throw new InvalidOperationException("Admin bootstrap password must contain at least 12 characters.");
        }

        var existingUser = await _dbContext.Users
            .FirstOrDefaultAsync(user => user.Email == email, cancellationToken);

        if (existingUser != null)
        {
            var changed = false;
            if (!existingUser.Role.Equals("Admin", StringComparison.OrdinalIgnoreCase))
            {
                existingUser.Role = "Admin";
                changed = true;
            }

            if (!BCrypt.Net.BCrypt.Verify(password, existingUser.PasswordHash))
            {
                existingUser.PasswordHash = BCrypt.Net.BCrypt.HashPassword(password);
                changed = true;
            }

            if (changed)
            {
                await _dbContext.SaveChangesAsync(cancellationToken);
                _logger.LogInformation("Synchronized the configured bootstrap admin account {Email}.", email);
            }

            return;
        }

        _dbContext.Users.Add(new User
        {
            Name = string.IsNullOrWhiteSpace(name) ? "Administrator" : name,
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            Role = "Admin",
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _dbContext.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Created the configured bootstrap admin account {Email}.", email);
    }
}
