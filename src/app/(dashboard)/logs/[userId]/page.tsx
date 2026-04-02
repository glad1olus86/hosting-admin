"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Activity,
  LogIn,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  Monitor,
  Smartphone,
  Tablet,
  MapPin,
  Globe,
} from "lucide-react";
import { GlassCard } from "@/components/layout/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ── Types ──────────────────────────────────────────────────
interface ActionLog {
  id: number;
  username: string;
  action: string;
  target: string | null;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
}

interface SessionLog {
  id: number;
  username: string;
  ipAddress: string | null;
  browser: string | null;
  os: string | null;
  device: string | null;
  country: string | null;
  city: string | null;
  isp: string | null;
  createdAt: string;
}

interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}

// ── Helpers ────────────────────────────────────────────────
function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);

  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    return `${hours}h ago, ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago, ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }
  return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function actionColor(action: string): string {
  if (action.includes("create") || action.includes("add")) return "bg-green-100 text-green-700";
  if (action.includes("delete") || action.includes("remove")) return "bg-red-100 text-red-700";
  if (action.includes("suspend")) return "bg-amber-100 text-amber-700";
  if (action.includes("ssl") || action.includes("request")) return "bg-blue-100 text-blue-700";
  return "bg-gray-100 text-gray-700";
}

function DeviceIcon({ device }: { device: string | null }) {
  if (device === "Mobile") return <Smartphone className="h-4 w-4" />;
  if (device === "Tablet") return <Tablet className="h-4 w-4" />;
  return <Monitor className="h-4 w-4" />;
}

// ── Pagination ─────────────────────────────────────────────
function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 pt-4">
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm text-muted-foreground">
        {page} / {totalPages}
      </span>
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────
export default function UserLogsPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const [tab, setTab] = useState<"actions" | "sessions">("actions");
  const [username, setUsername] = useState("");

  // Actions state
  const [actions, setActions] = useState<PagedResult<ActionLog>>({
    items: [],
    total: 0,
    page: 1,
    totalPages: 0,
  });
  const [actionsLoading, setActionsLoading] = useState(true);
  const [actionsSearch, setActionsSearch] = useState("");
  const [actionsPage, setActionsPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");

  // Sessions state
  const [sessions, setSessions] = useState<PagedResult<SessionLog>>({
    items: [],
    total: 0,
    page: 1,
    totalPages: 0,
  });
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsSearch, setSessionsSearch] = useState("");
  const [sessionsPage, setSessionsPage] = useState(1);

  // Fetch actions
  const fetchActions = useCallback(() => {
    setActionsLoading(true);
    const params = new URLSearchParams({
      accountId: userId,
      page: actionsPage.toString(),
      limit: "50",
    });
    if (actionsSearch) params.set("search", actionsSearch);
    if (actionFilter) params.set("action", actionFilter);

    fetch(`/api/logs/actions?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.items) {
          setActions(data);
          if (data.items.length > 0 && !username) {
            setUsername(data.items[0].username);
          }
        }
      })
      .finally(() => setActionsLoading(false));
  }, [userId, actionsPage, actionsSearch, actionFilter, username]);

  // Fetch sessions
  const fetchSessions = useCallback(() => {
    setSessionsLoading(true);
    const params = new URLSearchParams({
      accountId: userId,
      page: sessionsPage.toString(),
      limit: "50",
    });
    if (sessionsSearch) params.set("search", sessionsSearch);

    fetch(`/api/logs/sessions?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.items) {
          setSessions(data);
          if (data.items.length > 0 && !username) {
            setUsername(data.items[0].username);
          }
        }
      })
      .finally(() => setSessionsLoading(false));
  }, [userId, sessionsPage, sessionsSearch, username]);

  useEffect(() => {
    if (tab === "actions") fetchActions();
  }, [tab, fetchActions]);

  useEffect(() => {
    if (tab === "sessions") fetchSessions();
  }, [tab, fetchSessions]);

  // Debounced search
  useEffect(() => {
    setActionsPage(1);
  }, [actionsSearch, actionFilter]);

  useEffect(() => {
    setSessionsPage(1);
  }, [sessionsSearch]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 cursor-pointer"
          onClick={() => router.push("/logs")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {username || "User"}&apos;s Logs
          </h1>
          <p className="text-muted-foreground">
            Activity and login history
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Button
          variant={tab === "actions" ? "default" : "outline"}
          className={
            tab === "actions"
              ? "bg-teal-600 hover:bg-teal-700 cursor-pointer"
              : "cursor-pointer"
          }
          onClick={() => setTab("actions")}
        >
          <Activity className="h-4 w-4 mr-2" />
          Actions
          <Badge variant="secondary" className="ml-2 text-xs">
            {actions.total}
          </Badge>
        </Button>
        <Button
          variant={tab === "sessions" ? "default" : "outline"}
          className={
            tab === "sessions"
              ? "bg-teal-600 hover:bg-teal-700 cursor-pointer"
              : "cursor-pointer"
          }
          onClick={() => setTab("sessions")}
        >
          <LogIn className="h-4 w-4 mr-2" />
          Sessions
          <Badge variant="secondary" className="ml-2 text-xs">
            {sessions.total}
          </Badge>
        </Button>
      </div>

      {/* Content */}
      <GlassCard>
        <div className="p-6">
          {tab === "actions" ? (
            <>
              {/* Actions Filters */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search target or details..."
                    className="pl-9"
                    value={actionsSearch}
                    onChange={(e) => setActionsSearch(e.target.value)}
                  />
                </div>
                <Input
                  placeholder="Filter action (e.g. domain)"
                  className="max-w-[200px]"
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                />
              </div>

              {actionsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
                </div>
              ) : actions.items.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No actions found
                </div>
              ) : (
                <>
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="w-[180px]">Time</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Target</TableHead>
                          <TableHead>Details</TableHead>
                          <TableHead>IP</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {actions.items.map((a) => (
                          <TableRow key={a.id}>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                              {formatDate(a.createdAt)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={`${actionColor(a.action)} font-mono text-xs`}
                              >
                                {a.action}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium text-sm max-w-[200px] truncate">
                              {a.target || "—"}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                              {a.details ? (() => {
                                try {
                                  const obj = JSON.parse(a.details!);
                                  return Object.entries(obj)
                                    .filter(([, v]) => v != null)
                                    .map(([k, v]) => `${k}=${v}`)
                                    .join(", ");
                                } catch {
                                  return a.details;
                                }
                              })() : "—"}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {a.ipAddress || "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <Pagination
                    page={actions.page}
                    totalPages={actions.totalPages}
                    onPage={setActionsPage}
                  />
                </>
              )}
            </>
          ) : (
            <>
              {/* Sessions Filters */}
              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search IP, location, browser..."
                    className="pl-9"
                    value={sessionsSearch}
                    onChange={(e) => setSessionsSearch(e.target.value)}
                  />
                </div>
              </div>

              {sessionsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
                </div>
              ) : sessions.items.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No sessions found
                </div>
              ) : (
                <>
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="w-[180px]">Time</TableHead>
                          <TableHead>IP</TableHead>
                          <TableHead>Browser</TableHead>
                          <TableHead>OS</TableHead>
                          <TableHead>Device</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>ISP</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sessions.items.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                              {formatDate(s.createdAt)}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {s.ipAddress || "—"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {s.browser ? (
                                <div className="flex items-center gap-1.5">
                                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                                  {s.browser}
                                </div>
                              ) : "—"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {s.os || "—"}
                            </TableCell>
                            <TableCell>
                              {s.device ? (
                                <div className="flex items-center gap-1.5 text-sm">
                                  <DeviceIcon device={s.device} />
                                  {s.device}
                                </div>
                              ) : "—"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {s.city || s.country ? (
                                <div className="flex items-center gap-1.5">
                                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                  {[s.city, s.country]
                                    .filter(Boolean)
                                    .join(", ")}
                                </div>
                              ) : "—"}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                              {s.isp || "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <Pagination
                    page={sessions.page}
                    totalPages={sessions.totalPages}
                    onPage={setSessionsPage}
                  />
                </>
              )}
            </>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
