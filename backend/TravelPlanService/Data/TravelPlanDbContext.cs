using Microsoft.EntityFrameworkCore;
using TravelPlanService.Models.Entities;

namespace TravelPlanService.Data;

public class TravelPlanDbContext : DbContext
{
    public TravelPlanDbContext(DbContextOptions<TravelPlanDbContext> options)
        : base(options)
    { }

    public DbSet<TravelPlan> TravelPlans => Set<TravelPlan>();
    public DbSet<Destination> Destinations => Set<Destination>();
    public DbSet<Activity> Activities => Set<Activity>();
    public DbSet<Expense> Expenses => Set<Expense>();
    public DbSet<ChecklistItem> ChecklistItems => Set<ChecklistItem>();
    public DbSet<ShareToken> ShareTokens => Set<ShareToken>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<TravelPlan>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Budget).HasPrecision(18, 2);
            entity.HasIndex(e => e.UserId);
        });

        modelBuilder.Entity<Destination>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Location).HasMaxLength(300).IsRequired();
            entity.HasOne(e => e.TravelPlan)
                  .WithMany(tp => tp.Destinations)
                  .HasForeignKey(e => e.TravelPlanId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Activity>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(200).IsRequired();
            entity.Property(e => e.EstimatedCost).HasPrecision(18, 2);
            entity.HasOne(e => e.TravelPlan)
                  .WithMany(tp => tp.Activities)
                  .HasForeignKey(e => e.TravelPlanId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Destination)
                  .WithMany(d => d.Activities)
                  .HasForeignKey(e => e.DestinationId)
                  .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<Expense>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Amount).HasPrecision(18, 2);
            entity.HasOne(e => e.TravelPlan)
                  .WithMany(tp => tp.Expenses)
                  .HasForeignKey(e => e.TravelPlanId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ChecklistItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(200).IsRequired();
            entity.HasOne(e => e.TravelPlan)
                  .WithMany(tp => tp.ChecklistItems)
                  .HasForeignKey(e => e.TravelPlanId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ShareToken>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Token).HasMaxLength(200).IsRequired();
            entity.HasIndex(e => e.Token).IsUnique();
            entity.HasOne(e => e.TravelPlan)
                  .WithMany(tp => tp.ShareTokens)
                  .HasForeignKey(e => e.TravelPlanId)
                  .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
