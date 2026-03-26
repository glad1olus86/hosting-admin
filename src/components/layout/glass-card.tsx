import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

export function GlassCard({ children, className }: GlassCardProps) {
  return (
    <div
      className={cn(
        "bg-white/70 backdrop-blur-xl border border-white/30 rounded-2xl shadow-lg p-6",
        className
      )}
    >
      {children}
    </div>
  );
}
