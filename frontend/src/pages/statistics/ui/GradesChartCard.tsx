import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
  type DotItemDotProps
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components";
import type { GradePoint, GradesOverTimeResponse } from "../model"

const COLORS = {
  navy: "#0A2262",
  plum: "#6E3273",
  worst: "#B44D70",
  best: "#F4B767",
  grid: "#E8EBF5",
  axis: "#6B7280",
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

// Set the colour of the point on the graph and any necessary suffix text
function getPointStyle(point: GradePoint) {
  if (point.is_best) {
    return { fill: COLORS.best, suffix: " · Best" };
  }
  if (point.is_worst) {
    return { fill: COLORS.worst, suffix: " · Worst" };
  }
  return { fill: "#fff", suffix: "" };
}

export function GradesChartCard({ data }: Readonly<{ data: GradesOverTimeResponse }>) {
  const { points, average } = data;

  // Y axis variables
  const lowest = Math.min(...points.map((p) => p.percentage));
  const yMin = Math.max(0, Math.floor((lowest - 10) / 10) * 10);
  const yTicks = Array.from({ length: (100 - yMin) / 10 + 1 }, (_, i) => yMin + i * 10);

  // Put the label below the dot if it's the worst or below the average score 
  // Otherwise, put it above the dot
  const labelBelow = (i: number) => {
    const p = points[i];
    if (p.is_worst) return true;
    if (p.is_best) return false; 
    return p.percentage <= data.average;
  };

  const renderDot = (props: DotItemDotProps) => {
    const { cx, cy, index, payload } = props;
    if (cx == null || cy == null) return <g key={`dot-${index}`} />;

    const point = payload as GradePoint;
    const filled = point.is_best || point.is_worst;
    const { fill, suffix } = getPointStyle(point);
    const stroke = point.is_worst ? COLORS.worst : COLORS.navy;
    const below = labelBelow(index);

    return (
      <g key={`dot-${index}`}>
        <circle
          cx={cx}
          cy={cy}
          r={filled ? 8 : 6}
          fill={fill}
          stroke={stroke}
          strokeWidth={2.5}
        />
        <text
          x={cx}
          y={below ? cy + 26 : cy - 16}
          textAnchor="middle"
          fontSize={13}
          fontWeight={700}
          fill={point.is_worst ? COLORS.plum : COLORS.navy}
        >
          {`${point.percentage}%${suffix}`}
        </text>
      </g>
    );
  };

  return (
    <Card className="gap-0 border-0 py-0 shadow-md">
      <CardHeader className="gap-1 border-b py-5">
        <CardTitle className="font-heading text-2xl font-bold text-plum">
          Grades Over Time
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4">
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={points} margin={{ top: 30, right: 40, bottom: 10, left: 0 }}>
            <CartesianGrid vertical={false} stroke={COLORS.grid} />
            <XAxis
              dataKey="completed_at"
              tickFormatter={formatDate}
              axisLine={false}
              tickLine={false}
              tick={{ fill: COLORS.axis, fontSize: 13 }}
              padding={{ left: 40, right: 40 }}
            />
            <YAxis
              domain={[yMin, 100]}
              ticks={yTicks}
              tickFormatter={(v) => `${v}%`}
              axisLine={false}
              tickLine={false}
              tick={{ fill: COLORS.axis, fontSize: 13 }}
              width={48}
            />

            <ReferenceLine
              y={average}
              stroke={COLORS.plum}
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{
                value: `Average ${average}%`,
                position: "insideBottomRight",
                fill: COLORS.plum,
                fontSize: 13,
                fontWeight: 700,
              }}
            />

            <Line
              type="linear"
              dataKey="percentage"
              stroke={COLORS.navy}
              strokeWidth={3}
              dot={renderDot}
              activeDot={false}
            />
          </LineChart>
        </ResponsiveContainer>

      </CardContent>
    </Card>
  );
}