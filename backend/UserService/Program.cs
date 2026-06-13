using System.Fabric;
using Microsoft.ServiceFabric.Services.Runtime;

namespace UserService;

internal class Program
{
    private static void Main(string[] args)
    {
        try
        {
            ServiceRuntime.RegisterServiceAsync("UserServiceType",
                context => new UserService(context)).GetAwaiter().GetResult();

            ServiceEventSource.Current.Message("Service Type UserServiceType registered.");
            Thread.Sleep(Timeout.Infinite);
        }
        catch (Exception e)
        {
            ServiceEventSource.Current.Message($"Exception during service registration: {e}");
            throw;
        }
    }
}
