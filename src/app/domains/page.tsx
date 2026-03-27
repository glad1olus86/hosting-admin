"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Trash2,
  ShieldCheck,
  ShieldOff,
  Loader2,
  Shield,
  Zap,
  Eye,
  EyeOff,
  Copy,
  CheckCircle2,
  XCircle,
  ExternalLink,
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

interface HestiaDomain {
  domain: string;
  user: string;
  IP: string;
  IP6: string;
  U_DISK: string;
  U_BANDWIDTH: string;
  SSL: string;
  LETSENCRYPT: string;
  BACKEND: string;
  PROXY: string;
  SUSPENDED: string;
  DATE: string;
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

export default function DomainsPage() {
  const [domains, setDomains] = useState<HestiaDomain[]>([]);
  const [users, setUsers] = useState<HestiaUser[]>([]);
  const [serverIps, setServerIps] = useState<ServerIp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track which domains are currently getting SSL
  const [sslLoading, setSslLoading] = useState<Set<string>>(new Set());

  // Add domain dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    user: "",
    domain: "",
    ip: "",
    ssl: false,
  });
  const [addLoading, setAddLoading] = useState(false);

  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    user: string;
    domain: string;
  } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // WordPress install
  const [wpDialogOpen, setWpDialogOpen] = useState(false);
  const [wpTarget, setWpTarget] = useState<{ user: string; domain: string } | null>(null);
  const [wpForm, setWpForm] = useState({ admin_user: "admin", admin_password: "", admin_email: "", plugins: ["updraftplus"] });
  const [showWpPassword, setShowWpPassword] = useState(false);
  const [wpJobId, setWpJobId] = useState<string | null>(null);
  const [wpStatus, setWpStatus] = useState<{ step: number; totalSteps: number; message: string; status: string; result?: any; error?: string } | null>(null);

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

  useEffect(() => {
    fetchDomains();
    fetchUsers();
    fetchIps();
  }, [fetchDomains, fetchUsers, fetchIps]);

  // Request SSL for a domain (async, non-blocking)
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
        console.error(`SSL failed for ${domain}: ${data.error}`);
        alert(`SSL error for ${domain}: ${data.error || "Unknown error"}`);
      }
      // Refresh domains to get updated SSL status
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

  const handleAddDomain = async () => {
    if (!addForm.user || !addForm.domain) {
      alert("Please fill in all required fields.");
      return;
    }
    setAddLoading(true);
    try {
      // Step 1: Create domain
      const res = await fetch("/api/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: addForm.user, domain: addForm.domain, ip: addForm.ip || undefined }),
      });
      const data = await res.json();
      if (!res.ok || data.error)
        throw new Error(data.error || "Failed to add domain");

      const wantSsl = addForm.ssl;
      const domainUser = addForm.user;
      const domainName = addForm.domain;

      // Close dialog and reset form immediately
      setAddDialogOpen(false);
      setAddForm({ user: "", domain: "", ip: "", ssl: false });

      // Refresh domains to show the new one
      await fetchDomains();

      // Step 2: Request SSL in background (non-blocking)
      if (wantSsl) {
        requestSsl(domainUser, domainName);
      }
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
      if (!res.ok || data.error)
        throw new Error(data.error || "Failed to delete domain");
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      await fetchDomains();
    } catch (err: any) {
      alert(err.message || "Failed to delete domain");
    } finally {
      setDeleteLoading(false);
    }
  };

  // WordPress polling
  useEffect(() => {
    if (!wpJobId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/wordpress/status?jobId=${wpJobId}`);
        const data = await res.json();
        if (data.error && res.status === 404) return;
        setWpStatus(data);
        if (data.status === "done" || data.status === "error") {
          clearInterval(interval);
        }
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
        body: JSON.stringify({
          user: wpTarget.user,
          domain: wpTarget.domain,
          admin_user: wpForm.admin_user,
          admin_password: wpForm.admin_password,
          admin_email: wpForm.admin_email,
          plugins: wpForm.plugins,
        }),
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

  return (
    <div className="space-y-6">
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

      <GlassCard>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
            <span className="ml-2 text-sm text-muted-foreground">
              Loading domains...
            </span>
          </div>
        ) : domains.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">No domains found.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Domain</TableHead>
                <TableHead>User</TableHead>
                <TableHead>SSL</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Proxy</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {domains.map((d) => {
                const hasSSL = d.SSL !== "" && d.SSL !== "no";
                const isSuspended = d.SUSPENDED !== "no";
                const sslKey = `${d.user}:${d.domain}`;
                const isGettingSsl = sslLoading.has(sslKey);

                return (
                  <TableRow key={`${d.user}-${d.domain}`}>
                    <TableCell className="font-medium text-[#134E4A]">
                      {d.domain}
                    </TableCell>
                    <TableCell>{d.user}</TableCell>
                    <TableCell>
                      {isGettingSsl ? (
                        <Tooltip>
                          <TooltipTrigger>
                            <div className="flex items-center gap-1.5">
                              <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
                              <span className="text-xs text-amber-600">SSL...</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            Requesting SSL certificate...
                          </TooltipContent>
                        </Tooltip>
                      ) : hasSSL ? (
                        <Tooltip>
                          <TooltipTrigger>
                            <ShieldCheck className="h-5 w-5 text-emerald-500" />
                          </TooltipTrigger>
                          <TooltipContent>
                            SSL active{d.LETSENCRYPT === "yes" ? " (Let's Encrypt)" : ""}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger>
                            <button
                              onClick={() => requestSsl(d.user, d.domain)}
                              className="cursor-pointer hover:scale-110 transition-transform"
                            >
                              <ShieldOff className="h-5 w-5 text-gray-400 hover:text-teal-500 transition-colors" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            Click to request SSL certificate
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {d.IP}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-violet-100 text-violet-700 border-violet-200">
                        {d.PROXY || "none"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {isSuspended ? (
                        <Badge className="bg-red-100 text-red-700 border-red-200">
                          Suspended
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                          Active
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-0.5">
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

      {/* Add Domain Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Domain</DialogTitle>
            <DialogDescription>
              Add a web domain to an existing user account.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>User</Label>
              <Select
                value={addForm.user}
                onValueChange={(val) =>
                  val && setAddForm((f) => ({ ...f, user: val }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.username} value={u.username}>
                      {u.username}
                    </SelectItem>
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
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, domain: e.target.value }))
                }
              />
            </div>
            {serverIps.length > 1 && (
              <div className="grid gap-2">
                <Label>IP Address</Label>
                <Select
                  value={addForm.ip}
                  onValueChange={(val) =>
                    val !== null && setAddForm((f) => ({ ...f, ip: val || "" }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Auto (default)" />
                  </SelectTrigger>
                  <SelectContent>
                    {serverIps.map((s) => (
                      <SelectItem key={s.ip} value={s.ip}>
                        <span className="font-mono">{s.ip}</span>
                        {s.name && <span className="text-muted-foreground ml-2">({s.name})</span>}
                        <span className="text-muted-foreground ml-1">· {s.domains} domains</span>
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
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, ssl: e.target.checked }))
                }
                className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <Label htmlFor="add-ssl">
                Enable SSL (Let&apos;s Encrypt)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Domain</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deleteTarget?.domain}</strong> from user{" "}
              <strong>{deleteTarget?.user}</strong>? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDeleteDomain}
              disabled={deleteLoading}
              className="cursor-pointer"
            >
              {deleteLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WordPress Quick Install Dialog */}
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

          {/* Form — show only when not installing */}
          {!wpJobId && !wpStatus && (
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label>Admin Username</Label>
                <Input
                  value={wpForm.admin_user}
                  onChange={(e) => setWpForm((f) => ({ ...f, admin_user: e.target.value }))}
                  placeholder="admin"
                />
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="cursor-pointer shrink-0"
                    onClick={() => {
                      setWpForm((f) => ({ ...f, admin_password: generatePassword() }));
                      setShowWpPassword(true);
                    }}
                  >
                    Generate
                  </Button>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Admin Email</Label>
                <Input
                  type="email"
                  value={wpForm.admin_email}
                  onChange={(e) => setWpForm((f) => ({ ...f, admin_email: e.target.value }))}
                  placeholder="admin@example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label>Plugins</Label>
                <div className="grid grid-cols-2 gap-2">
                  {wpPluginsList.map((p) => (
                    <label
                      key={p.slug}
                      className={`flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer transition-all ${
                        wpForm.plugins.includes(p.slug)
                          ? "border-teal-300 bg-teal-50"
                          : "border-slate-200 bg-white/50 hover:bg-white/80"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={wpForm.plugins.includes(p.slug)}
                        onChange={() => togglePlugin(p.slug)}
                        className="h-4 w-4 rounded border-gray-300 text-teal-600"
                      />
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

          {/* Progress — show during and after install */}
          {wpStatus && (
            <div className="py-4 space-y-4">
              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Step {wpStatus.step} / {wpStatus.totalSteps}
                  </span>
                  <span className="text-muted-foreground">
                    {Math.round((wpStatus.step / wpStatus.totalSteps) * 100)}%
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      wpStatus.status === "error"
                        ? "bg-red-500"
                        : wpStatus.status === "done"
                        ? "bg-emerald-500"
                        : "bg-teal-500"
                    }`}
                    style={{ width: `${(wpStatus.step / wpStatus.totalSteps) * 100}%` }}
                  />
                </div>
              </div>

              {/* Status message */}
              <div className={`flex items-center gap-2 rounded-lg border p-3 ${
                wpStatus.status === "error"
                  ? "border-red-200 bg-red-50"
                  : wpStatus.status === "done"
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-teal-200 bg-teal-50"
              }`}>
                {wpStatus.status === "installing" && <Loader2 className="h-4 w-4 animate-spin text-teal-600 shrink-0" />}
                {wpStatus.status === "done" && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
                {wpStatus.status === "error" && <XCircle className="h-4 w-4 text-red-600 shrink-0" />}
                <p className="text-sm">{wpStatus.message}</p>
              </div>

              {/* Success result */}
              {wpStatus.status === "done" && wpStatus.result && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
                  <p className="text-sm font-medium text-emerald-700">WordPress installed successfully!</p>
                  <div className="grid gap-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Admin URL:</span>
                      <a
                        href={wpStatus.result.admin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-teal-600 hover:underline font-mono text-xs"
                      >
                        {wpStatus.result.admin_url}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Username:</span>
                      <button
                        className="flex items-center gap-1 font-mono text-xs cursor-pointer hover:text-teal-600"
                        onClick={() => navigator.clipboard.writeText(wpStatus.result.admin_user)}
                      >
                        {wpStatus.result.admin_user}
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Password:</span>
                      <button
                        className="flex items-center gap-1 font-mono text-xs cursor-pointer hover:text-teal-600"
                        onClick={() => navigator.clipboard.writeText(wpStatus.result.admin_password)}
                      >
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
                <Button
                  className="bg-amber-500 text-white hover:bg-amber-600 cursor-pointer"
                  onClick={handleWpInstall}
                  disabled={!wpForm.admin_user || !wpForm.admin_password || !wpForm.admin_email}
                >
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
