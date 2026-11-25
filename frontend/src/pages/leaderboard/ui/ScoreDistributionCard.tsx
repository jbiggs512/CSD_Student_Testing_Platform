import {
  Bar,
  CartesianGrid,
  BarChart,
  LabelList,
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
import type { BandBarProps, BandTickProps, CountLabelProps, ScoreDistributionResponse } from "../model";

const COLORS = {
  navy: "#0A2262",
  you: "#A9546C",
  cohort: "#EDB76F",
  grid: "#E8EBF5",
  axis: "#6B7280",
};

// Axis labels for each score band
function BandTick({ x = 0, y = 0, payload, userBand, yourScore }: Readonly<BandTickProps>) {
  const isYou = payload?.value === userBand;
  return (
    <g>
      <text
        x={x}
        y={y + 14}
        textAnchor="middle"
        fontSize={13}
        fontWeight={isYou ? 700 : 400}
        fill={isYou ? COLORS.you : COLORS.axis}>
        {payload?.value}
      </text>
      {isYou && yourScore != null && (
        <text
          x={x}
          y={y + 32}
          textAnchor="middle"
          fontSize={12}
          fontWeight={600}
          fill={COLORS.you}
        >
          {`You: ${yourScore}%`}
        </text>
      )}
    </g>
  );
}

// Draws each bar, with either the users or cohorts colour
function BandBar({ x = 0, y = 0, width = 0, height = 0, payload, userBand }: Readonly<BandBarProps>) {
  const isYou = payload?.band === userBand;
  return (
    <Rectangle
      x={x}
      y={y}
      width={width}
      height={height}
      fill={isYou ? COLORS.you : COLORS.cohort}
      radius={[6, 6, 0, 0]}
    />
  );
}

// Label for each bar
function CountLabel({
  x = 0,
  y = 0,
  width = 0,
  value,
  index = 0,
  bands,
  userBand,
}: Readonly<CountLabelProps>) {
  const isUser = bands[index]?.band === userBand;
  return (
    <text
      x={x + width / 2}
      y={y - 8}
      textAnchor="middle"
      fontSize={13}
      fontWeight={700}
      fill={isUser ? COLORS.you : COLORS.navy}>
      {value}
    </text>
  );
}

export function ScoreDistributionCard({ data }: Readonly<{ data: ScoreDistributionResponse }>) {
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
            margin={{ top: 24, right: 8, bottom: 24, left: 8 }}
            barCategoryGap={10}>
            <CartesianGrid vertical={false} horizontal={false} />
            <XAxis
              dataKey="band"
              axisLine={{ stroke: COLORS.grid }}
              tickLine={false}
              interval={0}
              height={40}
              tick={<BandTick userBand={user_band} yourScore={user_score} />} />
            <YAxis hide domain={[0, Math.ceil(maxCount * 1.1)]} />
            <Bar
              dataKey="count"
              isAnimationActive={false}
              shape={<BandBar userBand={user_band} />}>
              <LabelList
                dataKey="count"
                position="top"
                offset={8}
                content={<CountLabel bands={bands} userBand={user_band} />}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}