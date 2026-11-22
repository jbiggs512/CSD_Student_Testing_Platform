import {
    Bar,
    BarChart,
    Rectangle,
    ResponsiveContainer,
    XAxis,
    YAxis,
} from "recharts";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/shared/components";
import type { ComparisonRow, CohortComparisonResponse } from "../model";

const COLORS = {
    navy: "#0A2262",
    you: "#A9546C",
    cohort: "#EDB76F",
    grid: "#E8EBF5",
    axis: "#6B7280",
};

export function ComparisonCard({
    data,
}: Readonly<{ data: CohortComparisonResponse }>) {
    // ComparisonRow order = top-to-bottom order on the chart
    const ComparisonRows: ComparisonRow[] = [
        { key: "top5", label: "Top 5 avg", value: data.top5_average, fill: COLORS.navy },
        { key: "you", label: "You", value: data.user_average, fill: COLORS.you },
        { key: "cohort", label: "Cohort avg", value: data.cohort_average, fill: COLORS.cohort },
    ];

    // Authenticated users labels are highlighted in pink
    const labelColor = (key: ComparisonRow["key"]) =>
        key === "you" ? COLORS.you : COLORS.navy;

    return (
        <Card className="gap-0 border-0 py-0 shadow-md">
            <CardHeader className="gap-1 py-5">
                <CardTitle className="font-heading text-2xl font-bold text-navy">
                    You vs Cohort vs Top 5
                </CardTitle>
                <CardDescription className="text-navy">
                    Comparison against the top 5 students average and the entire cohort average.
                </CardDescription>
            </CardHeader>

            <CardContent className="px-4 pb-5">
                <p className="mb-1 ml-[100px] text-xs text-muted-foreground">
                    Average score for {data.subject}
                </p>

                <ResponsiveContainer width="100%" height={170}>
                    <BarChart
                        data={ComparisonRows}
                        layout="vertical"
                        margin={{ top: 4, right: 56, bottom: 4, left: 0 }}
                        barCategoryGap={14}
                    >
                        {/* Fixed 0–100 scale so bar lengths are comparable between students */}
                        <XAxis type="number" domain={[0, 100]} hide />
                        <YAxis
                            type="category"
                            dataKey="label"
                            width={100}
                            tickLine={false}
                            axisLine={{ stroke: COLORS.grid }}
                            tick={({ x, y, payload, index }) => (
                                <text
                                    x={Number(x) - 12}
                                    y={Number(y)}
                                    textAnchor="end"
                                    dominantBaseline="central"
                                    fontSize={13}
                                    fontWeight={ComparisonRows[index].key === "you" ? 700 : 500}
                                    fill={labelColor(ComparisonRows[index].key)}
                                >
                                    {payload.value}
                                </text>
                            )}
                        />

                        <Bar
                            dataKey="value"
                            barSize={28}
                            isAnimationActive={false}
                            shape={(props: any) => {
                                const { x, y, width, height, payload } = props;
                                const row = payload as ComparisonRow;
                                return (
                                    <g>
                                        <Rectangle
                                            x={x}
                                            y={y}
                                            width={Math.max(width, 0)}
                                            height={height}
                                            fill={row.fill}
                                            radius={[0, 12, 12, 0]}
                                        />
                                        <text
                                            x={x + Math.max(width, 0) + 12}
                                            y={y + height / 2}
                                            dominantBaseline="central"
                                            fontSize={14}
                                            fontWeight={700}
                                            fill={labelColor(row.key)}
                                        >
                                            {`${row.value}%`}
                                        </text>
                                    </g>
                                );
                            }}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}