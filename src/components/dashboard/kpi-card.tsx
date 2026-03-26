import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/layout/glass-card";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color?: "teal" | "violet" | "amber" | "emerald";
}

const colorMap = {
  teal: {
    bg: "bg-gradient-to-br from-teal-100 to-teal-50",
    icon: "text-teal-600",
  },
  violet: {
    bg: "bg-gradient-to-br from-violet-100 to-violet-50",
    icon: "text-violet-600",
  },
  amber: {
    bg: "bg-gradient-to-br from-amber-100 to-amber-50",
    icon: "text-amber-600",
  },
  emerald: {
    bg: "bg-gradient-to-br from-emerald-100 to-emerald-50",
    icon: "text-emerald-600",
  },
};

export function KpiCard({
  title,
  value,
  subtitle,
  icon,
  color = "teal",
}: KpiCardProps) {
  const colors = colorMap[color];

  return (
    <GlassCard className="flex items-start gap-4">
      <div
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
          colors.bg
        )}
      >
        <span className={cn("h-6 w-6", colors.icon)}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-3xl font-bold text-[#134E4A]">{value}</p>
        {subtitle && (
          <p className="mt-0.5 text-xs text-muted-foreground/70">{subtitle}</p>
        )}
      </div>
    </GlassCard>
  );
}
