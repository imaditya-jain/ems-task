namespace EMS.Application.Performance;

public static class PerformanceRating
{
    public static decimal Overall(int quality, int productivity, int teamwork) =>
        Math.Round((quality + productivity + teamwork) / 3m, 2);

    public static string Label(decimal overall) => overall switch
    {
        >= 4.5m => "Outstanding",
        >= 3.5m => "Exceeds Expectations",
        >= 2.5m => "Meets Expectations",
        _ => "Needs Improvement"
    };
}
