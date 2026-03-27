"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Trash2,
  Upload,
  Loader2,
  Key,
  User,
  Globe,
  Copy,
  Eye,
  EyeOff,
  Server,
  FolderOpen,
} from "lucide-react";
import { GlassCard } from "@/components/layout/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface FtpAccount {
  ftpUser: string;
  domain: string;
  user: string;
  path: string;
}

interface HestiaUser {
  username: string;
}

interface HestiaDomain {
  domain: string;
  user: string;
}

const FTP_HOST = "116.202.219.165";

export default function FtpPage() {
  const [accounts, setAccounts] = useState<FtpAccount[]>([]);
  const [users, setUsers] = useState<HestiaUser[]>([]);
  const [domains, setDomains] = useState<HestiaDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterUser, setFilterUser] = useState<string>("all");

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    user: "",
    domain: "",
    ftp_user: "",
    password: "",
  });
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  // Change password dialog
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<FtpAccount | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FtpAccount | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchAccounts = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/ftp");
      if (!res.ok) throw new Error("Failed to fetch FTP accounts");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAccounts(data);
    } catch (err: any) {
      setError(err.message);
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

  const fetchDomains = useCallback(async () => {
    try {
      const res = await fetch("/api/domains");
      if (!res.ok) return;
      const data = await res.json();
      if (!data.error) setDomains(data);
    } catch {}
  }, []);

  useEffect(() => {
    fetchAccounts();
    fetchUsers();
    fetchDomains();
  }, [fetchAccounts, fetchUsers, fetchDomains]);

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let pwd = "";
    for (let i = 0; i < 16; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
    return pwd;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleCreate = async () => {
    if (!createForm.user || !createForm.domain || !createForm.ftp_user || !createForm.password) {
      setError("Fill in all required fields");
      return;
    }
    setCreateLoading(true);
    try {
      const res = await fetch("/api/ftp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to create FTP account");
      setCreateOpen(false);
      setCreateForm({ user: "", domain: "", ftp_user: "", password: "" });
      setShowCreatePassword(false);
      await fetchAccounts();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordTarget || !newPassword) return;
    setPasswordLoading(true);
    try {
      const res = await fetch("/api/ftp", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: passwordTarget.user,
          domain: passwordTarget.domain,
          ftp_user: passwordTarget.ftpUser,
          password: newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to change password");
      setPasswordOpen(false);
      setPasswordTarget(null);
      setNewPassword("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(
        `/api/ftp?user=${encodeURIComponent(deleteTarget.user)}&domain=${encodeURIComponent(deleteTarget.domain)}&ftp_user=${encodeURIComponent(deleteTarget.ftpUser)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to delete");
      setDeleteOpen(false);
      setDeleteTarget(null);
      await fetchAccounts();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const filtered = accounts.filter((a) => filterUser === "all" || a.user === filterUser);
  const uniqueUsers = [...new Set(accounts.map((a) => a.user))];
  const domainsWithFtp = new Set(accounts.map((a) => a.domain)).size;

  // Domains filtered by selected user in create dialog
  const userDomains = createForm.user
    ? domains.filter((d) => d.user === createForm.user)
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#134E4A]">FTP Accounts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage FTP access to your domains
          </p>
        </div>
        <Button
          className="bg-teal-600 text-white hover:bg-teal-700 cursor-pointer"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Create FTP Account
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
              <Upload className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#134E4A]">{accounts.length}</p>
              <p className="text-xs text-muted-foreground">FTP Accounts</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
              <Globe className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#134E4A]">{domainsWithFtp}</p>
              <p className="text-xs text-muted-foreground">Domains with FTP</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Server className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#134E4A]">{FTP_HOST}:21</p>
              <p className="text-xs text-muted-foreground">FTP Server</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Filter */}
      {uniqueUsers.length > 1 && (
        <div className="flex gap-2">
          {[{ key: "all", label: "All" }, ...uniqueUsers.map((u) => ({ key: u, label: u }))].map(
            (f) => (
              <button
                key={f.key}
                onClick={() => setFilterUser(f.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  filterUser === f.key
                    ? "bg-teal-600 text-white shadow-sm"
                    : "bg-white/60 text-slate-600 hover:bg-white/80 border border-slate-200"
                }`}
              >
                {f.label}
              </button>
            )
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <GlassCard className="border-red-200 bg-red-50/70 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-600">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-xs cursor-pointer">
              Close
            </button>
          </div>
        </GlassCard>
      )}

      {/* Content */}
      {loading ? (
        <GlassCard className="p-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
            <span className="ml-2 text-sm text-muted-foreground">Loading FTP accounts...</span>
          </div>
        </GlassCard>
      ) : filtered.length === 0 ? (
        <GlassCard className="p-16">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-teal-100 flex items-center justify-center">
              <Upload className="w-8 h-8 text-teal-600" />
            </div>
            <h2 className="text-xl font-semibold text-[#134E4A]">
              {accounts.length === 0 ? "No FTP accounts" : "No accounts match filter"}
            </h2>
            <p className="text-muted-foreground text-center">
              {accounts.length === 0
                ? "Create your first FTP account to enable file uploads."
                : "Try selecting a different user."}
            </p>
          </div>
        </GlassCard>
      ) : (
        <div className="grid gap-4">
          {filtered.map((acc) => (
            <GlassCard
              key={`${acc.user}-${acc.domain}-${acc.ftpUser}`}
              className="p-5 transition-all hover:shadow-md"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Left: Icon + Info */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center shrink-0">
                    <Upload className="w-6 h-6 text-teal-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-[#134E4A]">{acc.ftpUser}</h3>
                      <Badge className="bg-violet-100 text-violet-700 border-violet-200">
                        {acc.domain}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        {acc.user}
                      </span>
                      <span className="flex items-center gap-1">
                        <Server className="w-3.5 h-3.5" />
                        {FTP_HOST}:21
                      </span>
                      {acc.path && (
                        <span className="flex items-center gap-1">
                          <FolderOpen className="w-3.5 h-3.5" />
                          {acc.path}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="cursor-pointer h-8 px-2"
                    title="Copy username"
                    onClick={() => copyToClipboard(acc.ftpUser)}
                  >
                    <Copy className="h-4 w-4 text-slate-500" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="cursor-pointer h-8 px-2"
                    title="Change password"
                    onClick={() => {
                      setPasswordTarget(acc);
                      setNewPassword("");
                      setShowPassword(false);
                      setPasswordOpen(true);
                    }}
                  >
                    <Key className="h-4 w-4 text-amber-500" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="cursor-pointer h-8 px-2"
                    title="Delete"
                    onClick={() => {
                      setDeleteTarget(acc);
                      setDeleteOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Create FTP Account Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create FTP Account</DialogTitle>
            <DialogDescription>
              Create a new FTP account for a domain.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>User</Label>
              <Select
                value={createForm.user}
                onValueChange={(val) =>
                  setCreateForm((f) => ({ ...f, user: val || "", domain: "" }))
                }
              >
                <SelectTrigger className="w-full cursor-pointer">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.username} value={u.username} className="cursor-pointer">
                      {u.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Domain</Label>
              <Select
                value={createForm.domain}
                onValueChange={(val) => setCreateForm((f) => ({ ...f, domain: val || "" }))}
                disabled={!createForm.user}
              >
                <SelectTrigger className="w-full cursor-pointer">
                  <SelectValue placeholder={createForm.user ? "Select domain" : "Select user first"} />
                </SelectTrigger>
                <SelectContent>
                  {userDomains.map((d) => (
                    <SelectItem key={d.domain} value={d.domain} className="cursor-pointer">
                      {d.domain}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>FTP Username</Label>
              <Input
                placeholder="ftpuser"
                value={createForm.ftp_user}
                onChange={(e) => setCreateForm((f) => ({ ...f, ftp_user: e.target.value }))}
              />
              {createForm.user && createForm.ftp_user && (
                <p className="text-xs text-muted-foreground">
                  Login: <span className="font-mono text-teal-600">{createForm.user}_{createForm.ftp_user}</span>
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label>Password</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showCreatePassword ? "text" : "password"}
                    placeholder="Password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    onClick={() => setShowCreatePassword(!showCreatePassword)}
                  >
                    {showCreatePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer shrink-0"
                  onClick={() => {
                    const pwd = generatePassword();
                    setCreateForm((f) => ({ ...f, password: pwd }));
                    setShowCreatePassword(true);
                  }}
                >
                  Generate
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              className="bg-teal-600 text-white hover:bg-teal-700 cursor-pointer"
              onClick={handleCreate}
              disabled={createLoading}
            >
              {createLoading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change FTP Password</DialogTitle>
            <DialogDescription>
              Set a new password for <strong>{passwordTarget?.ftpUser}</strong> ({passwordTarget?.domain})
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>New Password</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer shrink-0"
                  onClick={() => {
                    setNewPassword(generatePassword());
                    setShowPassword(true);
                  }}
                >
                  Generate
                </Button>
              </div>
              {newPassword && showPassword && (
                <button
                  className="flex items-center gap-1 text-xs text-teal-600 hover:underline cursor-pointer w-fit"
                  onClick={() => copyToClipboard(newPassword)}
                >
                  <Copy className="h-3 w-3" />
                  Copy password
                </button>
              )}
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              className="bg-amber-600 text-white hover:bg-amber-700 cursor-pointer"
              onClick={handleChangePassword}
              disabled={passwordLoading || !newPassword}
            >
              {passwordLoading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Change Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete FTP Account</DialogTitle>
            <DialogDescription>
              Delete FTP account <strong className="text-red-600">{deleteTarget?.ftpUser}</strong> for domain{" "}
              <strong>{deleteTarget?.domain}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              variant="destructive"
              className="cursor-pointer"
              onClick={handleDelete}
              disabled={deleteLoading}
            >
              {deleteLoading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
