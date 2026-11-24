import type { GradesOverTimeResponse } from ".";
import * as ExcelJS from "exceljs";

type Point = GradesOverTimeResponse["points"][number];

const BEST = "FFF4B767";
const WORST = "FFB44D70";

function getColour(point: Point) {
    if (point.is_best) {
        return BEST;
    }
    else if (point.is_worst) {
        return WORST;
    }
    return null;
}

export async function exportResultsToExcel(points: Point[]) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Results");

    sheet.columns = [
        { header: "Test", key: "testName", width: 30 },
        { header: "Date", key: "date", width: 16, style: { numFmt: "dd/mm/yyyy" } },
        { header: "Grade", key: "grade", width: 12 },
    ];

    // Bold header row
    sheet.getRow(1).font = { bold: true };

    const grades = points.map((p) => p.percentage);
    const best = Math.max(...grades);
    const worst = Math.min(...grades);
    const allEqual = best === worst;

    points.forEach((point) => {
        const row = sheet.addRow({
            testName: point.test_name,
            date: new Date(point.completed_at),
            grade: point.percentage,
        });

        if (allEqual) return;

        const colour = getColour(point);

        if (colour) {
            row.getCell(3).fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: colour },
            };
        }
    });

    // Small legend underneath
    sheet.addRow([]);
    const bestLegend = sheet.addRow(["Best result"]);
    bestLegend.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: BEST } };
    bestLegend.font = { bold: true };
    const worstLegend = sheet.addRow(["Worst result"]);
    worstLegend.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: WORST } };
    worstLegend.font = { bold: true };

    // Trigger browser download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `altius-stats-${new Date().toLocaleDateString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
}