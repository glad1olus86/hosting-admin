"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Plus,
  Trash2,
  ShieldCheck,
  ShieldOff,
  Loader2,
  Zap,
  Eye,
  EyeOff,
  Copy,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Settings,
  Search,
  Globe,
  HardDrive,
  ArrowUpRight,
  Ban,
  PlayCircle,
  Lock,
  Unlink,
  Link,
  FolderOpen,
} from "lucide-react";
import { GlassCard } from "@/components/layout/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface HestiaDomain {
  domain: string;
  user: string;
  IP: string;
  IP6: string;
  U_DISK: string;
  U_BANDWIDTH: string;
  SSL: string;
  SSL_HOME: string;
  SSL_EXPIRE: string;
  SSL_ISSUER: string;
  LETSENCRYPT: string;
  BACKEND: string;
  PROXY: string;
  PROXY_EXT: string;
  TPL: string;
  ALIAS: string;
  REDIRECT: string;
  REDIRECT_CODE: string;
  SUSPENDED: string;
  DATE: string;
  TIME: string;
  AUTH_USER: string;
  DOCROOT: string;
  FTP_USER: string;
  FTP_PATH: string;
}

interface HestiaUser {
  username: string;
}

interface ServerIp {
  ip: string;
  name: string;
  status: string;
  domains: number;
}

interface Templates {
  backend: string[];
  web: string[];
  proxy: string[];
}

const SETTINGS_TABS = ["General", "PHP & Templates", "Redirects", "Aliases", "Security", "Advanced"] as const;
type SettingsTab = (typeof SETTINGS_TABS)[number];

export default function DomainsPage() {
  const [domains, setDomains] = useState<HestiaDomain[]>([]);
  const [users, setUsers] = useState<HestiaUser[]>([]);
  const [serverIps, setServerIps] = useState<ServerIp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // SSL loading
  const [sslLoading, setSslLoading] = useState<Set<string>>(new Set());

  // Add domain dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addForm, setAddForm] = useState({ user: "", domain: "", ip: "", ssl: false });
  const [addLoading, setAddLoading] = useState(false);

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ user: string; domain: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // WordPress
  const [wpDialogOpen, setWpDialogOpen] = useState(false);
  const [wpTarget, setWpTarget] = useState<{ user: string; domain: string } | null>(null);
  const [wpForm, setWpForm] = useState({ admin_user: "admin", admin_password: "", admin_email: "", plugins: ["updraftplus"] });
  const [showWpPassword, setShowWpPassword] = useState(false);
  const [wpJobId, setWpJobId] = useState<string | null>(null);
  const [wpStatus, setWpStatus] = useState<{ step: number; totalSteps: number; message: string; status: string; result?: any; error?: string } | null>(null);

  // Domain Settings Sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetDomain, setSheetDomain] = useState<HestiaDomain | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>("General");
  const [templates, setTemplates] = useState<Templates | null>(null);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Sheet form states
  const [newAlias, setNewAlias] = useState("");
  const [newRedirectUrl, setNewRedirectUrl] = useState("");
  const [newRedirectCode, setNewRedirectCode] = useState("301");
  const [newAuthUser, setNewAuthUser] = useState("");
  const [newAuthPass, setNewAuthPass] = useState("");
  const [httpAuthUsers, setHttpAuthUsers] = useState<any[]>([]);

  // ── Data Fetching ──

  const fetchDomains = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/domains");
      if (!res.ok) throw new Error("Failed to fetch domains");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDomains(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch domains");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      if (!res.ok) return;
      const data = await res.json();
      if (!data.error) setUsers(data);
    } catch {}
  }, []);

  const fetchIps = useCallback(async () => {
    try {
      const res = await fetch("/api/ips");
      if (!res.ok) return;
      const data = await res.json();
      if (!data.error) setServerIps(data);
    } catch {}
  }, []);

  const fetchTemplates = useCallback(async () => {
    if (templatesLoaded) return;
    try {
      const res = await fetch("/api/domains/templates");
      if (!res.ok) return;
      const data = await res.json();
      if (!data.error) {
        setTemplates(data);
        setTemplatesLoaded(true);
      }
    } catch {}
  }, [templatesLoaded]);

  useEffect(() => {
    fetchDomains();
    fetchUsers();
    fetchIps();
  }, [fetchDomains, fetchUsers, fetchIps]);

  // ── Domain Actions ──

  const domainAction = useCallback(async (domain: string, user: string, action: string, params: Record<string, string> = {}) => {
    setActionLoading(action);
    try {
      const res = await fetch(`/api/domains/${encodeURIComponent(domain)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, action, ...params }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Action failed");
      await fetchDomains();
      // Update sheet domain data
      const updated = await fetch(`/api/domains/${encodeURIComponent(domain)}?user=${encodeURIComponent(user)}`);
      const updatedData = await updated.json();
      if (updated.ok && !updatedData.error) {
        setSheetDomain(updatedData);
        if (updatedData.httpAuthUsers) setHttpAuthUsers(updatedData.httpAuthUsers);
      }
      return true;
    } catch (err: any) {
      alert(err.message || "Action failed");
      return false;
    } finally {
      setActionLoading(null);
    }
  }, [fetchDomains]);

  const requestSsl = useCallback(async (user: string, domain: string) => {
    const key = `${user}:${domain}`;
    setSslLoading((prev) => new Set(prev).add(key));
    try {
      const res = await fetch("/api/domains", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, domain }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        alert(`SSL error for ${domain}: ${data.error || "Unknown error"}`);
      }
      await fetchDomains();
    } catch (err: any) {
      alert(`SSL request failed: ${err.message}`);
    } finally {
      setSslLoading((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }, [fetchDomains]);

  // ── Open Settings Sheet ──

  const openSettings = useCallback(async (d: HestiaDomain) => {
    setSheetDomain(d);
    setActiveTab("General");
    setNewAlias("");
    setNewRedirectUrl("");
    setNewRedirectCode("301");
    setNewAuthUser("");
    setNewAuthPass("");
    setHttpAuthUsers([]);
    setSheetOpen(true);
    fetchTemplates();

    // Fetch detailed domain data including httpauth
    try {
      const res = await fetch(`/api/domains/${encodeURIComponent(d.domain)}?user=${encodeURIComponent(d.user)}`);
      const data = await res.json();
      if (res.ok && !data.error) {
        setSheetDomain(data);
        if (data.httpAuthUsers) setHttpAuthUsers(data.httpAuthUsers);
      }
    } catch {}
  }, [fetchTemplates]);

  // ── Handlers ──

  const handleAddDomain = async () => {
    if (!addForm.user || !addForm.domain) return;
    setAddLoading(true);
    try {
      const res = await fetch("/api/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: addForm.user, domain: addForm.domain, ip: addForm.ip || undefined }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to add domain");
      const wantSsl = addForm.ssl;
      const domainUser = addForm.user;
      const domainName = addForm.domain;
      setAddDialogOpen(false);
      setAddForm({ user: "", domain: "", ip: "", ssl: false });
      await fetchDomains();
      if (wantSsl) requestSsl(domainUser, domainName);
    } catch (err: any) {
      alert(err.message || "Failed to add domain");
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeleteDomain = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(
        `/api/domains?user=${encodeURIComponent(deleteTarget.user)}&domain=${encodeURIComponent(deleteTarget.domain)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to delete domain");
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      setSheetOpen(false);
      await fetchDomains();
    } catch (err: any) {
      alert(err.message || "Failed to delete domain");
    } finally {
      setDeleteLoading(false);
    }
  };

  // WordPress
  useEffect(() => {
    if (!wpJobId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/wordpress/status?jobId=${wpJobId}`);
        const data = await res.json();
        if (data.error && res.status === 404) return;
        setWpStatus(data);
        if (data.status === "done" || data.status === "error") clearInterval(interval);
      } catch {}
    }, 2000);
    return () => clearInterval(interval);
  }, [wpJobId]);

  const handleWpInstall = async () => {
    if (!wpTarget || !wpForm.admin_user || !wpForm.admin_password || !wpForm.admin_email) return;
    try {
      const res = await fetch("/api/wordpress/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: wpTarget.user, domain: wpTarget.domain, ...wpForm }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to start install");
      setWpJobId(data.jobId);
      setWpStatus({ step: 0, totalSteps: 7, message: "Starting...", status: "installing" });
    } catch (err: any) {
      setWpStatus({ step: 0, totalSteps: 7, message: err.message, status: "error", error: err.message });
    }
  };

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let pwd = "";
    for (let i = 0; i < 16; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
    return pwd;
  };

  const togglePlugin = (slug: string) => {
    setWpForm((f) => ({
      ...f,
      plugins: f.plugins.includes(slug) ? f.plugins.filter((p) => p !== slug) : [...f.plugins, slug],
    }));
  };

  const wpPluginsList = [
    { slug: "updraftplus", name: "UpdraftPlus", desc: "Backup & restore" },
    { slug: "woocommerce", name: "WooCommerce", desc: "E-commerce" },
    { slug: "wordpress-seo", name: "Yoast SEO", desc: "SEO optimization" },
    { slug: "contact-form-7", name: "Contact Form 7", desc: "Forms" },
  ];

  // ── Helpers ──

  const formatDisk = (mb: string) => {
    const v = parseInt(mb || "0", 10);
    if (v >= 1024) return `${(v / 1024).toFixed(1)} GB`;
    return `${v} MB`;
  };

  const phpVersion = (backend: string) => {
    if (!backend) return "N/A";
    // "PHP-8.2" -> "8.2", "PHP-7.4" -> "7.4"
    return backend.replace(/^PHP-?/i, "").replace(/_/g, ".");
  };

  const aliases = (d: HestiaDomain) => {
    const a = d.ALIAS || "";
    return a.split(",").map((s) => s.trim()).filter(Boolean);
  };

  const filteredDomains = search
    ? domains.filter((d) =>
        d.domain.toLowerCase().includes(search.toLowerCase()) ||
        d.user.toLowerCase().includes(search.toLowerCase())
      )
    : domains;

  // ── Render ──

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        <span className="ml-3 text-muted-foreground">Loading domains...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#134E4A]">Domains</h1>
        <Button
          className="bg-teal-600 text-white hover:bg-teal-700 cursor-pointer"
          onClick={() => setAddDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Add Domain
        </Button>
      </div>

      {error && (
        <GlassCard className="border-red-200 bg-red-50/70">
          <p className="text-sm text-red-600">{error}</p>
        </GlassCard>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search domains or users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-white/70 border-slate-200"
        />
      </div>

      {/* Domains Table */}
      <GlassCard>
        {domains.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">No domains found.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Domain</TableHead>
                <TableHead>User</TableHead>
                <TableHead>PHP</TableHead>
                <TableHead>SSL</TableHead>
                <TableHead>Disk</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDomains.map((d) => {
                const hasSSL = d.SSL !== "" && d.SSL !== "no";
                const isSuspended = d.SUSPENDED !== "no";
                const sslKey = `${d.user}:${d.domain}`;
                const isGettingSsl = sslLoading.has(sslKey);

                return (
                  <TableRow
                    key={`${d.user}-${d.domain}`}
                    className="cursor-pointer hover:bg-teal-50/50 transition-colors"
                    onClick={() => openSettings(d)}
                  >
                    <TableCell className="font-medium text-[#134E4A]">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-teal-600 shrink-0" />
                        {d.domain}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{d.user}</TableCell>
                    <TableCell>
                      <Badge className="bg-blue-100 text-blue-700 border-blue-200 font-mono text-[11px]">
                        {phpVersion(d.BACKEND)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {isGettingSsl ? (
                        <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                      ) : hasSSL ? (
                        <Tooltip>
                          <TooltipTrigger>
                            <ShieldCheck className="h-4 w-4 text-emerald-500" />
                          </TooltipTrigger>
                          <TooltipContent>
                            SSL active{d.LETSENCRYPT === "yes" ? " (Let's Encrypt)" : ""}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <ShieldOff className="h-4 w-4 text-gray-300" />
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDisk(d.U_DISK)}
                    </TableCell>
                    <TableCell>
                      {isSuspended ? (
                        <Badge className="bg-red-100 text-red-700 border-red-200">Suspended</Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="cursor-pointer h-8 w-8 p-0"
                          title="Domain Settings"
                          onClick={() => openSettings(d)}
                        >
                          <Settings className="h-4 w-4 text-slate-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="cursor-pointer h-8 w-8 p-0"
                          title="WordPress Quick Install"
                          onClick={() => {
                            setWpTarget({ user: d.user, domain: d.domain });
                            setWpForm({ admin_user: "admin", admin_password: "", admin_email: "", plugins: ["updraftplus"] });
                            setWpJobId(null);
                            setWpStatus(null);
                            setShowWpPassword(false);
                            setWpDialogOpen(true);
                          }}
                        >
                          <Zap className="h-4 w-4 text-amber-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="cursor-pointer h-8 w-8 p-0"
                          onClick={() => {
                            setDeleteTarget({ user: d.user, domain: d.domain });
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </GlassCard>

      {/* ═══ Domain Settings Sheet ═══ */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="sm:max-w-xl w-full overflow-y-auto">
          {sheetDomain && (
            <>
              <SheetHeader className="pb-2">
                <SheetTitle className="flex items-center gap-2 text-[#134E4A]">
                  <Globe className="h-5 w-5 text-teal-600" />
                  {sheetDomain.domain}
                </SheetTitle>
                <SheetDescription>
                  {sheetDomain.user} &middot; Created {sheetDomain.DATE}
                </SheetDescription>
              </SheetHeader>

              {/* Tabs */}
              <div className="flex flex-wrap gap-1 px-4 pb-3 border-b border-slate-200">
                {SETTINGS_TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer",
                      activeTab === tab
                        ? "bg-teal-600 text-white"
                        : "bg-white/60 text-gray-600 hover:bg-white/80 border border-gray-200"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="px-4 py-4 space-y-4">
                {/* ── General Tab ── */}
                {activeTab === "General" && (
                  <>
                    {/* Status + Actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {sheetDomain.SUSPENDED !== "no" ? (
                          <Badge className="bg-red-100 text-red-700 border-red-200">Suspended</Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Active</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {sheetDomain.SUSPENDED !== "no" ? (
                          <Button
                            size="sm"
                            className="bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                            disabled={actionLoading === "unsuspend"}
                            onClick={() => domainAction(sheetDomain.domain, sheetDomain.user, "unsuspend")}
                          >
                            {actionLoading === "unsuspend" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                            Unsuspend
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50 cursor-pointer"
                            disabled={actionLoading === "suspend"}
                            onClick={() => {
                              if (confirm(`Suspend ${sheetDomain.domain}?`)) {
                                domainAction(sheetDomain.domain, sheetDomain.user, "suspend");
                              }
                            }}
                          >
                            {actionLoading === "suspend" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                            Suspend
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <InfoItem label="IPv4" value={sheetDomain.IP || "N/A"} mono />
                      {sheetDomain.IP6 && <InfoItem label="IPv6" value={sheetDomain.IP6} mono />}
                      <InfoItem label="Disk Usage" value={formatDisk(sheetDomain.U_DISK)} />
                      <InfoItem label="Bandwidth" value={formatDisk(sheetDomain.U_BANDWIDTH)} />
                      <InfoItem label="Backend" value={sheetDomain.BACKEND || "N/A"} />
                      <InfoItem label="Proxy" value={sheetDomain.PROXY || "none"} />
                    </div>

                    {/* SSL Status */}
                    <div className="rounded-lg border border-slate-200 bg-white/50 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {sheetDomain.SSL && sheetDomain.SSL !== "no" ? (
                            <ShieldCheck className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <ShieldOff className="h-4 w-4 text-gray-400" />
                          )}
                          <span className="text-sm font-medium text-[#134E4A]">
                            SSL {sheetDomain.SSL && sheetDomain.SSL !== "no" ? "Active" : "Inactive"}
                          </span>
                        </div>
                        {(!sheetDomain.SSL || sheetDomain.SSL === "no") && (
                          <Button
                            size="sm"
                            className="bg-teal-600 text-white hover:bg-teal-700 cursor-pointer"
                            onClick={() => requestSsl(sheetDomain.user, sheetDomain.domain)}
                          >
                            Enable SSL
                          </Button>
                        )}
                      </div>
                      {sheetDomain.SSL && sheetDomain.SSL !== "no" && (
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          {sheetDomain.LETSENCRYPT === "yes" && <span>Let&apos;s Encrypt</span>}
                          {sheetDomain.SSL_EXPIRE && <span>Expires: {sheetDomain.SSL_EXPIRE}</span>}
                          {sheetDomain.SSL_ISSUER && <span>Issuer: {sheetDomain.SSL_ISSUER}</span>}
                        </div>
                      )}
                    </div>

                    {/* Quick Link */}
                    <a
                      href={`${sheetDomain.SSL && sheetDomain.SSL !== "no" ? "https" : "http"}://${sheetDomain.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700 hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open Site
                    </a>
                  </>
                )}

                {/* ── PHP & Templates Tab ── */}
                {activeTab === "PHP & Templates" && (
                  <>
                    {!templates ? (
                      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading templates...
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* PHP Version */}
                        <TemplateSelect
                          label="PHP Version"
                          current={sheetDomain.BACKEND}
                          options={templates.backend}
                          loading={actionLoading === "change-backend"}
                          onApply={(tpl) => domainAction(sheetDomain.domain, sheetDomain.user, "change-backend", { template: tpl })}
                        />

                        {/* Web Template */}
                        <TemplateSelect
                          label="Web Template"
                          current={sheetDomain.TPL}
                          options={templates.web}
                          loading={actionLoading === "change-web-tpl"}
                          onApply={(tpl) => domainAction(sheetDomain.domain, sheetDomain.user, "change-web-tpl", { template: tpl })}
                        />

                        {/* Proxy Template */}
                        <TemplateSelect
                          label="Proxy Template"
                          current={sheetDomain.PROXY}
                          options={templates.proxy}
                          loading={actionLoading === "change-proxy-tpl"}
                          onApply={(tpl) => domainAction(sheetDomain.domain, sheetDomain.user, "change-proxy-tpl", { template: tpl })}
                        />

                        {/* Proxy Extensions (read-only) */}
                        {sheetDomain.PROXY_EXT && (
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Proxy Extensions</Label>
                            <p className="text-xs font-mono bg-slate-50 rounded-md p-2 border border-slate-200 break-all">
                              {sheetDomain.PROXY_EXT}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* ── Redirects Tab ── */}
                {activeTab === "Redirects" && (
                  <div className="space-y-4">
                    {/* Current redirect */}
                    {sheetDomain.REDIRECT && sheetDomain.REDIRECT !== "" ? (
                      <div className="rounded-lg border border-slate-200 bg-white/50 p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-[#134E4A]">
                              <ArrowUpRight className="inline h-4 w-4 mr-1" />
                              {sheetDomain.REDIRECT}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              HTTP {sheetDomain.REDIRECT_CODE || "301"}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 cursor-pointer"
                            disabled={actionLoading === "delete-redirect"}
                            onClick={() => domainAction(sheetDomain.domain, sheetDomain.user, "delete-redirect", { redirectId: "1" })}
                          >
                            {actionLoading === "delete-redirect" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No redirects configured.</p>
                    )}

                    {/* Add redirect */}
                    <div className="rounded-lg border border-dashed border-slate-300 p-3 space-y-3">
                      <p className="text-sm font-medium text-[#134E4A]">Add Redirect</p>
                      <div className="grid gap-2">
                        <Input
                          placeholder="https://target-url.com"
                          value={newRedirectUrl}
                          onChange={(e) => setNewRedirectUrl(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Select value={newRedirectCode} onValueChange={(v) => v && setNewRedirectCode(v)}>
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="301">301 (Permanent)</SelectItem>
                              <SelectItem value="302">302 (Temporary)</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            className="bg-teal-600 text-white hover:bg-teal-700 cursor-pointer flex-1"
                            disabled={!newRedirectUrl || actionLoading === "add-redirect"}
                            onClick={async () => {
                              const ok = await domainAction(sheetDomain.domain, sheetDomain.user, "add-redirect", {
                                url: newRedirectUrl,
                                code: newRedirectCode,
                              });
                              if (ok) setNewRedirectUrl("");
                            }}
                          >
                            {actionLoading === "add-redirect" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                            Add
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Aliases Tab ── */}
                {activeTab === "Aliases" && (
                  <div className="space-y-4">
                    {/* Current aliases */}
                    {aliases(sheetDomain).length > 0 ? (
                      <div className="space-y-2">
                        {aliases(sheetDomain).map((alias) => (
                          <div key={alias} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white/50 px-3 py-2">
                            <div className="flex items-center gap-2">
                              <Link className="h-4 w-4 text-teal-500" />
                              <span className="text-sm font-medium text-[#134E4A]">{alias}</span>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500 cursor-pointer h-7 w-7 p-0"
                              disabled={actionLoading === `delete-alias-${alias}`}
                              onClick={async () => {
                                setActionLoading(`delete-alias-${alias}`);
                                await domainAction(sheetDomain.domain, sheetDomain.user, "delete-alias", { alias });
                                setActionLoading(null);
                              }}
                            >
                              {actionLoading === `delete-alias-${alias}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unlink className="h-3 w-3" />}
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No aliases configured.</p>
                    )}

                    {/* Add alias */}
                    <div className="flex gap-2">
                      <Input
                        placeholder="www.example.com"
                        value={newAlias}
                        onChange={(e) => setNewAlias(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        className="bg-teal-600 text-white hover:bg-teal-700 cursor-pointer"
                        disabled={!newAlias || actionLoading === "add-alias"}
                        onClick={async () => {
                          const ok = await domainAction(sheetDomain.domain, sheetDomain.user, "add-alias", { alias: newAlias });
                          if (ok) setNewAlias("");
                        }}
                      >
                        {actionLoading === "add-alias" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Add Alias
                      </Button>
                    </div>
                  </div>
                )}

                {/* ── Security Tab ── */}
                {activeTab === "Security" && (
                  <div className="space-y-5">
                    {/* SSL Section */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-[#134E4A]">SSL Certificate</h4>
                      <div className="rounded-lg border border-slate-200 bg-white/50 p-3">
                        <div className="flex items-center gap-2 mb-2">
                          {sheetDomain.SSL && sheetDomain.SSL !== "no" ? (
                            <>
                              <ShieldCheck className="h-4 w-4 text-emerald-500" />
                              <span className="text-sm text-emerald-700 font-medium">SSL Active</span>
                            </>
                          ) : (
                            <>
                              <ShieldOff className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-muted-foreground">SSL Inactive</span>
                            </>
                          )}
                        </div>
                        {sheetDomain.SSL && sheetDomain.SSL !== "no" ? (
                          <div className="grid gap-1 text-xs text-muted-foreground">
                            {sheetDomain.LETSENCRYPT === "yes" && <p>Provider: Let&apos;s Encrypt</p>}
                            {sheetDomain.SSL_EXPIRE && <p>Expires: {sheetDomain.SSL_EXPIRE}</p>}
                            {sheetDomain.SSL_ISSUER && <p>Issuer: {sheetDomain.SSL_ISSUER}</p>}
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            className="bg-teal-600 text-white hover:bg-teal-700 cursor-pointer mt-1"
                            onClick={() => requestSsl(sheetDomain.user, sheetDomain.domain)}
                          >
                            Request SSL Certificate
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* HTTP Auth Section */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-[#134E4A]">
                        <Lock className="inline h-4 w-4 mr-1" />
                        HTTP Basic Auth
                      </h4>

                      {httpAuthUsers.length > 0 ? (
                        <div className="space-y-2">
                          {httpAuthUsers.map((u: any) => (
                            <div key={u.authUser} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white/50 px-3 py-2">
                              <span className="text-sm font-medium text-[#134E4A]">{u.authUser}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-500 cursor-pointer h-7 w-7 p-0"
                                disabled={actionLoading === `delete-httpauth-${u.authUser}`}
                                onClick={async () => {
                                  setActionLoading(`delete-httpauth-${u.authUser}`);
                                  await domainAction(sheetDomain.domain, sheetDomain.user, "delete-httpauth", { authUser: u.authUser });
                                  setActionLoading(null);
                                }}
                              >
                                {actionLoading === `delete-httpauth-${u.authUser}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">No HTTP auth users configured.</p>
                      )}

                      {/* Add auth user */}
                      <div className="rounded-lg border border-dashed border-slate-300 p-3 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            placeholder="Username"
                            value={newAuthUser}
                            onChange={(e) => setNewAuthUser(e.target.value)}
                          />
                          <Input
                            placeholder="Password"
                            type="password"
                            value={newAuthPass}
                            onChange={(e) => setNewAuthPass(e.target.value)}
                          />
                        </div>
                        <Button
                          size="sm"
                          className="bg-teal-600 text-white hover:bg-teal-700 cursor-pointer w-full"
                          disabled={!newAuthUser || !newAuthPass || actionLoading === "add-httpauth"}
                          onClick={async () => {
                            const ok = await domainAction(sheetDomain.domain, sheetDomain.user, "add-httpauth", {
                              authUser: newAuthUser,
                              password: newAuthPass,
                            });
                            if (ok) {
                              setNewAuthUser("");
                              setNewAuthPass("");
                            }
                          }}
                        >
                          {actionLoading === "add-httpauth" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                          Add Auth User
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Advanced Tab ── */}
                {activeTab === "Advanced" && (
                  <div className="space-y-4">
                    {/* Document Root */}
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Document Root</Label>
                      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white/50 p-2">
                        <FolderOpen className="h-4 w-4 text-teal-500 shrink-0" />
                        <span className="text-sm font-mono text-[#134E4A] break-all">
                          {sheetDomain.DOCROOT || `/home/${sheetDomain.user}/web/${sheetDomain.domain}/public_html`}
                        </span>
                      </div>
                    </div>

                    {/* FTP Users */}
                    {sheetDomain.FTP_USER && (
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">FTP Accounts</Label>
                        <div className="space-y-1">
                          {String(sheetDomain.FTP_USER).split(":").filter(Boolean).map((ftpUser) => (
                            <div key={ftpUser} className="text-sm rounded-lg border border-slate-200 bg-white/50 px-3 py-2 font-mono text-[#134E4A]">
                              {ftpUser}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Domain Info */}
                    <div className="grid grid-cols-2 gap-3">
                      <InfoItem label="Web Template" value={sheetDomain.TPL || "default"} />
                      <InfoItem label="Proxy Template" value={sheetDomain.PROXY || "default"} />
                      <InfoItem label="Created" value={`${sheetDomain.DATE} ${sheetDomain.TIME || ""}`} />
                      <InfoItem label="Proxy Extensions" value={sheetDomain.PROXY_EXT ? "Configured" : "None"} />
                    </div>

                    {/* Quick Actions */}
                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      <h4 className="text-sm font-semibold text-[#134E4A]">Quick Actions</h4>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="cursor-pointer"
                          onClick={() => {
                            setWpTarget({ user: sheetDomain.user, domain: sheetDomain.domain });
                            setWpForm({ admin_user: "admin", admin_password: "", admin_email: "", plugins: ["updraftplus"] });
                            setWpJobId(null);
                            setWpStatus(null);
                            setShowWpPassword(false);
                            setSheetOpen(false);
                            setWpDialogOpen(true);
                          }}
                        >
                          <Zap className="h-4 w-4 text-amber-500" />
                          Install WordPress
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50 cursor-pointer"
                          onClick={() => {
                            setDeleteTarget({ user: sheetDomain.user, domain: sheetDomain.domain });
                            setSheetOpen(false);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete Domain
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ═══ Add Domain Dialog ═══ */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Domain</DialogTitle>
            <DialogDescription>Add a web domain to an existing user account.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>User</Label>
              <Select value={addForm.user} onValueChange={(val) => val && setAddForm((f) => ({ ...f, user: val }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.username} value={u.username}>{u.username}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-domain">Domain Name</Label>
              <Input
                id="add-domain"
                placeholder="example.com"
                value={addForm.domain}
                onChange={(e) => setAddForm((f) => ({ ...f, domain: e.target.value }))}
              />
            </div>
            {serverIps.length > 1 && (
              <div className="grid gap-2">
                <Label>IP Address</Label>
                <Select value={addForm.ip} onValueChange={(val) => val && setAddForm((f) => ({ ...f, ip: val }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Auto (default)" />
                  </SelectTrigger>
                  <SelectContent>
                    {serverIps.map((s) => (
                      <SelectItem key={s.ip} value={s.ip}>
                        <span className="font-mono">{s.ip}</span>
                        {s.name && <span className="text-muted-foreground ml-2">({s.name})</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                id="add-ssl"
                type="checkbox"
                checked={addForm.ssl}
                onChange={(e) => setAddForm((f) => ({ ...f, ssl: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <Label htmlFor="add-ssl">Enable SSL (Let&apos;s Encrypt)</Label>
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              className="bg-teal-600 text-white hover:bg-teal-700 cursor-pointer"
              onClick={handleAddDomain}
              disabled={addLoading}
            >
              {addLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Add Domain
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Delete Confirmation Dialog ═══ */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Domain</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.domain}</strong> from user <strong>{deleteTarget?.user}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button variant="destructive" onClick={handleDeleteDomain} disabled={deleteLoading} className="cursor-pointer">
              {deleteLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ WordPress Quick Install Dialog ═══ */}
      <Dialog open={wpDialogOpen} onOpenChange={setWpDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              WordPress Quick Install
            </DialogTitle>
            <DialogDescription>
              Install WordPress on <strong>{wpTarget?.domain}</strong>
            </DialogDescription>
          </DialogHeader>
          {!wpJobId && !wpStatus && (
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label>Admin Username</Label>
                <Input value={wpForm.admin_user} onChange={(e) => setWpForm((f) => ({ ...f, admin_user: e.target.value }))} placeholder="admin" />
              </div>
              <div className="grid gap-2">
                <Label>Admin Password</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showWpPassword ? "text" : "password"}
                      value={wpForm.admin_password}
                      onChange={(e) => setWpForm((f) => ({ ...f, admin_password: e.target.value }))}
                      placeholder="Strong password"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                      onClick={() => setShowWpPassword(!showWpPassword)}
                    >
                      {showWpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button variant="outline" size="sm" className="cursor-pointer shrink-0" onClick={() => { setWpForm((f) => ({ ...f, admin_password: generatePassword() })); setShowWpPassword(true); }}>
                    Generate
                  </Button>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Admin Email</Label>
                <Input type="email" value={wpForm.admin_email} onChange={(e) => setWpForm((f) => ({ ...f, admin_email: e.target.value }))} placeholder="admin@example.com" />
              </div>
              <div className="grid gap-2">
                <Label>Plugins</Label>
                <div className="grid grid-cols-2 gap-2">
                  {wpPluginsList.map((p) => (
                    <label
                      key={p.slug}
                      className={`flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer transition-all ${
                        wpForm.plugins.includes(p.slug) ? "border-teal-300 bg-teal-50" : "border-slate-200 bg-white/50 hover:bg-white/80"
                      }`}
                    >
                      <input type="checkbox" checked={wpForm.plugins.includes(p.slug)} onChange={() => togglePlugin(p.slug)} className="h-4 w-4 rounded border-gray-300 text-teal-600" />
                      <div>
                        <p className="text-sm font-medium text-[#134E4A]">{p.name}</p>
                        <p className="text-[11px] text-muted-foreground">{p.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
          {wpStatus && (
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Step {wpStatus.step} / {wpStatus.totalSteps}</span>
                  <span className="text-muted-foreground">{Math.round((wpStatus.step / wpStatus.totalSteps) * 100)}%</span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${wpStatus.status === "error" ? "bg-red-500" : wpStatus.status === "done" ? "bg-emerald-500" : "bg-teal-500"}`}
                    style={{ width: `${(wpStatus.step / wpStatus.totalSteps) * 100}%` }}
                  />
                </div>
              </div>
              <div className={`flex items-center gap-2 rounded-lg border p-3 ${wpStatus.status === "error" ? "border-red-200 bg-red-50" : wpStatus.status === "done" ? "border-emerald-200 bg-emerald-50" : "border-teal-200 bg-teal-50"}`}>
                {wpStatus.status === "installing" && <Loader2 className="h-4 w-4 animate-spin text-teal-600 shrink-0" />}
                {wpStatus.status === "done" && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
                {wpStatus.status === "error" && <XCircle className="h-4 w-4 text-red-600 shrink-0" />}
                <p className="text-sm">{wpStatus.message}</p>
              </div>
              {wpStatus.status === "done" && wpStatus.result && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
                  <p className="text-sm font-medium text-emerald-700">WordPress installed successfully!</p>
                  <div className="grid gap-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Admin URL:</span>
                      <a href={wpStatus.result.admin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-teal-600 hover:underline font-mono text-xs">
                        {wpStatus.result.admin_url}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Username:</span>
                      <button className="flex items-center gap-1 font-mono text-xs cursor-pointer hover:text-teal-600" onClick={() => navigator.clipboard.writeText(wpStatus.result.admin_user)}>
                        {wpStatus.result.admin_user}
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Password:</span>
                      <button className="flex items-center gap-1 font-mono text-xs cursor-pointer hover:text-teal-600" onClick={() => navigator.clipboard.writeText(wpStatus.result.admin_password)}>
                        {wpStatus.result.admin_password}
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {!wpJobId && !wpStatus ? (
              <>
                <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                <Button className="bg-amber-500 text-white hover:bg-amber-600 cursor-pointer" onClick={handleWpInstall} disabled={!wpForm.admin_user || !wpForm.admin_password || !wpForm.admin_email}>
                  <Zap className="h-4 w-4 mr-1" />
                  Install WordPress
                </Button>
              </>
            ) : (
              <Button variant="outline" className="cursor-pointer" onClick={() => setWpDialogOpen(false)}>
                {wpStatus?.status === "done" || wpStatus?.status === "error" ? "Close" : "Close (continues in background)"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Sub-components ──

function InfoItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white/50 p-2.5">
      <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
      <p className={cn("text-sm font-medium text-[#134E4A]", mono && "font-mono text-xs")}>{value}</p>
    </div>
  );
}

function TemplateSelect({
  label,
  current,
  options,
  loading,
  onApply,
}: {
  label: string;
  current: string;
  options: string[];
  loading: boolean;
  onApply: (value: string) => void;
}) {
  const [value, setValue] = useState(current || "");

  useEffect(() => {
    setValue(current || "");
  }, [current]);

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex gap-2">
        <Select value={value} onValueChange={(v) => v && setValue(v)}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          className="bg-teal-600 text-white hover:bg-teal-700 cursor-pointer shrink-0"
          disabled={loading || value === current}
          onClick={() => onApply(value)}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
        </Button>
      </div>
      {current && (
        <p className="text-[11px] text-muted-foreground">
          Current: <span className="font-mono">{current}</span>
        </p>
      )}
    </div>
  );
}
