import {
    Alert,
    AlertDescription,
    Button,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/shared/components";
import { exportResultsToExcel, type GradesOverTimeResponse } from "../model";
import { useState } from "react";
import { AlertCircleIcon } from "lucide-react";

export function ExportResultsCard({ data }: Readonly<{ data: GradesOverTimeResponse }>) {
    const exportOptions = [
        { label: "Excel (.xlsx)", value: 0 }
    ];
    const [exportError, setExportError] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        try {
            setExportError(null);
            setIsExporting(true);
            await exportResultsToExcel(data.points);
        } catch (err) {
            const message = err instanceof Error ? err.message : "An unexpected error occurred";
            setExportError(`Export failed: ${message}`)
        } finally {
            setIsExporting(false);
        }
    };
    return (
        <Card className="gap-0 border-0 py-0 shadow-md">
            <CardHeader className="gap-1 border-b py-5">
                <CardTitle className="font-heading text-2xl font-bold text-plum">
                    Export Results
                </CardTitle>
                <CardDescription>
                    Download your completed test data. Your best and worst tests are highlighted in the file.
                </CardDescription>
            </CardHeader>

            <CardContent className="p-2">
                <div className="flex flex-col gap-4 items-center justify-center">
                    <div className="flex flex-col gap-1">
                        <label htmlFor="exportFilter" className="text-xs font-medium text-muted-foreground">File format</label>
                        <Select id="exportFilter" items={exportOptions} defaultValue={exportOptions[0]}>
                            <SelectTrigger className="h-8 w-full bg-background">
                                <SelectValue placeholder="Select file format" />
                            </SelectTrigger>
                            <SelectContent>
                                {exportOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button
                        className="w-full"
                        disabled={data.points.length === 0 || isExporting}
                        onClick={handleExport}>
                        {isExporting ? "Exporting..." : "Export Results"}
                    </Button>
                    {exportError && (
                        <Alert variant="destructive">
                            <AlertCircleIcon aria-hidden="true" />
                            <AlertDescription>{exportError}</AlertDescription>
                        </Alert>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

