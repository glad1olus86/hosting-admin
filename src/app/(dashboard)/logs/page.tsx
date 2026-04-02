"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ScrollText,
  Loader2,
  Search,
  Activity,
  LogIn,
  ChevronRight,
} from "lucide-react";
import { GlassCard } from "@/components/layout/glass-card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface UserLogSummary {
  accountId: number;
  username: string;
  actionCount: number;
  lastAction: string | null;
  loginCount: number;
  lastLogin: string | null;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function LogsPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserLogSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/logs")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setUsers(data);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground">
            Activity and login history for all users
          </p>
        </div>
      </div>

      <GlassCard>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <ScrollText className="h-5 w-5 text-teal-600" />
            <h2 className="text-lg font-semibold">Users</h2>
          </div>

          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {search ? "No users found" : "No logs yet"}
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>User</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                    <TableHead>Last Action</TableHead>
                    <TableHead className="text-center">Sessions</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u) => (
                    <TableRow
                      key={u.accountId}
                      className="cursor-pointer hover:bg-teal-50/50 transition-colors"
                      onClick={() => router.push(`/logs/${u.accountId}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 text-[10px] font-bold text-white">
                            {u.username.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-medium">{u.username}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Activity className="h-3.5 w-3.5 text-blue-500" />
                          <span className="font-mono text-sm">
                            {u.actionCount}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {timeAgo(u.lastAction)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <LogIn className="h-3.5 w-3.5 text-green-500" />
                          <span className="font-mono text-sm">
                            {u.loginCount}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {timeAgo(u.lastLogin)}
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
