using Microsoft.ServiceFabric.Services.Communication.AspNetCore;
using Microsoft.ServiceFabric.Services.Communication.Runtime;
using Microsoft.ServiceFabric.Services.Runtime;
using Microsoft.EntityFrameworkCore;
using System.Fabric;
using System.Net;
using RouteService.Data;
using RouteService.Services;
using TravelPlanner.Common.Auth;

namespace RouteService;

internal sealed class RouteService : StatefulService
{
    public RouteService(StatefulServiceContext context)
        : base(context)
    {
    }

    protected override IEnumerable<ServiceReplicaListener> CreateServiceReplicaListeners()
    {
        return
        [
            new ServiceReplicaListener(serviceContext =>
                new KestrelCommunicationListener(serviceContext, "ServiceEndpoint", (url, listener) =>
                {
                    ServiceEventSource.Current.ServiceMessage(serviceContext, $"Starting Kestrel on {url}");

                    var builder = WebApplication.CreateBuilder();

                    builder.WebHost.ConfigureKestrel(options =>
                    {
                        var endpoint = serviceContext.CodePackageActivationContext.GetEndpoint("ServiceEndpoint");
                        options.Listen(new IPEndPoint(IPAddress.Any, endpoint.Port));
                    });

                    var connectionString = builder.Configuration.GetConnectionString("TravelPlanDatabase");
                    if (string.IsNullOrWhiteSpace(connectionString))
                    {
                        throw new InvalidOperationException(
                            "Travel plan database connection is missing. Configure ConnectionStrings__TravelPlanDatabase.");
                    }

                    var internalApiKey = builder.Configuration["InternalApi:Key"];
                    if (string.IsNullOrWhiteSpace(internalApiKey) || internalApiKey.Length < 32)
                    {
                        throw new InvalidOperationException(
                            "RouteService internal API key is missing or shorter than 32 characters. Configure InternalApi__Key.");
                    }

                    builder.Services.AddDbContext<RouteDbContext>(options => options.UseSqlServer(connectionString));
                    builder.Services.AddSingleton(new InternalApiSettings(internalApiKey));
                    builder.Services.Configure<RouteSettings>(builder.Configuration.GetSection("RouteSettings"));
                    builder.Services.AddScoped<IRouteCalculator, RouteCalculator>();
                    builder.Services.AddSingleton(StateManager);
                    builder.Services.AddScoped<IRouteCacheService, ReliableRouteCacheService>();
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

                    app.UseAuthentication();
                    app.UseAuthorization();
                    app.MapControllers();
                    return app;
                }))
        ];
    }

    protected override async Task RunAsync(CancellationToken cancellationToken)
    {
        while (true)
        {
            cancellationToken.ThrowIfCancellationRequested();
            ServiceEventSource.Current.ServiceMessage(Context, "RouteService heartbeat.");
            await Task.Delay(TimeSpan.FromSeconds(30), cancellationToken);
        }
    }
}
