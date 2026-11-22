import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/shared/components";
import type { ScoreDistributionResponse } from "../model";

const COLORS = {
  navy: "#0A2262",
  you: "#A9546C",
  cohort: "#EDB76F",
  grid: "#E8EBF5",
  axis: "#6B7280",
};

export function ScoreDistributionCard({
  data,
}: Readonly<{ data: ScoreDistributionResponse }>) {
  const { bands, user_band, user_score, subject } = data;
  const maxCount = Math.max(...bands.map((b) => b.count));

  return (
    <Card className="gap-0 border-0 py-0 shadow-md">
      <CardHeader className="gap-1 py-5">
        <CardTitle className="font-heading text-2xl font-bold text-navy">
          Cohort Score Distribution
        </CardTitle>
        <CardDescription className="text-navy">
          Number of students per score band for {subject}.
        </CardDescription>
      </CardHeader>

      <CardContent className="px-4 pb-5">
        <ResponsiveContainer width="100%" height={230}>
          <BarChart
            data={bands}
            // Extra bottom margin leaves room for the "You: 83%" line under the axis
            margin={{ top: 24, right: 8, bottom: 24, left: 8 }}
            barCategoryGap={10}
          >
            <CartesianGrid vertical={false} horizontal={false} />
            <XAxis
              dataKey="band"
              axisLine={{ stroke: COLORS.grid }}
              tickLine={false}
              interval={0}
              height={40}
              tick={({ x, y, payload }) => {
                const isYou = payload.value === user_band;
                return (
                  <g>
                    <text
                      x={Number(x)}
                      y={Number(y) + 14}
                      textAnchor="middle"
                      fontSize={13}
                      fontWeight={isYou ? 700 : 400}
                      fill={isYou ? COLORS.you : COLORS.axis}
                    >
                      {payload.value}
                    </text>
                    {isYou && (
                      <text
                        x={Number(x)}
                        y={Number(y) + 32}
                        textAnchor="middle"
                        fontSize={12}
                        fontWeight={600}
                        fill={COLORS.you}
                      >
                        {`You: ${user_score}%`}
                      </text>
                    )}
                  </g>
                );
              }}
            />
            {/* Counts are shown as labels, so the Y axis is hidden but keeps headroom for them */}
            <YAxis hide domain={[0, Math.ceil(maxCount * 1.1)]} />

            <Bar
              dataKey="count"
              radius={[6, 6, 0, 0]}
              isAnimationActive={false}
            >
              {bands.map((b) => (
                <Cell
                  key={b.band}
                  fill={b.band === user_band ? COLORS.you : COLORS.cohort}
                />
              ))}
              <LabelList
                dataKey="count"
                position="top"
                offset={8}
                content={(props) => {
                  const { x, y, width, value, index } = props as {
                    x: number;
                    y: number;
                    width: number;
                    value: number;
                    index: number;
                  };
                  const isYou = bands[index].band === user_band;
                  return (
                    <text
                      x={x + width / 2}
                      y={y - 8}
                      textAnchor="middle"
                      fontSize={13}
                      fontWeight={700}
                      fill={isYou ? COLORS.you : COLORS.navy}
                    >
                      {value}
                    </text>
                  );
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}