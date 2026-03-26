import { Activity, XCircle } from "lucide-react";
import { GlassCard } from "@/components/layout/glass-card";
import { cn } from "@/lib/utils";

interface Service {
  name: string;
  status: "running" | "stopped";
}

const services: Service[] = [
  { name: "Nginx", status: "running" },
  { name: "Apache", status: "running" },
  { name: "MariaDB", status: "running" },
  { name: "Exim (Mail)", status: "running" },
  { name: "Dovecot", status: "running" },
  { name: "BIND (DNS)", status: "running" },
  { name: "PHP-FPM", status: "running" },
  { name: "Fail2Ban", status: "running" },
];

export function ServiceStatus() {
  return (
    <GlassCard>
      <h3 className="mb-4 text-lg font-semibold text-[#134E4A]">Services</h3>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {services.map((service) => {
          const isRunning = service.status === "running";
          return (
            <div
              key={service.name}
              className="flex items-center gap-3 rounded-xl border border-white/30 bg-white/40 px-4 py-3"
            >
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
                  {isRunning ? "Running" : "Stopped"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
