using System.Diagnostics.Tracing;
using System.Fabric;

namespace TravelPlanService;

[EventSource(Name = "MyCompany-TravelPlannerApp-TravelPlanService")]
internal sealed class ServiceEventSource : EventSource
{
    public static ServiceEventSource Current = new ServiceEventSource();

    [Event(1, Level = EventLevel.Informational, Message = "{0}")]
    public void Message(string message)
    {
        if (IsEnabled())
        {
            WriteEvent(1, message);
        }
    }

    [Event(2, Level = EventLevel.Informational, Message = "ServiceHostInitialization: serviceName={0}")]
    public void ServiceHostInitialization(string serviceName)
    {
        if (IsEnabled())
        {
            WriteEvent(2, serviceName);
        }
    }

    [Event(3, Level = EventLevel.Informational, Message = "ServiceMessage: serviceName={0} message={1}")]
    public void ServiceMessage(ServiceContext serviceContext, string message)
    {
        if (IsEnabled())
        {
            WriteEvent(3, serviceContext.ServiceName.ToString(), message);
        }
    }
}
