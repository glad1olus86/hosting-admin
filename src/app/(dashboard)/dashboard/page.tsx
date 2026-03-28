"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Users,
  Globe,
  HardDrive,
  Cpu,
  Loader2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { CpuChart, type DataPoint } from "@/components/dashboard/cpu-chart";
import { ServiceStatus } from "@/components/dashboard/service-status";
import { GlassCard } from "@/components/layout/glass-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Stats {
  users: number;
  domains: number;
  diskUsed: number;
  bandwidth: number;
  hostname: string;
  os: string;
  cpuCount: number;
  uptime: string;
  loadAvg: string;
  packages: number;
}

const PERIODS = ["live", "1h", "6h", "24h", "7d"] as const;
type Period = (typeof PERIODS)[number];

const MAX_LIVE_POINTS = 30;

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [period, setPeriod] = useState<Period>("live");
  const [liveData, setLiveData] = useState<DataPoint[]>([]);
  const [historyData, setHistoryData] = useState<DataPoint[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const metricsInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/stats");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setStats(data);
    } catch (err: any) {
      setError(err.message || "Failed to load stats");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch("/api/metrics");
      if (!res.ok) return;
      const data = await res.json();
      if (data.error) return;

      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
      const point: DataPoint = { time: timeStr, cpu: data.cpu, ram: data.ram.percent };

      setLiveData((prev) => {
        const next = [...prev, point];
        return next.length > MAX_LIVE_POINTS ? next.slice(-MAX_LIVE_POINTS) : next;
      });

      // Append to history view if active
      if (period !== "live") {
        setHistoryData((prev) => [...prev, { time: new Date().toISOString(), cpu: data.cpu, ram: data.ram.percent }]);
      }
    } catch {
      // Non-critical
    }
  }, [period]);

  const fetchHistory = useCallback(async (p: Period) => {
    if (p === "live") return;
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/metrics/history?period=${p}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.points) {
        setHistoryData(data.points.map((pt: any) => ({
          time: pt.time,
          cpu: pt.cpu,
          ram: pt.ram,
        })));
      }
    } catch {
      // Non-critical
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // Seed live chart with last 5 minutes from DB
  const seedLiveData = useCallback(async () => {
    try {
      const res = await fetch("/api/metrics/history?period=5m");
      if (!res.ok) return;
      const data = await res.json();
      if (data.points && data.points.length > 0) {
        const seeded: DataPoint[] = data.points.map((pt: any) => {
          const d = new Date(pt.time);
          const timeStr = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
          return { time: timeStr, cpu: pt.cpu, ram: pt.ram };
        });
        setLiveData(seeded);
      }
    } catch {}
  }, []);

  const handlePeriodChange = useCallback((p: Period) => {
    setPeriod(p);
    if (p !== "live") {
      fetchHistory(p);
    }
  }, [fetchHistory]);

  useEffect(() => {
    fetchStats();
    fetchMetrics();
    seedLiveData();

    const statsInterval = setInterval(fetchStats, 30000);
    metricsInterval.current = setInterval(fetchMetrics, 10000);

    return () => {
      clearInterval(statsInterval);
      if (metricsInterval.current) clearInterval(metricsInterval.current);
    };
  }, [fetchStats, fetchMetrics, seedLiveData]);

  const chartData = period === "live" ? liveData : historyData;

  const formatDisk = (mb: number) => {
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
    return `${mb} MB`;
  };

  const formatUptime = (uptime: string) => {
    const sec = parseInt(uptime, 10);
    if (!isNaN(sec) && String(sec) === uptime.trim()) {
      const days = Math.floor(sec / 86400);
      const hours = Math.floor((sec % 86400) / 3600);
      const mins = Math.floor((sec % 3600) / 60);
      if (days > 0) return `${days}d ${hours}h ${mins}m`;
      if (hours > 0) return `${hours}h ${mins}m`;
      return `${mins}m`;
    }
    return uptime;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        <span className="ml-3 text-muted-foreground">Loading dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[#134E4A]">Dashboard</h1>
        <GlassCard className="border-red-200 bg-red-50/70">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-red-700">Connection Error</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
              <p className="text-xs text-red-500 mt-2">
                Check that HESTIA_HOST, HESTIA_USER, and HESTIA_PASSWORD environment
                variables are correct in docker-compose.yml
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 border-red-200 text-red-600 hover:bg-red-50"
                onClick={() => {
                  setLoading(true);
                  fetchStats();
                }}
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </Button>
            </div>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#134E4A]">Dashboard</h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchStats()}
          className="text-muted-foreground"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Users"
          value={stats?.users ?? 0}
          subtitle={`${stats?.packages ?? 0} packages available`}
          icon={<Users className="h-6 w-6" />}
          color="teal"
        />
        <KpiCard
          title="Domains"
          value={stats?.domains ?? 0}
          subtitle="web domains total"
          icon={<Globe className="h-6 w-6" />}
          color="violet"
        />
        <KpiCard
          title="Disk Usage"
          value={formatDisk(stats?.diskUsed ?? 0)}
          subtitle="total across all users"
          icon={<HardDrive className="h-6 w-6" />}
          color="amber"
        />
        <KpiCard
          title="CPU"
          value={stats?.loadAvg ? stats.loadAvg.split(" ")[0] : "N/A"}
          subtitle={`${stats?.cpuCount ?? 0} cores · ${stats?.uptime ? formatUptime(stats.uptime) : ""}`}
          icon={<Cpu className="h-6 w-6" />}
          color="emerald"
        />
      </div>

      {/* System Info */}
      {stats?.hostname && (
        <GlassCard>
          <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Hostname: </span>
              <span className="font-medium text-[#134E4A]">{stats.hostname}</span>
            </div>
            <div>
              <span className="text-muted-foreground">OS: </span>
              <span className="font-medium text-[#134E4A]">{stats.os}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Uptime: </span>
              <span className="font-medium text-[#134E4A]">{formatUptime(stats.uptime)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Load: </span>
              <span className="font-medium text-[#134E4A]">{stats.loadAvg}</span>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Period Selector + Chart */}
      <div className="space-y-0">
        <div className="flex items-center gap-1 mb-3">
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
        <CpuChart data={chartData} period={period} />
      </div>

      {/* Service Status */}
      <ServiceStatus />
    </div>
  );
}
