"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Globe,
  FolderOpen,
  Database,
  Mail,
  Waypoints,
  ShieldCheck,
  HardDrive,
  Upload,
  Server,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: "Hosting",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Users", href: "/users", icon: Users },
      { label: "Domains", href: "/domains", icon: Globe },
      { label: "Files", href: "/files", icon: FolderOpen },
      { label: "Databases", href: "/databases", icon: Database },
      { label: "Mail", href: "/mail", icon: Mail },
      { label: "DNS", href: "/dns", icon: Waypoints },
      { label: "SSL", href: "/ssl", icon: ShieldCheck },
      { label: "Backups", href: "/backups", icon: HardDrive },
      { label: "FTP", href: "/ftp", icon: Upload },
    ],
  },
  {
    title: "Server",
    items: [
      { label: "Server", href: "/server", icon: Server },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col bg-white/60 backdrop-blur-2xl border-r border-white/20">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 shadow-sm">
          <Server className="h-4 w-4 text-white" />
        </div>
        <span className="bg-gradient-to-r from-teal-600 to-teal-500 bg-clip-text text-lg font-bold tracking-tight text-transparent">
          HostPanel
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navGroups.map((group) => (
          <div key={group.title} className="mb-6">
            <h3 className="mb-2 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {group.title}
            </h3>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                const Icon = item.icon;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-teal-500/10 text-teal-700 shadow-sm"
                          : "text-foreground/70 hover:bg-teal-50 hover:text-foreground"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-[18px] w-[18px] shrink-0",
                          isActive
                            ? "text-teal-600"
                            : "text-muted-foreground"
                        )}
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/20 px-4 py-3">
        <p className="text-[11px] text-muted-foreground/60 text-center">
          HostPanel v1.0
        </p>
      </div>
    </aside>
  );
}
