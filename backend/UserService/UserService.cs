using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.ServiceFabric.Services.Communication.AspNetCore;
using Microsoft.ServiceFabric.Services.Communication.Runtime;
using Microsoft.ServiceFabric.Services.Runtime;
using System.Fabric;
using System.Net;
using TravelPlanner.Common.Auth;
using UserService.Data;
using UserService.Mapping;
using UserService.Services;
using UserService.Validators;

namespace UserService;

internal sealed class UserService : StatelessService
{
    public UserService(StatelessServiceContext context)
        : base(context)
    { }

    protected override IEnumerable<ServiceInstanceListener> CreateServiceInstanceListeners()
    {
        return new ServiceInstanceListener[]
        {
            new ServiceInstanceListener(serviceContext =>
                new KestrelCommunicationListener(serviceContext, "ServiceEndpoint", (url, listener) =>
                {
                    ServiceEventSource.Current.ServiceMessage(serviceContext, $"Starting Kestrel on {url}");

                    var builder = WebApplication.CreateBuilder();

                    builder.WebHost.ConfigureKestrel(options =>
                    {
                        var endpoint = serviceContext.CodePackageActivationContext.GetEndpoint("ServiceEndpoint");
                        options.Listen(new IPEndPoint(IPAddress.Any, endpoint.Port));
                    });

                    builder.Services.AddControllers();
                    builder.Services.AddEndpointsApiExplorer();
                    builder.Services.AddSwaggerGen();

                    // JWT Authentication
                    builder.Services.AddJwtAuthentication(builder.Configuration);

                    // EF Core
                    builder.Services.AddDbContext<UserDbContext>(options =>
                        options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

                    // AutoMapper
                    builder.Services.AddAutoMapper(cfg => cfg.AddProfile<UserProfile>());

                    // FluentValidation
                    builder.Services.AddValidatorsFromAssemblyContaining<RegisterRequestValidator>();
                    builder.Services.AddFluentValidationAutoValidation();

                    // Application Services
                    builder.Services.AddScoped<IAuthService, AuthService>();
                    builder.Services.AddScoped<ITokenService, TokenService>();
                    builder.Services.AddScoped<AdminBootstrapService>();

                    var travelPlanServiceUrl = builder.Configuration["TravelPlanService:BaseUrl"];
                    var travelPlanServiceInternalApiKey = builder.Configuration["TravelPlanService:InternalApiKey"];
                    if (!Uri.TryCreate(travelPlanServiceUrl, UriKind.Absolute, out var travelPlanServiceBaseUri))
                    {
                        throw new InvalidOperationException(
                            "TravelPlanService URL is missing or invalid. Configure TravelPlanService__BaseUrl.");
                    }
                    if (string.IsNullOrWhiteSpace(travelPlanServiceInternalApiKey)
                        || travelPlanServiceInternalApiKey.Length < 32)
                    {
                        throw new InvalidOperationException(
                            "TravelPlanService internal API key is missing or shorter than 32 characters.");
                    }

                    builder.Services.AddHttpClient<ITravelPlanAdministrationClient, TravelPlanAdministrationClient>(client =>
                    {
                        client.BaseAddress = travelPlanServiceBaseUri;
                        client.Timeout = TimeSpan.FromSeconds(10);
                        client.DefaultRequestHeaders.Add(
                            "X-Travel-Plan-Service-Key",
                            travelPlanServiceInternalApiKey);
                    });

                    var app = builder.Build();

                    using (var scope = app.Services.CreateScope())
                    {
                        scope.ServiceProvider.GetRequiredService<AdminBootstrapService>()
                            .EnsureAdminAsync()
                            .GetAwaiter()
                            .GetResult();
                    }

                    if (app.Environment.IsDevelopment())
                    {
                        app.UseSwagger();
                        app.UseSwaggerUI();
                    }

                    app.UseAuthentication();
                    app.UseAuthorization();
                    app.MapControllers();

                    return app;
                }))
        };
    }
}
