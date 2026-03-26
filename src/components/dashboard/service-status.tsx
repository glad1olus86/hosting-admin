"use client";

import { useEffect, useState } from "react";
import { Activity, XCircle, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/layout/glass-card";
import { cn } from "@/lib/utils";

interface Service {
  name: string;
  STATE?: string;
  CPU?: string;
  MEM?: string;
}

export function ServiceStatus() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/services")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setServices(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <GlassCard>
        <h3 className="mb-4 text-lg font-semibold text-[#134E4A]">Services</h3>
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
          <span className="ml-2 text-sm text-muted-foreground">Loading services...</span>
        </div>
      </GlassCard>
    );
  }

  if (services.length === 0) {
    return (
      <GlassCard>
        <h3 className="mb-4 text-lg font-semibold text-[#134E4A]">Services</h3>
        <p className="text-sm text-muted-foreground">Unable to load service status.</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <h3 className="mb-4 text-lg font-semibold text-[#134E4A]">Services</h3>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {services.map((service) => {
          const isRunning = service.STATE === "running";
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
                  {isRunning ? "Running" : service.STATE || "Stopped"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
