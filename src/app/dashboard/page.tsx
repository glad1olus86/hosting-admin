import {
  Users,
  Globe,
  HardDrive,
  Cpu,
} from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { CpuChart } from "@/components/dashboard/cpu-chart";
import { ServiceStatus } from "@/components/dashboard/service-status";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#134E4A]">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Active Users"
          value={24}
          subtitle="3 created this week"
          icon={<Users className="h-6 w-6" />}
          trend={{ value: 12, positive: true }}
          color="teal"
        />
        <KpiCard
          title="Domains"
          value={87}
          subtitle="5 pending SSL"
          icon={<Globe className="h-6 w-6" />}
          trend={{ value: 8, positive: true }}
          color="violet"
        />
        <KpiCard
          title="Disk Usage"
          value="142 GB"
          subtitle="of 500 GB"
          icon={<HardDrive className="h-6 w-6" />}
          trend={{ value: 3, positive: false }}
          color="amber"
        />
        <KpiCard
          title="CPU Load"
          value="23%"
          subtitle="4 cores available"
          icon={<Cpu className="h-6 w-6" />}
          trend={{ value: 5, positive: true }}
          color="emerald"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CpuChart />
        <CpuChart />
      </div>

      {/* Service Status */}
      <ServiceStatus />
    </div>
  );
}
