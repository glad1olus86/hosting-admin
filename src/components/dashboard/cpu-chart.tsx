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

export interface DataPoint {
  time: string;
  cpu: number;
  ram: number;
}

interface CpuChartProps {
  data: DataPoint[];
  title?: string;
  period?: string;
}

function formatTick(time: string, period?: string) {
  if (!period || period === "live") return time;
  try {
    const d = new Date(time);
    if (isNaN(d.getTime())) return time;
    if (period === "7d") {
      return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")} ${d.getHours().toString().padStart(2, "0")}:00`;
    }
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  } catch {
    return time;
  }
}

export function CpuChart({ data, title = "Server Load", period }: CpuChartProps) {
  return (
    <GlassCard>
      <h3 className="mb-4 text-lg font-semibold text-[#134E4A]">{title}</h3>
      <div className="h-[300px] w-full">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Collecting data...
          </div>
        ) : (
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
                tick={{ fontSize: 11, fill: "#9CA3AF" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatTick(v, period)}
                interval="preserveStartEnd"
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
                labelFormatter={(label) => {
                  if (!period || period === "live") return label;
                  try {
                    const d = new Date(label);
                    if (isNaN(d.getTime())) return label;
                    return d.toLocaleString("ru-RU", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                  } catch {
                    return label;
                  }
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
        )}
      </div>
    </GlassCard>
  );
}
