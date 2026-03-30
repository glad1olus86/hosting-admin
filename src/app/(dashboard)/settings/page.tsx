"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Loader2,
  KeyRound,
  Mail,
  Server,
  Upload,
  Database,
  Shield,
  Check,
  Trash2,
  Plus,
  RefreshCw,
  Activity,
  XCircle,
  Users,
  Pencil,
  Ban,
  PlayCircle,
  Eye,
  EyeOff,
  Copy,
} from "lucide-react";
import { GlassCard } from "@/components/layout/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/contexts/toast-context";
import { useConfirm } from "@/contexts/confirm-context";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────

interface UploadLimits {
  nginxClientMaxBodySize: string;
  phpUploadMaxFilesize: string;
  phpPostMaxSize: string;
  phpMemoryLimit: string;
}

interface BackupConfig {
  backupDir: string;
  backups: string;
  backupMode: string;
  backupSystem: string;
}

interface FirewallRule {
  id: string;
  action: string;
  protocol: string;
  port: string;
  ip: string;
  comment: string;
  suspended: string;
}

interface DashboardAccountInfo {
  id: number;
  username: string;
  email: string;
  role: string;
  suspended: boolean;
  domainPattern: string | null;
  linkedUsers: string[];
  createdAt: string;
}

interface HestiaUser {
  username: string;
}

// ─── Page ─────────────────────────────────────────────────

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const confirm = useConfirm();
  const isAdmin = user?.role === "admin";

  // ── Account Settings ──────────────────────────────────
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [emailForm, setEmailForm] = useState(user?.email || "");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // ── Connection Status ─────────────────────────────────
  const [connectionStatus, setConnectionStatus] = useState<
    "loading" | "ok" | "error"
  >("loading");
  const [connectionInfo, setConnectionInfo] = useState<any>(null);

  // ── Upload Limits ─────────────────────────────────────
  const [limits, setLimits] = useState<UploadLimits | null>(null);
  const [limitsLoading, setLimitsLoading] = useState(false);
  const [limitsForm, setLimitsForm] = useState({
    nginxClientMaxBodySize: "",
    phpUploadMaxFilesize: "",
    phpPostMaxSize: "",
    phpMemoryLimit: "",
  });
  const [limitsSaving, setLimitsSaving] = useState(false);
  const [limitsMsg, setLimitsMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // ── Backup Config ─────────────────────────────────────
  const [backup, setBackup] = useState<BackupConfig | null>(null);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupSaving, setBackupSaving] = useState(false);

  // ── Firewall ──────────────────────────────────────────
  const [firewall, setFirewall] = useState<FirewallRule[]>([]);
  const [firewallLoading, setFirewallLoading] = useState(false);
  const [addRuleOpen, setAddRuleOpen] = useState(false);
  const [addRuleForm, setAddRuleForm] = useState({
    action: "ACCEPT",
    protocol: "TCP",
    port: "",
    ip: "",
    comment: "",
  });
  const [addRuleSaving, setAddRuleSaving] = useState(false);
  const [deleteRuleLoading, setDeleteRuleLoading] = useState<string | null>(
    null
  );

  // ── User Management ─────────────────────────────────
  const [accounts, setAccounts] = useState<DashboardAccountInfo[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [systemUsers, setSystemUsers] = useState<HestiaUser[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<DashboardAccountInfo | null>(null);
  const [editForm, setEditForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "user" as string,
    domainPattern: "",
    linkedUsers: [] as string[],
  });
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editMsg, setEditMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [suspendLoading, setSuspendLoading] = useState<number | null>(null);
  const [deleteAccountLoading, setDeleteAccountLoading] = useState<number | null>(null);

  // ── Fetch helpers ─────────────────────────────────────

  const fetchConnection = useCallback(async () => {
    setConnectionStatus("loading");
    try {
      const res = await fetch("/api/debug");
      const data = await res.json();
      setConnectionInfo(data);
      setConnectionStatus(data.ok ? "ok" : "error");
    } catch {
      setConnectionStatus("error");
    }
  }, []);

  const fetchLimits = useCallback(async () => {
    setLimitsLoading(true);
    try {
      const res = await fetch("/api/settings/upload-limits");
      if (res.ok) {
        const data = await res.json();
        setLimits(data);
        setLimitsForm(data);
      }
    } catch {}
    setLimitsLoading(false);
  }, []);

  const fetchBackup = useCallback(async () => {
    setBackupLoading(true);
    try {
      const res = await fetch("/api/settings/backup-config");
      if (res.ok) {
        const data = await res.json();
        setBackup(data);
      }
    } catch {}
    setBackupLoading(false);
  }, []);

  const fetchFirewall = useCallback(async () => {
    setFirewallLoading(true);
    try {
      const res = await fetch("/api/settings/firewall");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setFirewall(data);
      }
    } catch {}
    setFirewallLoading(false);
  }, []);

  const fetchAccounts = useCallback(async () => {
    setAccountsLoading(true);
    try {
      const res = await fetch("/api/accounts");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setAccounts(data);
      }
    } catch {}
    setAccountsLoading(false);
  }, []);

  const fetchSystemUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setSystemUsers(data);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchConnection();
      fetchLimits();
      fetchBackup();
      fetchFirewall();
      fetchAccounts();
      fetchSystemUsers();
    }
  }, [isAdmin, fetchConnection, fetchLimits, fetchBackup, fetchFirewall, fetchAccounts, fetchSystemUsers]);

  useEffect(() => {
    if (user?.email) setEmailForm(user.email);
  }, [user?.email]);

  // ── Handlers ──────────────────────────────────────────

  async function handleChangePassword() {
    setPasswordMsg(null);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMsg({ type: "error", text: "Passwords do not match" });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordMsg({
        type: "error",
        text: "Password must be at least 6 characters",
      });
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      setPasswordMsg({ type: "success", text: "Password changed successfully" });
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err: any) {
      setPasswordMsg({ type: "error", text: err.message });
    } finally {
      setPasswordSaving(false);
    }
  }

  async function handleUpdateEmail() {
    setEmailMsg(null);
    if (!emailForm) {
      setEmailMsg({ type: "error", text: "Email is required" });
      return;
    }

    setEmailSaving(true);
    try {
      const res = await fetch("/api/auth/update-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailForm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      setEmailMsg({ type: "success", text: "Email updated" });
      refreshUser();
    } catch (err: any) {
      setEmailMsg({ type: "error", text: err.message });
    } finally {
      setEmailSaving(false);
    }
  }

  async function handleSaveLimits() {
    setLimitsMsg(null);
    setLimitsSaving(true);
    try {
      const res = await fetch("/api/settings/upload-limits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(limitsForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      setLimitsMsg({ type: "success", text: "Limits updated. Services restarted." });
      fetchLimits();
    } catch (err: any) {
      setLimitsMsg({ type: "error", text: err.message });
    } finally {
      setLimitsSaving(false);
    }
  }

  async function handleSaveBackupRotations(value: string) {
    setBackupSaving(true);
    try {
      await fetch("/api/settings/backup-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "BACKUPS", value }),
      });
      fetchBackup();
    } catch {}
    setBackupSaving(false);
  }

  async function handleAddFirewallRule() {
    if (!addRuleForm.port) return;
    setAddRuleSaving(true);
    try {
      const res = await fetch("/api/settings/firewall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addRuleForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      setAddRuleOpen(false);
      setAddRuleForm({
        action: "ACCEPT",
        protocol: "TCP",
        port: "",
        ip: "",
        comment: "",
      });
      fetchFirewall();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAddRuleSaving(false);
    }
  }

  async function handleDeleteFirewallRule(id: string) {
    setDeleteRuleLoading(id);
    try {
      const res = await fetch("/api/settings/firewall", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      fetchFirewall();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleteRuleLoading(null);
    }
  }

  // ── User Management Handlers ─────────────────────────

  function openEditDialog(acc: DashboardAccountInfo) {
    setEditAccount(acc);
    setEditForm({
      username: acc.username,
      email: acc.email,
      password: "",
      role: acc.role,
      domainPattern: acc.domainPattern || "",
      linkedUsers: [...acc.linkedUsers],
    });
    setEditMsg(null);
    setShowEditPassword(false);
    setEditDialogOpen(true);
  }

  function generatePassword() {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*";
    let pw = "";
    for (let i = 0; i < 16; i++) pw += chars[Math.floor(Math.random() * chars.length)];
    setEditForm((f) => ({ ...f, password: pw }));
    setShowEditPassword(true);
  }

  async function handleSaveAccount() {
    if (!editAccount) return;
    setEditSaving(true);
    setEditMsg(null);

    try {
      const actions: Array<{ action: string; [key: string]: any }> = [];

      if (editForm.username !== editAccount.username) {
        actions.push({ action: "change_username", username: editForm.username });
      }
      if (editForm.email !== editAccount.email) {
        actions.push({ action: "change_email", email: editForm.email });
      }
      if (editForm.password) {
        actions.push({ action: "reset_password", password: editForm.password });
      }
      if (editForm.role !== editAccount.role) {
        actions.push({ action: "change_role", role: editForm.role });
      }
      if (editForm.domainPattern !== (editAccount.domainPattern || "")) {
        actions.push({ action: "set_domain_pattern", domainPattern: editForm.domainPattern });
      }
      const oldLinks = [...editAccount.linkedUsers].sort().join(",");
      const newLinks = [...editForm.linkedUsers].sort().join(",");
      if (oldLinks !== newLinks) {
        actions.push({ action: "update_links", linkedUsers: editForm.linkedUsers });
      }

      if (actions.length === 0) {
        setEditMsg({ type: "error", text: "No changes to save" });
        setEditSaving(false);
        return;
      }

      for (const act of actions) {
        const res = await fetch("/api/accounts", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editAccount.id, ...act }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
      }

      setEditMsg({ type: "success", text: "Account updated" });
      fetchAccounts();
      setTimeout(() => setEditDialogOpen(false), 800);
    } catch (err: any) {
      setEditMsg({ type: "error", text: err.message });
    } finally {
      setEditSaving(false);
    }
  }

  async function handleToggleSuspend(acc: DashboardAccountInfo) {
    setSuspendLoading(acc.id);
    try {
      const res = await fetch("/api/accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: acc.id, action: acc.suspended ? "unsuspend" : "suspend" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      fetchAccounts();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSuspendLoading(null);
    }
  }

  async function handleDeleteAccount(acc: DashboardAccountInfo) {
    const ok = await confirm({
      title: "Delete Account",
      description: `Delete account "${acc.username}"? This cannot be undone.`,
      confirmLabel: "Delete",
      variant: "destructive",
    });
    if (!ok) return;
    setDeleteAccountLoading(acc.id);
    try {
      const res = await fetch("/api/accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: acc.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      fetchAccounts();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleteAccountLoading(null);
    }
  }

  // ── Render ────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#134E4A]">Settings</h1>

      {/* ─── Account Settings ─────────────────────────── */}
      <GlassCard>
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[#134E4A]">
          <KeyRound className="h-5 w-5" />
          Account Settings
        </h3>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Change Password */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-[#134E4A]">
              Change Password
            </h4>
            {passwordMsg && (
              <div
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm",
                  passwordMsg.type === "success"
                    ? "border-green-200 bg-green-50 text-green-600"
                    : "border-red-200 bg-red-50 text-red-600"
                )}
              >
                {passwordMsg.text}
              </div>
            )}
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Current password"
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm((f) => ({
                    ...f,
                    currentPassword: e.target.value,
                  }))
                }
              />
              <Input
                type="password"
                placeholder="New password"
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm((f) => ({
                    ...f,
                    newPassword: e.target.value,
                  }))
                }
              />
              <Input
                type="password"
                placeholder="Confirm new password"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm((f) => ({
                    ...f,
                    confirmPassword: e.target.value,
                  }))
                }
              />
            </div>
            <Button
              className="bg-teal-600 text-white hover:bg-teal-700"
              onClick={handleChangePassword}
              disabled={passwordSaving}
            >
              {passwordSaving && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Change Password
            </Button>
          </div>

          {/* Update Email */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-[#134E4A]">Email</h4>
            {emailMsg && (
              <div
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm",
                  emailMsg.type === "success"
                    ? "border-green-200 bg-green-50 text-green-600"
                    : "border-red-200 bg-red-50 text-red-600"
                )}
              >
                {emailMsg.text}
              </div>
            )}
            <Input
              type="email"
              value={emailForm}
              onChange={(e) => setEmailForm(e.target.value)}
            />
            <Button
              className="bg-teal-600 text-white hover:bg-teal-700"
              onClick={handleUpdateEmail}
              disabled={emailSaving || emailForm === user?.email}
            >
              {emailSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Update Email
            </Button>
          </div>
        </div>
      </GlassCard>

      {/* ─── HestiaCP Connection (admin only) ─────────── */}
      {isAdmin && (
        <GlassCard>
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[#134E4A]">
            <Server className="h-5 w-5" />
            HestiaCP Connection
          </h3>
          <div className="flex items-center gap-3 mb-3">
            {connectionStatus === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
            ) : connectionStatus === "ok" ? (
              <span className="flex items-center gap-1.5 text-sm text-emerald-600">
                <Activity className="h-4 w-4" />
                Connected
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-sm text-red-500">
                <XCircle className="h-4 w-4" />
                Connection failed
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchConnection}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Test
            </Button>
          </div>
          {connectionInfo && (
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
              <span>
                Host:{" "}
                <span className="text-[#134E4A] font-mono text-xs">
                  {connectionInfo.host || "N/A"}
                </span>
              </span>
              <span>
                User:{" "}
                <span className="text-[#134E4A] font-mono text-xs">
                  {connectionInfo.user || "N/A"}
                </span>
              </span>
              {connectionInfo.users !== undefined && (
                <span>
                  System Users:{" "}
                  <span className="text-[#134E4A] font-medium">
                    {connectionInfo.users}
                  </span>
                </span>
              )}
            </div>
          )}
        </GlassCard>
      )}

      {/* ─── Upload Limits (admin only) ───────────────── */}
      {isAdmin && (
        <GlassCard>
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[#134E4A]">
            <Upload className="h-5 w-5" />
            Upload Limits
          </h3>
          {limitsLoading ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : (
            <>
              {limitsMsg && (
                <div
                  className={cn(
                    "mb-3 rounded-lg border px-3 py-2 text-sm",
                    limitsMsg.type === "success"
                      ? "border-green-200 bg-green-50 text-green-600"
                      : "border-red-200 bg-red-50 text-red-600"
                  )}
                >
                  {limitsMsg.text}
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Nginx max body size
                  </Label>
                  <Input
                    value={limitsForm.nginxClientMaxBodySize}
                    onChange={(e) =>
                      setLimitsForm((f) => ({
                        ...f,
                        nginxClientMaxBodySize: e.target.value,
                      }))
                    }
                    placeholder="e.g. 512M"
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    PHP upload_max_filesize
                  </Label>
                  <Input
                    value={limitsForm.phpUploadMaxFilesize}
                    onChange={(e) =>
                      setLimitsForm((f) => ({
                        ...f,
                        phpUploadMaxFilesize: e.target.value,
                      }))
                    }
                    placeholder="e.g. 256M"
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    PHP post_max_size
                  </Label>
                  <Input
                    value={limitsForm.phpPostMaxSize}
                    onChange={(e) =>
                      setLimitsForm((f) => ({
                        ...f,
                        phpPostMaxSize: e.target.value,
                      }))
                    }
                    placeholder="e.g. 512M"
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    PHP memory_limit
                  </Label>
                  <Input
                    value={limitsForm.phpMemoryLimit}
                    onChange={(e) =>
                      setLimitsForm((f) => ({
                        ...f,
                        phpMemoryLimit: e.target.value,
                      }))
                    }
                    placeholder="e.g. 512M"
                    className="font-mono text-sm"
                  />
                </div>
              </div>
              <Button
                className="mt-4 bg-teal-600 text-white hover:bg-teal-700"
                onClick={handleSaveLimits}
                disabled={limitsSaving}
              >
                {limitsSaving && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Apply & Restart Services
              </Button>
            </>
          )}
        </GlassCard>
      )}

      {/* ─── Backup Config (admin only) ───────────────── */}
      {isAdmin && (
        <GlassCard>
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[#134E4A]">
            <Database className="h-5 w-5" />
            Backup Configuration
          </h3>
          {backupLoading ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : backup ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Directory: </span>
                  <span className="font-mono text-xs text-[#134E4A]">
                    {backup.backupDir}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Mode: </span>
                  <span className="font-medium text-[#134E4A]">
                    {backup.backupMode}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Label className="text-sm text-muted-foreground">
                  Number of backup rotations:
                </Label>
                <Select
                  value={backup.backups}
                  onValueChange={(val) => val && handleSaveBackupRotations(val)}
                  disabled={backupSaving}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["1", "2", "3", "5", "7", "10", "14", "30"].map((n) => (
                      <SelectItem key={n} value={n}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {backupSaving && (
                  <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Unable to load backup configuration
            </p>
          )}
        </GlassCard>
      )}

      {/* ─── Firewall (admin only) ────────────────────── */}
      {isAdmin && (
        <GlassCard>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-[#134E4A]">
              <Shield className="h-5 w-5" />
              Firewall Rules
            </h3>
            <Button
              className="bg-teal-600 text-white hover:bg-teal-700"
              size="sm"
              onClick={() => setAddRuleOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add Rule
            </Button>
          </div>
          {firewallLoading ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : firewall.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No firewall rules found or unable to load.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Protocol</TableHead>
                    <TableHead>Port</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Comment</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {firewall.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <Badge
                          className={cn(
                            rule.action === "ACCEPT"
                              ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                              : "bg-red-100 text-red-700 border-red-200"
                          )}
                        >
                          {rule.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {rule.protocol}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {rule.port}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {rule.ip}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {rule.comment || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteFirewallRule(rule.id)}
                          disabled={deleteRuleLoading === rule.id}
                        >
                          {deleteRuleLoading === rule.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-red-500" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </GlassCard>
      )}

      {/* ─── User Management (admin only) ──────────────── */}
      {isAdmin && (
        <GlassCard>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-[#134E4A]">
              <Users className="h-5 w-5" />
              User Management
            </h3>
          </div>
          {accountsLoading ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No accounts found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Domain Rule</TableHead>
                    <TableHead>Linked Users</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((acc) => (
                    <TableRow key={acc.id} className={acc.suspended ? "opacity-60" : ""}>
                      <TableCell className="font-medium">{acc.username}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{acc.email}</TableCell>
                      <TableCell>
                        <Badge className={cn(
                          acc.role === "admin"
                            ? "bg-purple-100 text-purple-700 border-purple-200"
                            : "bg-blue-100 text-blue-700 border-blue-200"
                        )}>
                          {acc.role.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(
                          acc.suspended
                            ? "bg-red-100 text-red-700 border-red-200"
                            : "bg-emerald-100 text-emerald-700 border-emerald-200"
                        )}>
                          {acc.suspended ? "Suspended" : "Active"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground max-w-[200px] truncate">
                        {acc.domainPattern ? acc.domainPattern.replace("%edit%", "*") : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {acc.linkedUsers.length > 0 ? acc.linkedUsers.join(", ") : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(acc)}>
                            <Pencil className="h-4 w-4 text-teal-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleSuspend(acc)}
                            disabled={suspendLoading === acc.id || acc.id === user?.id}
                          >
                            {suspendLoading === acc.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : acc.suspended ? (
                              <PlayCircle className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <Ban className="h-4 w-4 text-orange-500" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAccount(acc)}
                            disabled={deleteAccountLoading === acc.id || acc.id === user?.id}
                          >
                            {deleteAccountLoading === acc.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-red-500" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </GlassCard>
      )}

      {/* ─── Edit Account Dialog ────────────────────────── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Account — {editAccount?.username}</DialogTitle>
            <DialogDescription>Update account settings and restrictions.</DialogDescription>
          </DialogHeader>
          {editMsg && (
            <div className={cn(
              "rounded-lg border px-3 py-2 text-sm",
              editMsg.type === "success"
                ? "border-green-200 bg-green-50 text-green-600"
                : "border-red-200 bg-red-50 text-red-600"
            )}>
              {editMsg.text}
            </div>
          )}
          <div className="grid gap-4 py-2">
            {/* Username */}
            <div className="space-y-1.5">
              <Label>Username</Label>
              <Input
                value={editForm.username}
                onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value }))}
              />
            </div>
            {/* Email */}
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            {/* Password */}
            <div className="space-y-1.5">
              <Label>New Password (leave empty to keep current)</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showEditPassword ? "text" : "password"}
                    value={editForm.password}
                    onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="Leave empty to keep current"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                  >
                    {showEditPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                </div>
                <Button variant="outline" size="sm" onClick={generatePassword} className="whitespace-nowrap">
                  Generate
                </Button>
                {editForm.password && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(editForm.password);
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
            {/* Role */}
            <div className="space-y-1.5">
              <Label>Role</Label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={editForm.role === "user" ? "default" : "outline"}
                  className={editForm.role === "user" ? "bg-teal-600 text-white hover:bg-teal-700" : ""}
                  onClick={() => setEditForm((f) => ({ ...f, role: "user" }))}
                >
                  User
                </Button>
                <Button
                  size="sm"
                  variant={editForm.role === "admin" ? "default" : "outline"}
                  className={editForm.role === "admin" ? "bg-purple-600 text-white hover:bg-purple-700" : ""}
                  onClick={() => setEditForm((f) => ({ ...f, role: "admin" }))}
                >
                  Admin
                </Button>
              </div>
            </div>
            {/* Domain Pattern */}
            <div className="space-y-1.5">
              <Label>Domain Creation Pattern</Label>
              <Input
                value={editForm.domainPattern}
                onChange={(e) => setEditForm((f) => ({ ...f, domainPattern: e.target.value }))}
                placeholder="demo.%edit%.lamapixel.com"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Use <code className="bg-muted px-1 rounded">%edit%</code> to mark the editable part. Leave empty for no restriction.
              </p>
            </div>
            {/* Linked System Users */}
            <div className="space-y-1.5">
              <Label>Linked System Users</Label>
              {systemUsers.length === 0 ? (
                <p className="text-xs text-muted-foreground">No system users available</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {systemUsers.map((su) => (
                    <label key={su.username} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editForm.linkedUsers.includes(su.username)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditForm((f) => ({ ...f, linkedUsers: [...f.linkedUsers, su.username] }));
                          } else {
                            setEditForm((f) => ({ ...f, linkedUsers: f.linkedUsers.filter((u) => u !== su.username) }));
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      />
                      {su.username}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              className="bg-teal-600 text-white hover:bg-teal-700"
              onClick={handleSaveAccount}
              disabled={editSaving}
            >
              {editSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Add Firewall Rule Dialog ─────────────────── */}
      <Dialog open={addRuleOpen} onOpenChange={setAddRuleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Firewall Rule</DialogTitle>
            <DialogDescription>
              Create a new iptables rule via HestiaCP.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Action</Label>
                <Select
                  value={addRuleForm.action}
                  onValueChange={(v) =>
                    v && setAddRuleForm((f) => ({ ...f, action: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACCEPT">ACCEPT</SelectItem>
                    <SelectItem value="DROP">DROP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Protocol</Label>
                <Select
                  value={addRuleForm.protocol}
                  onValueChange={(v) =>
                    v && setAddRuleForm((f) => ({ ...f, protocol: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TCP">TCP</SelectItem>
                    <SelectItem value="UDP">UDP</SelectItem>
                    <SelectItem value="ICMP">ICMP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Port</Label>
              <Input
                value={addRuleForm.port}
                onChange={(e) =>
                  setAddRuleForm((f) => ({ ...f, port: e.target.value }))
                }
                placeholder="e.g. 8080 or 3000:4000"
              />
            </div>
            <div className="space-y-1.5">
              <Label>IP Address (optional)</Label>
              <Input
                value={addRuleForm.ip}
                onChange={(e) =>
                  setAddRuleForm((f) => ({ ...f, ip: e.target.value }))
                }
                placeholder="0.0.0.0/0 (all)"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Comment (optional)</Label>
              <Input
                value={addRuleForm.comment}
                onChange={(e) =>
                  setAddRuleForm((f) => ({ ...f, comment: e.target.value }))
                }
                placeholder="Description"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              className="bg-teal-600 text-white hover:bg-teal-700"
              onClick={handleAddFirewallRule}
              disabled={addRuleSaving || !addRuleForm.port}
            >
              {addRuleSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Add Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
