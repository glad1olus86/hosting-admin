"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useToast } from "@/contexts/toast-context";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Cpu,
  MemoryStick,
  HardDrive,
  Network,
  Activity,
  XCircle,
  Loader2,
  RotateCcw,
  Play,
  Square,
  RefreshCw,
} from "lucide-react";
import { GlassCard } from "@/components/layout/glass-card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────

const PERIODS = ["live", "1h", "6h", "24h", "7d"] as const;
type Period = (typeof PERIODS)[number];

// ─── Types ────────────────────────────────────────────────

interface Metrics {
  cpu: number;
  ram: { total: number; used: number; free: number; percent: number };
  disk: { total: string; used: string; avail: string; percent: number };
  network: { bytesIn: number; bytesOut: number };
  topProcesses: Array<{
    user: string;
    pid: string;
    cpu: number;
    mem: number;
    command: string;
  }>;
  loadAvg: { one: number; five: number; fifteen: number };
  uptimeSeconds: number;
  timestamp: number;
}

interface Stats {
  hostname: string;
  os: string;
  cpuCount: number;
  uptime: string;
  loadAvg: string;
}

interface ServiceInfo {
  name: string;
  STATE?: string;
  CPU?: string;
  MEM?: string;
}

interface ChartPoint {
  time: string;
  cpu: number;
  ram: number;
}

interface NetChartPoint {
  time: string;
  in: number;
  out: number;
}

// ─── Helpers ──────────────────────────────────────────────

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function gaugeColor(percent: number): string {
  if (percent >= 85) return "bg-red-500";
  if (percent >= 60) return "bg-amber-500";
  return "bg-emerald-500";
}

function gaugeTextColor(percent: number): string {
  if (percent >= 85) return "text-red-600";
  if (percent >= 60) return "text-amber-600";
  return "text-emerald-600";
}

const MAX_POINTS = 60;

// ─── Page ─────────────────────────────────────────────────

export default function ServerPage() {
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cpuHistory, setCpuHistory] = useState<ChartPoint[]>([]);
  const [netHistory, setNetHistory] = useState<NetChartPoint[]>([]);
  const prevNetwork = useRef<{ bytesIn: number; bytesOut: number } | null>(
    null
  );

  const [serviceLoading, setServiceLoading] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    name: string;
    action: string;
  } | null>(null);

  // ── Period / History ────────────────────────────────────
  const [period, setPeriod] = useState<Period>("live");
  const [historyCpu, setHistoryCpu] = useState<ChartPoint[]>([]);
  const [historyNet, setHistoryNet] = useState<NetChartPoint[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // ── Fetchers ──────────────────────────────────────────

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch("/api/metrics");
      if (!res.ok) throw new Error("Failed to fetch metrics");
      const data: Metrics = await res.json();
      if ((data as any).error) throw new Error((data as any).error);

      setMetrics(data);
      setError(null);

      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;

      setCpuHistory((prev) => {
        const next = [
          ...prev,
          { time: timeStr, cpu: data.cpu, ram: data.ram.percent },
        ];
        return next.length > MAX_POINTS ? next.slice(-MAX_POINTS) : next;
      });

      if (prevNetwork.current) {
        const deltaIn =
          (data.network.bytesIn - prevNetwork.current.bytesIn) / 1024;
        const deltaOut =
          (data.network.bytesOut - prevNetwork.current.bytesOut) / 1024;
        const inPerSec = Math.max(0, deltaIn / 5);
        const outPerSec = Math.max(0, deltaOut / 5);

        setNetHistory((prev) => {
          const next = [
            ...prev,
            {
              time: timeStr,
              in: Math.round(inPerSec),
              out: Math.round(outPerSec),
            },
          ];
          return next.length > MAX_POINTS ? next.slice(-MAX_POINTS) : next;
        });
      }
      prevNetwork.current = data.network;
    } catch (err: any) {
      setError(err.message || "Failed to fetch metrics");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/stats");
      if (res.ok) {
        const data = await res.json();
        if (!data.error) setStats(data);
      }
    } catch {}
  }, []);

  const fetchServices = useCallback(async () => {
    try {
      const res = await fetch("/api/services");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setServices(data);
      }
    } catch {}
  }, []);

  const fetchHistory = useCallback(async (p: Period) => {
    if (p === "live") return;
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/metrics/history?period=${p}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.points) {
        setHistoryCpu(data.points.map((pt: any) => ({
          time: pt.time,
          cpu: pt.cpu,
          ram: pt.ram,
        })));
        setHistoryNet(data.points.map((pt: any) => ({
          time: pt.time,
          in: pt.netInRate || 0,
          out: pt.netOutRate || 0,
        })));
      }
    } catch {}
    setHistoryLoading(false);
  }, []);

  // Seed live charts with last 5 minutes from DB
  const seedLiveData = useCallback(async () => {
    try {
      const res = await fetch("/api/metrics/history?period=5m");
      if (!res.ok) return;
      const data = await res.json();
      if (data.points && data.points.length > 0) {
        const cpuSeeded: ChartPoint[] = data.points.map((pt: any) => {
          const d = new Date(pt.time);
          return {
            time: `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`,
            cpu: pt.cpu,
            ram: pt.ram,
          };
        });
        setCpuHistory(cpuSeeded);

        // Compute net rates from sequential points
        const netSeeded: NetChartPoint[] = [];
        for (let i = 1; i < data.points.length; i++) {
          const pt = data.points[i];
          const d = new Date(pt.time);
          netSeeded.push({
            time: `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`,
            in: Math.max(0, Math.round((pt.netInRate || 0))),
            out: Math.max(0, Math.round((pt.netOutRate || 0))),
          });
        }
        if (netSeeded.length > 0) setNetHistory(netSeeded);
      }
    } catch {}
  }, []);

  const handlePeriodChange = useCallback((p: Period) => {
    setPeriod(p);
    if (p !== "live") fetchHistory(p);
  }, [fetchHistory]);

  useEffect(() => {
    fetchMetrics();
    fetchStats();
    fetchServices();
    seedLiveData();

    const metricsTimer = setInterval(fetchMetrics, 5000);
    const statsTimer = setInterval(fetchStats, 30000);
    const servicesTimer = setInterval(fetchServices, 10000);

    return () => {
      clearInterval(metricsTimer);
      clearInterval(statsTimer);
      clearInterval(servicesTimer);
    };
  }, [fetchMetrics, fetchStats, fetchServices, seedLiveData]);

  // ── Service management ────────────────────────────────

  function handleServiceAction(name: string, action: string) {
    if (action === "stop") {
      setConfirmDialog({ name, action });
      return;
    }
    executeServiceAction(name, action);
  }

  async function executeServiceAction(name: string, action: string) {
    setServiceLoading(name);
    setConfirmDialog(null);
    try {
      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, action }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        toast.error(data.error || "Failed to manage service");
      }
      await fetchServices();
    } catch {
      toast.error("Connection error");
    } finally {
      setServiceLoading(null);
    }
  }

  // ── Render ────────────────────────────────────────────

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        <span className="ml-3 text-muted-foreground">
          Connecting to server...
        </span>
      </div>
    );
  }

  const tooltipStyle = {
    backgroundColor: "rgba(255,255,255,0.9)",
    backdropFilter: "blur(12px)",
    border: "1px solid rgba(255,255,255,0.3)",
    borderRadius: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#134E4A]">Server</h1>
        <div className="flex items-center gap-2">
          {metrics && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              fetchMetrics();
              fetchStats();
              fetchServices();
            }}
            className="text-muted-foreground"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {error && (
        <GlassCard className="border-red-200 bg-red-50/70">
          <p className="text-sm text-red-600">{error}</p>
        </GlassCard>
      )}

      {/* ─── System Info Bar ──────────────────────────── */}
      {stats && (
        <GlassCard>
          <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Hostname: </span>
              <span className="font-medium text-[#134E4A]">
                {stats.hostname}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">OS: </span>
              <span className="font-medium text-[#134E4A]">{stats.os}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Uptime: </span>
              <span className="font-medium text-[#134E4A]">
                {metrics
                  ? formatUptime(metrics.uptimeSeconds)
                  : (/^\d+$/.test(stats.uptime) ? formatUptime(parseInt(stats.uptime, 10)) : stats.uptime)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Load: </span>
              <span className="font-medium text-[#134E4A]">
                {metrics
                  ? `${metrics.loadAvg.one} ${metrics.loadAvg.five} ${metrics.loadAvg.fifteen}`
                  : stats.loadAvg}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">CPU Cores: </span>
              <span className="font-medium text-[#134E4A]">
                {stats.cpuCount}
              </span>
            </div>
          </div>
        </GlassCard>
      )}

      {/* ─── Live Gauges ──────────────────────────────── */}
      {metrics && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {/* CPU */}
          <GlassCard className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-600">
              <Cpu className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">CPU</p>
              <p
                className={cn(
                  "text-2xl font-bold",
                  gaugeTextColor(metrics.cpu)
                )}
              >
                {metrics.cpu}%
              </p>
              <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    gaugeColor(metrics.cpu)
                  )}
                  style={{ width: `${Math.min(metrics.cpu, 100)}%` }}
                />
              </div>
            </div>
          </GlassCard>

          {/* RAM */}
          <GlassCard className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
              <MemoryStick className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">RAM</p>
              <p
                className={cn(
                  "text-2xl font-bold",
                  gaugeTextColor(metrics.ram.percent)
                )}
              >
                {metrics.ram.percent}%
              </p>
              <p className="text-xs text-muted-foreground">
                {(metrics.ram.used / 1024).toFixed(1)} /{" "}
                {(metrics.ram.total / 1024).toFixed(1)} GB
              </p>
              <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    gaugeColor(metrics.ram.percent)
                  )}
                  style={{
                    width: `${Math.min(metrics.ram.percent, 100)}%`,
                  }}
                />
              </div>
            </div>
          </GlassCard>

          {/* Disk */}
          <GlassCard className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <HardDrive className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">Disk</p>
              <p
                className={cn(
                  "text-2xl font-bold",
                  gaugeTextColor(metrics.disk.percent)
                )}
              >
                {metrics.disk.percent}%
              </p>
              <p className="text-xs text-muted-foreground">
                {metrics.disk.used} / {metrics.disk.total}
              </p>
              <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    gaugeColor(metrics.disk.percent)
                  )}
                  style={{
                    width: `${Math.min(metrics.disk.percent, 100)}%`,
                  }}
                />
              </div>
            </div>
          </GlassCard>

          {/* Network */}
          <GlassCard className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              <Network className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">Network</p>
              {netHistory.length > 0 ? (
                <>
                  <p className="text-lg font-bold text-emerald-600">
                    ↓ {netHistory[netHistory.length - 1].in} KB/s
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ↑ {netHistory[netHistory.length - 1].out} KB/s
                  </p>
                </>
              ) : (
                <p className="text-lg font-bold text-muted-foreground">
                  Measuring...
                </p>
              )}
            </div>
          </GlassCard>
        </div>
      )}

      {/* ─── Period Selector ───────────────────────────── */}
      <div className="flex items-center gap-1">
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => handlePeriodChange(p)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer",
              period === p
                ? "bg-teal-600 text-white"
                : "bg-white/60 text-gray-600 hover:bg-white/80 border border-gray-200"
            )}
          >
            {p === "live" ? "Live" : p.toUpperCase()}
          </button>
        ))}
        {historyLoading && (
          <Loader2 className="h-4 w-4 animate-spin text-teal-600 ml-2" />
        )}
      </div>

      {/* ─── Charts ───────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <GlassCard>
          <h3 className="mb-4 text-lg font-semibold text-[#134E4A]">
            CPU & RAM
          </h3>
          <div className="h-[250px] w-full">
            {(period === "live" ? cpuHistory : historyCpu).length < 2 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Collecting data...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={period === "live" ? cpuHistory : historyCpu}
                  margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="svCpuGrad"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#0D9488"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="#0D9488"
                        stopOpacity={0.05}
                      />
                    </linearGradient>
                    <linearGradient
                      id="svRamGrad"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#7C3AED"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="#7C3AED"
                        stopOpacity={0.05}
                      />
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
                    tickFormatter={(v) => {
                      if (period === "live") return v ? v.slice(0, 5) : v;
                      try { const d = new Date(v); return isNaN(d.getTime()) ? v : period === "7d" ? `${d.getDate()}/${d.getMonth()+1}` : `${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`; } catch { return v; }
                    }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#9CA3AF" }}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
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
                    fill="url(#svCpuGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="ram"
                    stroke="#7C3AED"
                    strokeWidth={2}
                    fill="url(#svRamGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className="mb-4 text-lg font-semibold text-[#134E4A]">
            Network Traffic
          </h3>
          <div className="h-[250px] w-full">
            {(period === "live" ? netHistory : historyNet).length < 2 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Collecting data...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={period === "live" ? netHistory : historyNet}
                  margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="svNetIn"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#0D9488"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="#0D9488"
                        stopOpacity={0.05}
                      />
                    </linearGradient>
                    <linearGradient
                      id="svNetOut"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#F59E0B"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="#F59E0B"
                        stopOpacity={0.05}
                      />
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
                    tickFormatter={(v) => {
                      if (period === "live") return v ? v.slice(0, 5) : v;
                      try { const d = new Date(v); return isNaN(d.getTime()) ? v : period === "7d" ? `${d.getDate()}/${d.getMonth()+1}` : `${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`; } catch { return v; }
                    }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#9CA3AF" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v} KB/s`}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value, name) => [
                      `${value} KB/s`,
                      name === "in" ? "Incoming" : "Outgoing",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="in"
                    stroke="#0D9488"
                    strokeWidth={2}
                    fill="url(#svNetIn)"
                  />
                  <Area
                    type="monotone"
                    dataKey="out"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    fill="url(#svNetOut)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </GlassCard>
      </div>

      {/* ─── Services ─────────────────────────────────── */}
      <GlassCard>
        <h3 className="mb-4 text-lg font-semibold text-[#134E4A]">Services</h3>
        {services.length === 0 ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
            <span className="ml-2 text-sm text-muted-foreground">
              Loading services...
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {services.map((service) => {
              const isRunning = service.STATE === "running";
              const isLoading = serviceLoading === service.name;
              return (
                <div
                  key={service.name}
                  className="flex items-center justify-between rounded-xl border border-white/30 bg-white/40 px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                        isRunning
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-red-100 text-red-500"
                      )}
                    >
                      {isRunning ? (
                        <Activity className="h-4 w-4" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#134E4A] truncate">
                        {service.name}
                      </p>
                      <p
                        className={cn(
                          "text-xs font-medium",
                          isRunning ? "text-emerald-600" : "text-red-500"
                        )}
                      >
                        {isRunning ? "Running" : service.STATE || "Stopped"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleServiceAction(service.name, "restart")
                          }
                          title="Restart"
                          className="h-7 w-7 p-0"
                        >
                          <RotateCcw className="h-3.5 w-3.5 text-amber-500" />
                        </Button>
                        {isRunning ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleServiceAction(service.name, "stop")
                            }
                            title="Stop"
                            className="h-7 w-7 p-0"
                          >
                            <Square className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleServiceAction(service.name, "start")
                            }
                            title="Start"
                            className="h-7 w-7 p-0"
                          >
                            <Play className="h-3.5 w-3.5 text-emerald-500" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>

      {/* ─── Top Processes ────────────────────────────── */}
      {metrics && metrics.topProcesses.length > 0 && (
        <GlassCard>
          <h3 className="mb-4 text-lg font-semibold text-[#134E4A]">
            Top Processes
          </h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>PID</TableHead>
                <TableHead>CPU %</TableHead>
                <TableHead>MEM %</TableHead>
                <TableHead>Command</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.topProcesses.map((proc, i) => (
                <TableRow key={`${proc.pid}-${i}`}>
                  <TableCell className="font-mono text-xs">
                    {proc.user}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {proc.pid}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "font-medium",
                        proc.cpu > 50
                          ? "text-red-600"
                          : proc.cpu > 20
                            ? "text-amber-600"
                            : "text-[#134E4A]"
                      )}
                    >
                      {proc.cpu}%
                    </span>
                  </TableCell>
                  <TableCell className="text-[#134E4A]">
                    {proc.mem}%
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate font-mono text-xs text-muted-foreground">
                    {proc.command}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </GlassCard>
      )}

      {/* ─── Stop Confirm Dialog ──────────────────────── */}
      <Dialog
        open={!!confirmDialog}
        onOpenChange={() => setConfirmDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stop Service</DialogTitle>
            <DialogDescription>
              Are you sure you want to stop{" "}
              <strong>{confirmDialog?.name}</strong>? This may affect your
              server&apos;s functionality.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() =>
                confirmDialog &&
                executeServiceAction(confirmDialog.name, confirmDialog.action)
              }
            >
              Stop Service
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
