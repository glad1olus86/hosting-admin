"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Trash2,
  Ban,
  CheckCircle,
  Loader2,
  Pencil,
  RefreshCw,
  Copy,
  Check,
  Link2,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/contexts/toast-context";

// ─── Types ────────────────────────────────────────────────────

interface HestiaUser {
  username: string;
  FNAME: string;
  LNAME: string;
  PACKAGE: string;
  WEB_DOMAINS: string;
  DATABASES: string;
  MAIL_DOMAINS: string;
  DISK_USED: string;
  BANDWIDTH: string;
  SUSPENDED: string;
  IP_OWNED: string;
  U_DISK: string;
  U_BANDWIDTH: string;
  CONTACT: string;
}

interface HestiaPackage {
  name: string;
}

interface DashboardAccount {
  id: number;
  username: string;
  email: string;
  role: string;
  createdAt: string;
  linkedUsers: string[];
}

// ─── Password generator ──────────────────────────────────────

function generatePassword(length = 16): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*";
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => chars[b % chars.length]).join("");
}

// ─── Page ─────────────────────────────────────────────────────

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("system");

  // ── System Users state ────────────────────────────────────
  const [users, setUsers] = useState<HestiaUser[]>([]);
  const [packages, setPackages] = useState<HestiaPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    username: "",
    password: "",
    email: "",
    package_name: "",
  });
  const [addLoading, setAddLoading] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [suspendLoading, setSuspendLoading] = useState<string | null>(null);

  // ── Dashboard Accounts state ──────────────────────────────
  const [accounts, setAccounts] = useState<DashboardAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountsError, setAccountsError] = useState<string | null>(null);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<DashboardAccount | null>(null);
  const [editForm, setEditForm] = useState({
    email: "",
    password: "",
    role: "user" as "admin" | "user",
    linkedUsers: [] as string[],
  });
  const [editSaving, setEditSaving] = useState(false);

  const [deleteAccountDialogOpen, setDeleteAccountDialogOpen] = useState(false);
  const [deleteAccountTarget, setDeleteAccountTarget] =
    useState<DashboardAccount | null>(null);
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);

  const [systemUsernames, setSystemUsernames] = useState<string[]>([]);
  const [systemUsernamesLoading, setSystemUsernamesLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // ── Fetchers ──────────────────────────────────────────────

  const fetchUsers = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setUsers(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPackages = useCallback(async () => {
    try {
      const res = await fetch("/api/packages");
      if (!res.ok) return;
      const data = await res.json();
      if (!data.error) setPackages(data);
    } catch {
      // Non-critical
    }
  }, []);

  const fetchAccounts = useCallback(async () => {
    try {
      setAccountsError(null);
      const res = await fetch("/api/accounts");
      if (!res.ok) throw new Error("Failed to fetch accounts");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAccounts(data);
    } catch (err: any) {
      setAccountsError(err.message || "Failed to fetch accounts");
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  const fetchSystemUsernames = useCallback(async () => {
    setSystemUsernamesLoading(true);
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setSystemUsernames(data.map((u: any) => u.username));
      }
    } catch {
      // ignore
    } finally {
      setSystemUsernamesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchPackages();
    fetchAccounts();
  }, [fetchUsers, fetchPackages, fetchAccounts]);

  // ── System Users handlers ─────────────────────────────────

  const handleAddUser = async () => {
    if (!addForm.username || !addForm.password || !addForm.email) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setAddLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (!res.ok || data.error)
        throw new Error(data.error || "Failed to add user");
      setAddDialogOpen(false);
      setAddForm({ username: "", password: "", email: "", package_name: "" });
      await fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Failed to add user");
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(
        `/api/users?username=${encodeURIComponent(deleteTarget)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok || data.error)
        throw new Error(data.error || "Failed to delete user");
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      await fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete user");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSuspendToggle = async (
    username: string,
    isSuspended: boolean
  ) => {
    setSuspendLoading(username);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          action: isSuspended ? "unsuspend" : "suspend",
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error)
        throw new Error(data.error || "Failed to update user status");
      await fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Failed to update user status");
    } finally {
      setSuspendLoading(null);
    }
  };

  // ── Dashboard Accounts handlers ───────────────────────────

  function openEditDialog(account: DashboardAccount) {
    setEditAccount(account);
    setEditForm({
      email: account.email,
      password: "",
      role: account.role as "admin" | "user",
      linkedUsers: [...account.linkedUsers],
    });
    setEditDialogOpen(true);
    fetchSystemUsernames();
  }

  function toggleLinkedUser(username: string) {
    setEditForm((f) => ({
      ...f,
      linkedUsers: f.linkedUsers.includes(username)
        ? f.linkedUsers.filter((u) => u !== username)
        : [...f.linkedUsers, username],
    }));
  }

  async function handleCopyPassword() {
    await navigator.clipboard.writeText(editForm.password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleEditSave() {
    if (!editAccount) return;
    setEditSaving(true);

    try {
      const promises: Promise<Response>[] = [];

      // Change email if different
      if (editForm.email !== editAccount.email) {
        promises.push(
          fetch("/api/accounts", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: editAccount.id,
              action: "change_email",
              email: editForm.email,
            }),
          })
        );
      }

      // Change role if different
      if (editForm.role !== editAccount.role) {
        promises.push(
          fetch("/api/accounts", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: editAccount.id,
              action: "change_role",
              role: editForm.role,
            }),
          })
        );
      }

      // Reset password if provided
      if (editForm.password) {
        promises.push(
          fetch("/api/accounts", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: editAccount.id,
              action: "reset_password",
              password: editForm.password,
            }),
          })
        );
      }

      // Update links if changed
      const linksChanged =
        editForm.linkedUsers.length !== editAccount.linkedUsers.length ||
        editForm.linkedUsers.some(
          (u) => !editAccount.linkedUsers.includes(u)
        );
      if (linksChanged) {
        promises.push(
          fetch("/api/accounts", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: editAccount.id,
              action: "update_links",
              linkedUsers: editForm.linkedUsers,
            }),
          })
        );
      }

      if (promises.length === 0) {
        setEditDialogOpen(false);
        return;
      }

      const results = await Promise.all(promises);
      for (const res of results) {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to update account");
        }
      }

      setEditDialogOpen(false);
      await fetchAccounts();
    } catch (err: any) {
      toast.error(err.message || "Failed to update account");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDeleteAccount() {
    if (!deleteAccountTarget) return;
    setDeleteAccountLoading(true);
    try {
      const res = await fetch("/api/accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteAccountTarget.id }),
      });
      const data = await res.json();
      if (!res.ok || data.error)
        throw new Error(data.error || "Failed to delete account");
      setDeleteAccountDialogOpen(false);
      setDeleteAccountTarget(null);
      await fetchAccounts();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete account");
    } finally {
      setDeleteAccountLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <Tabs
        defaultValue="system"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#134E4A]">Users</h1>
          <div className="flex items-center gap-3">
            <TabsList variant="line">
              <TabsTrigger value="system">System Users</TabsTrigger>
              <TabsTrigger value="accounts">Dashboard Accounts</TabsTrigger>
            </TabsList>
            {activeTab === "system" && (
              <Button
                className="bg-teal-600 text-white hover:bg-teal-700"
                onClick={() => setAddDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Add User
              </Button>
            )}
          </div>
        </div>

        {/* ─── System Users Tab ──────────────────────────── */}
        <TabsContent value="system">
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
                  Loading users...
                </span>
              </div>
            ) : users.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-sm text-muted-foreground">
                  No users found.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead>Domains</TableHead>
                    <TableHead>Disk Used</TableHead>
                    <TableHead>Bandwidth</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const isSuspended = user.SUSPENDED !== "no";
                    return (
                      <TableRow key={user.username}>
                        <TableCell className="font-medium text-[#134E4A]">
                          {user.username}
                        </TableCell>
                        <TableCell>{user.CONTACT}</TableCell>
                        <TableCell>{user.PACKAGE}</TableCell>
                        <TableCell>{user.WEB_DOMAINS}</TableCell>
                        <TableCell>{user.U_DISK} MB</TableCell>
                        <TableCell>{user.U_BANDWIDTH} MB</TableCell>
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
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={suspendLoading === user.username}
                              onClick={() =>
                                handleSuspendToggle(user.username, isSuspended)
                              }
                              title={isSuspended ? "Unsuspend" : "Suspend"}
                            >
                              {suspendLoading === user.username ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : isSuspended ? (
                                <CheckCircle className="h-4 w-4 text-emerald-500" />
                              ) : (
                                <Ban className="h-4 w-4 text-amber-500" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDeleteTarget(user.username);
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
        </TabsContent>

        {/* ─── Dashboard Accounts Tab ────────────────────── */}
        <TabsContent value="accounts">
          {accountsError && (
            <GlassCard className="border-red-200 bg-red-50/70">
              <p className="text-sm text-red-600">{accountsError}</p>
            </GlassCard>
          )}

          <GlassCard>
            {accountsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Loading accounts...
                </span>
              </div>
            ) : accounts.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-sm text-muted-foreground">
                  No dashboard accounts found.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Linked Users</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => {
                    const isSelf = currentUser?.id === account.id;
                    return (
                      <TableRow key={account.id}>
                        <TableCell className="font-medium text-[#134E4A]">
                          {account.username}
                          {isSelf && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              (you)
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{account.email}</TableCell>
                        <TableCell>
                          {account.role === "admin" ? (
                            <Badge className="bg-violet-100 text-violet-700 border-violet-200">
                              Admin
                            </Badge>
                          ) : (
                            <Badge className="bg-teal-100 text-teal-700 border-teal-200">
                              User
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {account.linkedUsers.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {account.linkedUsers.map((u) => (
                                <span
                                  key={u}
                                  className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-600"
                                >
                                  <Link2 className="h-3 w-3" />
                                  {u}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(account.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(account)}
                              title="Edit account"
                            >
                              <Pencil className="h-4 w-4 text-teal-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={isSelf}
                              onClick={() => {
                                setDeleteAccountTarget(account);
                                setDeleteAccountDialogOpen(true);
                              }}
                              title={
                                isSelf
                                  ? "Cannot delete your own account"
                                  : "Delete account"
                              }
                            >
                              <Trash2
                                className={`h-4 w-4 ${isSelf ? "text-muted-foreground/30" : "text-red-500"}`}
                              />
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
        </TabsContent>
      </Tabs>

      {/* ─── Add System User Dialog ──────────────────────── */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new hosting account on the server.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="add-username">Username</Label>
              <Input
                id="add-username"
                placeholder="username"
                value={addForm.username}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, username: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-password">Password</Label>
              <Input
                id="add-password"
                type="password"
                placeholder="Password"
                value={addForm.password}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, password: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-email">Email</Label>
              <Input
                id="add-email"
                type="email"
                placeholder="user@example.com"
                value={addForm.email}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Package</Label>
              <Select
                value={addForm.package_name}
                onValueChange={(val) =>
                  setAddForm((f) => ({ ...f, package_name: val as string }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a package" />
                </SelectTrigger>
                <SelectContent>
                  {packages.map((pkg) => (
                    <SelectItem key={pkg.name} value={pkg.name}>
                      {pkg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              className="bg-teal-600 text-white hover:bg-teal-700"
              onClick={handleAddUser}
              disabled={addLoading}
            >
              {addLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete System User Dialog ───────────────────── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete user{" "}
              <strong>{deleteTarget}</strong>? This action cannot be undone and
              will remove all associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={deleteLoading}
            >
              {deleteLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Account Dialog ─────────────────────────── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              Edit Account —{" "}
              <span className="text-teal-600">{editAccount?.username}</span>
            </DialogTitle>
            <DialogDescription>
              Update account settings. Leave password empty to keep current.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-password">New Password</Label>
              <div className="flex gap-2">
                <Input
                  id="edit-password"
                  value={editForm.password}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, password: e.target.value }))
                  }
                  placeholder="Leave empty to keep current"
                  className="flex-1 font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    setEditForm((f) => ({
                      ...f,
                      password: generatePassword(),
                    }))
                  }
                  title="Generate new password"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopyPassword}
                  disabled={!editForm.password}
                  title="Copy password"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Role */}
            <div className="space-y-1.5">
              <Label>Role</Label>
              <div className="flex gap-2">
                {(["user", "admin"] as const).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setEditForm((f) => ({ ...f, role }))}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      editForm.role === role
                        ? role === "admin"
                          ? "border-violet-300 bg-violet-50 text-violet-700"
                          : "border-teal-300 bg-teal-50 text-teal-700"
                        : "border-input bg-transparent text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Linked Users */}
            <div className="space-y-1.5">
              <Label>Linked System Users</Label>
              <div className="max-h-[160px] overflow-y-auto rounded-lg border border-input p-2">
                {systemUsernamesLoading ? (
                  <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading users...
                  </div>
                ) : systemUsernames.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No system users found
                  </p>
                ) : (
                  <div className="space-y-1">
                    {systemUsernames.map((username) => (
                      <label
                        key={username}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted/50"
                      >
                        <input
                          type="checkbox"
                          checked={editForm.linkedUsers.includes(username)}
                          onChange={() => toggleLinkedUser(username)}
                          className="h-4 w-4 rounded border-input accent-teal-600"
                        />
                        <span className="font-mono text-xs">{username}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {editForm.linkedUsers.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {editForm.linkedUsers.length} user(s) linked
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              className="bg-teal-600 text-white hover:bg-teal-700"
              onClick={handleEditSave}
              disabled={editSaving}
            >
              {editSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Account Dialog ───────────────────────── */}
      <Dialog
        open={deleteAccountDialogOpen}
        onOpenChange={setDeleteAccountDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete dashboard account{" "}
              <strong>{deleteAccountTarget?.username}</strong>? This will remove
              the account and all its system user links.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleteAccountLoading}
            >
              {deleteAccountLoading && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
