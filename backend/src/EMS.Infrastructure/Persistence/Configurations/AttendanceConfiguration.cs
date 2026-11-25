using EMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EMS.Infrastructure.Persistence.Configurations;

public class AttendanceConfiguration : IEntityTypeConfiguration<Attendance>
{
    public void Configure(EntityTypeBuilder<Attendance> builder)
    {
        builder.ToTable("attendances");

        builder.Property(a => a.Status).HasConversion<string>().HasMaxLength(10);
        builder.Property(a => a.Notes).HasMaxLength(255);

        // One record per employee per day. Also serves queries by employee + date range.
        builder.HasIndex(a => new { a.EmployeeId, a.Date }).IsUnique();
        builder.HasIndex(a => a.Date);

        // Deleting an employee removes their attendance history with them.
        builder.HasOne(a => a.Employee)
            .WithMany(e => e.Attendances)
            .HasForeignKey(a => a.EmployeeId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
