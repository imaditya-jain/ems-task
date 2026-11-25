using ClosedXML.Excel;
using EMS.Application.Reports.Models;
using EMS.Infrastructure.Reports;
using QuestPDF.Infrastructure;

namespace EMS.Tests.Reports;

/// <summary>Runs the real PDF and Excel generators (no mocks) and inspects the files they produce.</summary>
public class ReportGeneratorTests
{
    static ReportGeneratorTests() => QuestPDF.Settings.License = LicenseType.Community;

    private static ReportDocument Sample(params object?[][] rows) => new(
        "Sample Report",
        "Subtitle here",
        [new("Name"), new("Salary", ColumnAlign.Right), new("Joined"), new("Rate", ColumnAlign.Right), new("Count", ColumnAlign.Right)],
        rows,
        [new("Employees", rows.Length), new("Payroll", new Money(1234.5m))]);

    private static XLWorkbook Open(byte[] bytes) => new(new MemoryStream(bytes));

    // ---- PDF -----------------------------------------------------------------------------------

    [Fact]
    public void Pdf_ProducesAValidPdfFile()
    {
        var bytes = new PdfReportGenerator().Generate(Sample(["Asha", new Money(85000m), new DateOnly(2024, 5, 1), new Percent(0.9m), 3]));

        Assert.True(bytes.Length > 1000);
        Assert.Equal("%PDF", System.Text.Encoding.ASCII.GetString(bytes, 0, 4));
    }

    [Fact]
    public void Pdf_WithNoRows_StillRendersTheEmptyState()
    {
        var bytes = new PdfReportGenerator().Generate(Sample());

        Assert.Equal("%PDF", System.Text.Encoding.ASCII.GetString(bytes, 0, 4));
    }

    [Fact]
    public void Pdf_WithManyRows_SpansMultiplePagesWithoutFailing()
    {
        var rows = Enumerable.Range(1, 300).Select(i => new object?[] { $"Employee {i}", new Money(i * 1000m), new DateOnly(2024, 1, 1), new Percent(0.5m), i }).ToArray();

        var bytes = new PdfReportGenerator().Generate(Sample(rows));

        Assert.True(bytes.Length > 5000);
    }

    [Fact]
    public void ValueFormatter_FormatsMoneyPercentAndDates()
    {
        Assert.Equal("₹1,23,456.50", ReportValueFormatter.ToText(new Money(123456.5m)));
        Assert.Equal("90.0%", ReportValueFormatter.ToText(new Percent(0.9m)));
        Assert.Equal("01 May 2024", ReportValueFormatter.ToText(new DateOnly(2024, 5, 1)));
        Assert.Equal("—", ReportValueFormatter.ToText(null));
        Assert.Equal("7", ReportValueFormatter.ToText(7));
    }

    // ---- Excel ---------------------------------------------------------------------------------

    [Fact]
    public void Excel_ProducesAWorkbook_WithTitleHeaderAndRows()
    {
        var bytes = new ExcelReportGenerator().Generate(Sample(["Asha", new Money(85000m), new DateOnly(2024, 5, 1), new Percent(0.9m), 3]));

        using var workbook = Open(bytes);
        var sheet = workbook.Worksheet(1);

        Assert.Equal("Sample Report", sheet.Cell(1, 1).GetString());
        Assert.Equal("Subtitle here", sheet.Cell(2, 1).GetString());
        Assert.Equal("Name", sheet.Cell(5, 1).GetString());
        Assert.Equal("Asha", sheet.Cell(6, 1).GetString());
    }

    [Fact]
    public void Excel_StoresNumbersDatesAndPercentagesNatively_SoTheyCanBeSortedAndSummed()
    {
        var bytes = new ExcelReportGenerator().Generate(Sample(["Asha", new Money(85000.5m), new DateOnly(2024, 5, 1), new Percent(0.9m), 3]));

        using var workbook = Open(bytes);
        var sheet = workbook.Worksheet(1);

        Assert.Equal(XLDataType.Number, sheet.Cell(6, 2).DataType);
        Assert.Equal(85000.5, sheet.Cell(6, 2).GetDouble());
        Assert.Equal(XLDataType.DateTime, sheet.Cell(6, 3).DataType);
        Assert.Equal(new DateTime(2024, 5, 1), sheet.Cell(6, 3).GetDateTime());
        Assert.Equal(0.9, sheet.Cell(6, 4).GetDouble(), 3);
        Assert.Equal("0.0%", sheet.Cell(6, 4).Style.NumberFormat.Format);
        Assert.Equal(3, sheet.Cell(6, 5).GetDouble());
    }

    [Theory]
    [InlineData("=1+1")]
    [InlineData("=HYPERLINK(\"http://evil\",\"x\")")]
    [InlineData("+SUM(A1:A2)")]
    [InlineData("@SUM(A1)")]
    public void Excel_TextThatLooksLikeAFormula_StaysInertText(string malicious)
    {
        var bytes = new ExcelReportGenerator().Generate(Sample([malicious, new Money(1m), new DateOnly(2024, 1, 1), null, 1]));

        using var workbook = Open(bytes);
        var cell = workbook.Worksheet(1).Cell(6, 1);

        Assert.False(cell.HasFormula);
        Assert.Equal(XLDataType.Text, cell.DataType);
        Assert.Equal(malicious, cell.GetString());
    }

    [Fact]
    public void Excel_WritesTheSummarySection_AndDashForMissingValues()
    {
        var bytes = new ExcelReportGenerator().Generate(Sample(["Asha", new Money(1m), new DateOnly(2024, 1, 1), null, 1]));

        using var workbook = Open(bytes);
        var sheet = workbook.Worksheet(1);

        Assert.Equal("—", sheet.Cell(6, 4).GetString());
        var summaryRow = sheet.RowsUsed().First(r => r.Cell(1).GetString() == "Employees");
        Assert.Equal(1, summaryRow.Cell(2).GetDouble());
    }

    [Fact]
    public void Excel_WithNoRows_StillProducesAValidWorkbook()
    {
        using var workbook = Open(new ExcelReportGenerator().Generate(Sample()));

        Assert.Equal("Name", workbook.Worksheet(1).Cell(5, 1).GetString());
    }
}
