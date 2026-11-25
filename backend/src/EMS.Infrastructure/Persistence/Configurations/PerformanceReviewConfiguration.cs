using EMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EMS.Infrastructure.Persistence.Configurations;

public class PerformanceReviewConfiguration : IEntityTypeConfiguration<PerformanceReview>
{
    public void Configure(EntityTypeBuilder<PerformanceReview> builder)
    {
        builder.ToTable("performance_reviews");

        builder.Property(r => r.Comments).HasMaxLength(500);

        // One review per employee per quarter.
        builder.HasIndex(r => new { r.EmployeeId, r.Year, r.Quarter }).IsUnique();
        builder.HasIndex(r => new { r.Year, r.Quarter });

        builder.HasOne(r => r.Employee)
            .WithMany(e => e.PerformanceReviews)
            .HasForeignKey(r => r.EmployeeId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
