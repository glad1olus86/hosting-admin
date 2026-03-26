"use client";

import { useEffect, useState, useCallback } from "react";
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
import { CpuChart } from "@/components/dashboard/cpu-chart";
import { ServiceStatus } from "@/components/dashboard/service-status";
import { GlassCard } from "@/components/layout/glass-card";
import { Button } from "@/components/ui/button";

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

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    fetchStats();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const formatDisk = (mb: number) => {
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
    return `${mb} MB`;
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
          subtitle={`${stats?.cpuCount ?? 0} cores · ${stats?.uptime ?? ""}`}
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
              <span className="font-medium text-[#134E4A]">{stats.uptime}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Load: </span>
              <span className="font-medium text-[#134E4A]">{stats.loadAvg}</span>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Service Status - now from API */}
      <ServiceStatus />
    </div>
  );
}
