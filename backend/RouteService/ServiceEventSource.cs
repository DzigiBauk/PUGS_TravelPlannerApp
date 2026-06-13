using System.Diagnostics.Tracing;
using System.Fabric;

namespace RouteService;

[EventSource(Name = "MyCompany-TravelPlannerApp-RouteService")]
internal sealed class ServiceEventSource : EventSource
{
    public static ServiceEventSource Current { get; } = new();

    [Event(1, Level = EventLevel.Informational, Message = "{0}")]
    public void Message(string message)
    {
        if (IsEnabled())
        {
            WriteEvent(1, message);
        }
    }

    [NonEvent]
    public void ServiceMessage(ServiceContext serviceContext, string message)
    {
        if (IsEnabled())
        {
            WriteServiceMessage(
                serviceContext.ServiceName.ToString(),
                serviceContext.ServiceTypeName,
                serviceContext.ReplicaOrInstanceId,
                serviceContext.PartitionId,
                message);
        }
    }

    [Event(2, Level = EventLevel.Informational, Message = "{4}")]
    private void WriteServiceMessage(
        string serviceName,
        string serviceTypeName,
        long replicaId,
        Guid partitionId,
        string message)
    {
        WriteEvent(2, serviceName, serviceTypeName, replicaId, partitionId, message);
    }
}
