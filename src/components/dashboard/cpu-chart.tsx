"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { GlassCard } from "@/components/layout/glass-card";

const data = [
  { time: "00:00", cpu: 32, ram: 45 },
  { time: "02:00", cpu: 28, ram: 42 },
  { time: "04:00", cpu: 18, ram: 38 },
  { time: "06:00", cpu: 22, ram: 40 },
  { time: "08:00", cpu: 45, ram: 52 },
  { time: "10:00", cpu: 62, ram: 58 },
  { time: "12:00", cpu: 55, ram: 60 },
  { time: "14:00", cpu: 70, ram: 65 },
  { time: "16:00", cpu: 58, ram: 62 },
  { time: "18:00", cpu: 48, ram: 55 },
  { time: "20:00", cpu: 38, ram: 50 },
  { time: "22:00", cpu: 30, ram: 46 },
];

export function CpuChart() {
  return (
    <GlassCard>
      <h3 className="mb-4 text-lg font-semibold text-[#134E4A]">
        Server Load
      </h3>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0D9488" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#0D9488" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="ramGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e5e7eb"
              vertical={false}
            />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 12, fill: "#9CA3AF" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#9CA3AF" }}
              axisLine={false}
              tickLine={false}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(255,255,255,0.9)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
              formatter={(value, name) => [
                `${value}%`,
                name === "cpu" ? "CPU" : "RAM",
              ]}
            />
            <Area
              type="monotone"
              dataKey="cpu"
              stroke="#0D9488"
              strokeWidth={2}
              fill="url(#cpuGradient)"
            />
            <Area
              type="monotone"
              dataKey="ram"
              stroke="#7C3AED"
              strokeWidth={2}
              fill="url(#ramGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}
