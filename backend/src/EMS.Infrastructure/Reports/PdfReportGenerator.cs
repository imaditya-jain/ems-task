using EMS.Application.Reports.Interfaces;
using EMS.Application.Reports.Models;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace EMS.Infrastructure.Reports;

public class PdfReportGenerator : IPdfReportGenerator
{
    private const string BorderColor = "#E2E8F0";
    private const string HeaderBackground = "#EEF2FF";
    private const string MutedText = "#64748B";

    public byte[] Generate(ReportDocument report) =>
        Document.Create(container => container.Page(page =>
        {
            page.Size(PageSizes.A4.Landscape());
            page.Margin(30);
            page.DefaultTextStyle(style => style.FontSize(9));

            page.Header().PaddingBottom(12).Column(column =>
            {
                column.Item().Text(report.Title).FontSize(18).SemiBold().FontColor("#4338CA");
                if (!string.IsNullOrWhiteSpace(report.Subtitle))
                    column.Item().Text(report.Subtitle).FontColor(MutedText);
                column.Item().Text($"Generated on {DateTime.UtcNow:dd MMM yyyy HH:mm} UTC").FontSize(8).FontColor(MutedText);
            });

            page.Content().Column(column =>
            {
                column.Spacing(14);
                column.Item().Element(c => ComposeTable(c, report));

                if (report.Summary.Count > 0)
                    column.Item().Element(c => ComposeSummary(c, report));
            });

            page.Footer().AlignCenter().Text(text =>
            {
                text.DefaultTextStyle(style => style.FontSize(8).FontColor(MutedText));
                text.Span("Page ");
                text.CurrentPageNumber();
                text.Span(" of ");
                text.TotalPages();
            });
        })).GeneratePdf();

    private static void ComposeTable(IContainer container, ReportDocument report)
    {
        if (report.Rows.Count == 0)
        {
            container.Text("No records found for the selected filters.").FontColor(MutedText);
            return;
        }

        container.Table(table =>
        {
            table.ColumnsDefinition(columns =>
            {
                foreach (var _ in report.Columns) columns.RelativeColumn();
            });

            table.Header(header =>
            {
                foreach (var column in report.Columns)
                {
                    header.Cell().Background(HeaderBackground).BorderBottom(1).BorderColor(BorderColor)
                        .Padding(5).Element(c => Align(c, column.Align)).Text(column.Header).SemiBold();
                }
            });

            foreach (var row in report.Rows)
            {
                for (var i = 0; i < report.Columns.Count; i++)
                {
                    table.Cell().BorderBottom(1).BorderColor(BorderColor)
                        .Padding(5).Element(c => Align(c, report.Columns[i].Align))
                        .Text(ReportValueFormatter.ToText(row[i]));
                }
            }
        });
    }

    private static void ComposeSummary(IContainer container, ReportDocument report)
    {
        container.ShowEntire().Border(1).BorderColor(BorderColor).Padding(10).Column(column =>
        {
            column.Item().PaddingBottom(4).Text("Summary").SemiBold().FontSize(10);

            foreach (var item in report.Summary)
            {
                column.Item().Row(row =>
                {
                    row.ConstantItem(170).Text(item.Label).FontColor(MutedText);
                    row.RelativeItem().Text(ReportValueFormatter.ToText(item.Value)).SemiBold();
                });
            }
        });
    }

    private static IContainer Align(IContainer container, ColumnAlign align) => align switch
    {
        ColumnAlign.Right => container.AlignRight(),
        ColumnAlign.Center => container.AlignCenter(),
        _ => container.AlignLeft()
    };
}
