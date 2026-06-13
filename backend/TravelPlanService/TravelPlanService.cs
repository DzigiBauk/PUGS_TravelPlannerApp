using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.ServiceFabric.Services.Communication.AspNetCore;
using Microsoft.ServiceFabric.Services.Communication.Runtime;
using Microsoft.ServiceFabric.Services.Runtime;
using System.Fabric;
using System.Net;
using TravelPlanner.Common.Auth;
using TravelPlanService.Data;
using TravelPlanService.Mapping;
using TravelPlanService.Middleware;
using TravelPlanService.Services;
using TravelPlanService.Validators;

namespace TravelPlanService;

internal sealed class TravelPlanService : StatelessService
{
    public TravelPlanService(StatelessServiceContext context)
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

                    builder.Services.AddSingleton<ITravelPlanCacheService, InMemoryTravelPlanCacheService>();
                    builder.Services.AddScoped<ITravelPlanDeletionService, TravelPlanDeletionService>();
                    builder.Services.AddScoped<ITravelPlanBudgetService, TravelPlanBudgetService>();

                    var internalApiKey = builder.Configuration["InternalApi:Key"];
                    if (string.IsNullOrWhiteSpace(internalApiKey) || internalApiKey.Length < 32)
                    {
                        throw new InvalidOperationException(
                            "TravelPlanService internal API key is missing or shorter than 32 characters.");
                    }
                    builder.Services.AddSingleton(new InternalApiSettings(internalApiKey));

                    var routeServiceUrl = builder.Configuration["RouteService:BaseUrl"];
                    var routeServiceInternalApiKey = builder.Configuration["RouteService:InternalApiKey"];
                    if (!Uri.TryCreate(routeServiceUrl, UriKind.Absolute, out var routeServiceBaseUri))
                    {
                        throw new InvalidOperationException(
                            "RouteService URL is missing or invalid. Configure RouteService__BaseUrl.");
                    }
                    if (string.IsNullOrWhiteSpace(routeServiceInternalApiKey) || routeServiceInternalApiKey.Length < 32)
                    {
                        throw new InvalidOperationException(
                            "RouteService internal API key is missing or shorter than 32 characters. Configure RouteService__InternalApiKey.");
                    }

                    builder.Services.AddHttpClient<IRouteInvalidationService, RouteInvalidationService>(client =>
                    {
                        client.BaseAddress = routeServiceBaseUri;
                        client.Timeout = TimeSpan.FromSeconds(4);
                        client.DefaultRequestHeaders.Add("X-Route-Service-Key", routeServiceInternalApiKey);
                    });

                    builder.Services.AddDbContext<TravelPlanDbContext>(options =>
                        options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

                    builder.Services.AddAutoMapper(cfg => cfg.AddProfile<TravelPlanProfile>());

                    builder.Services.AddValidatorsFromAssemblyContaining<TravelPlanRequestValidator>();
                    builder.Services.AddFluentValidationAutoValidation();

                    builder.Services.AddJwtAuthentication(builder.Configuration);

                    builder.Services.AddControllers();
                    builder.Services.AddEndpointsApiExplorer();
                    builder.Services.AddSwaggerGen();

                    var app = builder.Build();

                    if (app.Environment.IsDevelopment())
                    {
                        app.UseSwagger();
                        app.UseSwaggerUI();
                    }

                    app.UseMiddleware<ExceptionHandlingMiddleware>();
                    app.UseAuthentication();
                    app.UseAuthorization();
                    app.MapControllers();

                    return app;
                }))
        };
    }

    protected override async Task RunAsync(CancellationToken cancellationToken)
    {
        while (true)
        {
            cancellationToken.ThrowIfCancellationRequested();
            ServiceEventSource.Current.ServiceMessage(this.Context, "TravelPlanService heartbeat.");
            await Task.Delay(TimeSpan.FromSeconds(30), cancellationToken);
        }
    }
}
