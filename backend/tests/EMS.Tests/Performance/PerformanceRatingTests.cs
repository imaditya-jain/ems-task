using EMS.Application.Common;
using EMS.Application.Performance;

namespace EMS.Tests.Performance;

public class PerformanceRatingTests
{
    [Theory]
    [InlineData(5, 5, 5, 5.00)]
    [InlineData(1, 1, 1, 1.00)]
    [InlineData(2, 3, 2, 2.33)]
    [InlineData(4, 5, 3, 4.00)]
    [InlineData(5, 5, 4, 4.67)]
    public void Overall_IsTheAverageOfTheThreeScores_RoundedToTwoDecimals(int q, int p, int t, double expected)
    {
        Assert.Equal((decimal)expected, PerformanceRating.Overall(q, p, t));
    }

    [Theory]
    [InlineData(5.0, "Outstanding")]
    [InlineData(4.5, "Outstanding")]
    [InlineData(4.49, "Exceeds Expectations")]
    [InlineData(3.5, "Exceeds Expectations")]
    [InlineData(3.49, "Meets Expectations")]
    [InlineData(2.5, "Meets Expectations")]
    [InlineData(2.49, "Needs Improvement")]
    [InlineData(1.0, "Needs Improvement")]
    public void Label_UsesInclusiveLowerBounds(double overall, string expected)
    {
        Assert.Equal(expected, PerformanceRating.Label((decimal)overall));
    }
}

public class AttendanceMathTests
{
    [Fact]
    public void Rate_IsNull_WhenThereAreNoCountableDays()
    {
        Assert.Null(AttendanceMath.Rate(0, 0, 0, 0));
    }

    [Fact]
    public void Rate_IgnoresLeaveBecauseItIsNotPassedIn()
    {
        // 8 present, 2 absent -> 80%
        Assert.Equal(0.8m, AttendanceMath.Rate(8, 0, 0, 2));
    }

    [Fact]
    public void Rate_CountsLateAsAttended_AndHalfDayAsHalf()
    {
        // (5 present + 3 late + 0.5*2 half) / (5+3+2+0) = 9/10
        Assert.Equal(0.9m, AttendanceMath.Rate(5, 3, 2, 0));
    }

    [Fact]
    public void Rate_IsZero_WhenOnlyAbsent()
    {
        Assert.Equal(0m, AttendanceMath.Rate(0, 0, 0, 4));
    }

    [Fact]
    public void Rate_IsRoundedToFourDecimals()
    {
        Assert.Equal(0.6667m, AttendanceMath.Rate(2, 0, 0, 1));
    }
}
