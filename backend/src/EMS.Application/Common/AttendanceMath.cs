namespace EMS.Application.Common;

public static class AttendanceMath
{
    /// <summary>
    /// Attendance rate = (Present + Late + 0.5 x Half Day) / (marked days - Leave).
    /// Returns null when there are no countable days.
    /// </summary>
    public static decimal? Rate(int present, int late, int halfDay, int absent)
    {
        var countable = present + late + halfDay + absent;
        if (countable == 0) return null;

        return Math.Round((present + late + 0.5m * halfDay) / countable, 4);
    }
}
