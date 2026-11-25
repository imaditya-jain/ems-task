using System.Globalization;
using EMS.Application.Reports.Models;

namespace EMS.Infrastructure.Reports;

/// <summary>Turns typed report cells into display text (used by the PDF generator).</summary>
internal static class ReportValueFormatter
{
    private static readonly CultureInfo Indian = new("en-IN");

    public static string ToText(object? value) => value switch
    {
        null => "—",
        string text => text,
        Money money => "₹" + money.Amount.ToString("#,##0.00", Indian),
        Percent percent => (percent.Fraction * 100).ToString("0.0", CultureInfo.InvariantCulture) + "%",
        DateOnly date => date.ToString("dd MMM yyyy", CultureInfo.InvariantCulture),
        decimal number => number.ToString("#,##0.00", Indian),
        IFormattable formattable => formattable.ToString(null, CultureInfo.InvariantCulture),
        _ => value.ToString() ?? string.Empty
    };
}
