using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace TravelPlanService.Data;

public class TravelPlanDbContextFactory : IDesignTimeDbContextFactory<TravelPlanDbContext>
{
    public TravelPlanDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<TravelPlanDbContext>();
        optionsBuilder.UseSqlServer("Server=(localdb)\\MSSQLLocalDB;Database=TravelPlanDb;Trusted_Connection=True;TrustServerCertificate=True;");
        return new TravelPlanDbContext(optionsBuilder.Options);
    }
}
