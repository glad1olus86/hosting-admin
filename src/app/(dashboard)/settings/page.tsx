import { GlassCard } from "@/components/layout/glass-card";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#134E4A]">Настройки</h1>
      <GlassCard>
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-teal-100 flex items-center justify-center">
            <Settings className="w-8 h-8 text-teal-600" />
          </div>
          <h2 className="text-xl font-semibold text-[#134E4A]">Настройки</h2>
          <p className="text-muted-foreground">Этот раздел находится в разработке</p>
        </div>
      </GlassCard>
    </div>
  );
}
