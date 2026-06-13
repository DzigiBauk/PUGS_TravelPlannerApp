using System.Diagnostics.Tracing;
using System.Fabric;

namespace UserService;

[EventSource(Name = "MyCompany-TravelPlannerApp-UserService")]
internal sealed class ServiceEventSource : EventSource
{
    public static readonly ServiceEventSource Current = new ServiceEventSource();

    [Event(1, Level = EventLevel.Informational, Message = "{0}")]
    public void Message(string message)
    {
        if (this.IsEnabled())
        {
            WriteEvent(1, message);
        }
    }

    [NonEvent]
    public void ServiceMessage(ServiceContext serviceContext, string message, params object[] args)
    {
        if (this.IsEnabled())
        {
            string finalMessage = string.Format(message, args);
            ServiceMessage(
                serviceContext.ServiceName.ToString(),
                serviceContext.ServiceTypeName,
                serviceContext.ReplicaOrInstanceId,
                serviceContext.PartitionId,
                serviceContext.CodePackageActivationContext.ApplicationName,
                serviceContext.CodePackageActivationContext.ApplicationTypeName,
                serviceContext.NodeContext.NodeName,
                finalMessage);
        }
    }

    [Event(2, Level = EventLevel.Informational, Message = "{7}")]
    private void ServiceMessage(
        string serviceName,
        string serviceTypeName,
        long replicaOrInstanceId,
        Guid partitionId,
        string applicationName,
        string applicationTypeName,
        string nodeName,
        string message)
    {
        WriteEvent(2, serviceName, serviceTypeName, replicaOrInstanceId, partitionId, applicationName, applicationTypeName, nodeName, message);
    }
}
