using Microsoft.ServiceFabric.Services.Runtime;

namespace RouteService;

internal static class Program
{
    private static void Main()
    {
        try
        {
            ServiceRuntime.RegisterServiceAsync(
                "RouteServiceType",
                context => new RouteService(context)).GetAwaiter().GetResult();

            ServiceEventSource.Current.Message("Service Type RouteServiceType registered.");
            Thread.Sleep(Timeout.Infinite);
        }
        catch (Exception exception)
        {
            ServiceEventSource.Current.Message($"Exception during service registration: {exception}");
            throw;
        }
    }
}
