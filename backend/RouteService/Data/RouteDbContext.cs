using Microsoft.EntityFrameworkCore;
using RouteService.Models;

namespace RouteService.Data;

public sealed class RouteDbContext : DbContext
{
    public RouteDbContext(DbContextOptions<RouteDbContext> options)
        : base(options)
    {
    }

    public DbSet<TravelPlanRecord> TravelPlans => Set<TravelPlanRecord>();
    public DbSet<ActivityRecord> Activities => Set<ActivityRecord>();
    public DbSet<ShareTokenRecord> ShareTokens => Set<ShareTokenRecord>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<TravelPlanRecord>(entity =>
        {
            entity.ToTable("TravelPlans");
            entity.HasKey(plan => plan.Id);
        });

        modelBuilder.Entity<ActivityRecord>(entity =>
        {
            entity.ToTable("Activities");
            entity.HasKey(activity => activity.Id);
        });

        modelBuilder.Entity<ShareTokenRecord>(entity =>
        {
            entity.ToTable("ShareTokens");
            entity.HasKey(shareToken => shareToken.Id);
        });
    }
}
