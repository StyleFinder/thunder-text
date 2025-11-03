import React from "react";
import {
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

interface TrendPoint {
  date: string;
  value: number;
}

interface TrendSparklineProps {
  series: TrendPoint[];
  seasonalProfile?: number[]; // 52-week normalized curve
  height?: number;
}

export function TrendSparkline({
  series,
  seasonalProfile,
  height = 80,
}: TrendSparklineProps) {
  if (!series || series.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-gray-50 rounded"
        style={{ height }}
      >
        <p className="text-sm text-gray-500">No data available</p>
      </div>
    );
  }

  // Prepare data for chart
  const chartData = series.map((point) => ({
    date: point.date,
    value: point.value,
    seasonal: seasonalProfile
      ? getSeasonalValueForDate(point.date, seasonalProfile)
      : undefined,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart
        data={chartData}
        margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
      >
        <defs>
          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
          </linearGradient>
        </defs>

        <XAxis dataKey="date" hide />
        <YAxis domain={[0, 100]} hide />

        <Tooltip
          contentStyle={{
            backgroundColor: "#fff",
            border: "1px solid #ccc",
            borderRadius: "4px",
            fontSize: "12px",
          }}
          labelFormatter={(label) => new Date(label).toLocaleDateString()}
          formatter={(value: number, name: string) => {
            if (name === "value") return [`Interest: ${value}`, "Current"];
            if (name === "seasonal") return [`Typical: ${value}`, "Historical"];
            return [value, name];
          }}
        />

        {/* Seasonal baseline (if available) */}
        {seasonalProfile && (
          <Line
            type="monotone"
            dataKey="seasonal"
            stroke="#ccc"
            strokeWidth={1}
            strokeDasharray="3 3"
            dot={false}
          />
        )}

        {/* Current trend */}
        <Area
          type="monotone"
          dataKey="value"
          stroke="#8884d8"
          strokeWidth={2}
          fill="url(#colorValue)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Helper: map date to week-of-year index (1-52)
function getSeasonalValueForDate(dateStr: string, profile: number[]): number {
  const date = new Date(dateStr);
  const weekOfYear = getWeekOfYear(date);
  return profile[weekOfYear - 1] || 0;
}

function getWeekOfYear(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}
