using System.Fabric;
using Microsoft.ServiceFabric.Services.Runtime;

namespace TravelPlanService;

internal class Program
{
    private static void Main(string[] args)
    {
        try
        {
            ServiceRuntime.RegisterServiceAsync("TravelPlanServiceType",
                context => new TravelPlanService(context)).GetAwaiter().GetResult();

            ServiceEventSource.Current.Message("Service Type TravelPlanServiceType registered.");
            Thread.Sleep(Timeout.Infinite);
        }
        catch (Exception e)
        {
            ServiceEventSource.Current.Message($"Exception during service registration: {e}");
            throw;
        }
    }
}
