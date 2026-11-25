using ClosedXML.Excel;
using EMS.Application.Reports.Interfaces;
using EMS.Application.Reports.Models;

namespace EMS.Infrastructure.Reports;

public class ExcelReportGenerator : IExcelReportGenerator
{
    public byte[] Generate(ReportDocument report)
    {
        using var workbook = new XLWorkbook();
        var sheet = workbook.Worksheets.Add("Report");
        var columnCount = report.Columns.Count;

        var row = 1;
        sheet.Cell(row, 1).Value = report.Title;
        sheet.Cell(row, 1).Style.Font.SetBold().Font.SetFontSize(14);
        row++;

        if (!string.IsNullOrWhiteSpace(report.Subtitle))
        {
            sheet.Cell(row, 1).Value = report.Subtitle;
            row++;
        }

        sheet.Cell(row, 1).Value = $"Generated on {DateTime.UtcNow:dd MMM yyyy HH:mm} UTC";
        sheet.Cell(row, 1).Style.Font.SetFontColor(XLColor.Gray);
        row += 2;

        var headerRow = row;
        for (var c = 0; c < columnCount; c++)
        {
            var cell = sheet.Cell(headerRow, c + 1);
            cell.Value = report.Columns[c].Header;
            cell.Style.Font.SetBold();
            cell.Style.Fill.SetBackgroundColor(XLColor.FromHtml("#EEF2FF"));
            cell.Style.Alignment.SetHorizontal(ToExcelAlignment(report.Columns[c].Align));
        }
        row++;

        foreach (var values in report.Rows)
        {
            for (var c = 0; c < columnCount; c++)
                WriteCell(sheet.Cell(row, c + 1), values[c], report.Columns[c].Align);
            row++;
        }

        if (report.Rows.Count > 0)
        {
            sheet.Range(headerRow, 1, row - 1, columnCount).SetAutoFilter();
            sheet.SheetView.FreezeRows(headerRow);
        }

        if (report.Summary.Count > 0)
        {
            row++;
            sheet.Cell(row, 1).Value = "Summary";
            sheet.Cell(row, 1).Style.Font.SetBold();
            row++;

            foreach (var item in report.Summary)
            {
                sheet.Cell(row, 1).Value = item.Label;
                WriteCell(sheet.Cell(row, 2), item.Value, ColumnAlign.Left);
                row++;
            }
        }

        sheet.Columns().AdjustToContents(headerRow, row, 8, 60);

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    /// <summary>
    /// Text is written with <see cref="XLCellValue"/> as a plain string, never as a formula, so a value such as
    /// "=SUM(A1)" typed into a designation stays inert text when the sheet is opened (CSV/formula injection).
    /// </summary>
    private static void WriteCell(IXLCell cell, object? value, ColumnAlign align)
    {
        switch (value)
        {
            case null:
                cell.Value = "—";
                break;
            case string text:
                cell.SetValue(XLCellValue.FromObject(text));
                cell.Style.NumberFormat.SetFormat("@");
                break;
            case Money money:
                cell.Value = money.Amount;
                cell.Style.NumberFormat.SetFormat("#,##0.00");
                break;
            case Percent percent:
                cell.Value = percent.Fraction;
                cell.Style.NumberFormat.SetFormat("0.0%");
                break;
            case DateOnly date:
                cell.Value = date.ToDateTime(TimeOnly.MinValue);
                cell.Style.NumberFormat.SetFormat("dd mmm yyyy");
                break;
            case int number:
                cell.Value = number;
                break;
            case decimal number:
                cell.Value = number;
                cell.Style.NumberFormat.SetFormat("#,##0.00");
                break;
            default:
                cell.Value = value.ToString();
                break;
        }

        cell.Style.Alignment.SetHorizontal(ToExcelAlignment(align));
    }

    private static XLAlignmentHorizontalValues ToExcelAlignment(ColumnAlign align) => align switch
    {
        ColumnAlign.Right => XLAlignmentHorizontalValues.Right,
        ColumnAlign.Center => XLAlignmentHorizontalValues.Center,
        _ => XLAlignmentHorizontalValues.Left
    };
}
