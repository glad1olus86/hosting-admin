"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Trash2,
  RefreshCw,
  Archive,
  Loader2,
  HardDrive,
  User,
  Globe,
  Database,
  Mail,
  Clock,
  FolderArchive,
  Calendar,
} from "lucide-react";
import { GlassCard } from "@/components/layout/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

interface Backup {
  filename: string;
  user: string;
  TYPE: string;
  SIZE: string;
  WEB: string;
  DNS: string;
  MAIL: string;
  DB: string;
  CRON: string;
  UDIR: string;
  RUNTIME: string;
  TIME: string;
  DATE: string;
}

interface HestiaUser {
  username: string;
}

function formatSize(sizeMb: string): string {
  const num = parseInt(sizeMb, 10);
  if (isNaN(num)) return sizeMb;
  if (num >= 1024) return `${(num / 1024).toFixed(1)} GB`;
  return `${num} MB`;
}

function hasContent(field: string): boolean {
  return !!field && field.trim().length > 0;
}

function countItems(field: string): number {
  if (!field || !field.trim()) return 0;
  return field.split(",").length;
}

export default function BackupsPage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [users, setUsers] = useState<HestiaUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterUser, setFilterUser] = useState<string>("all");

  // Create backup dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createUser, setCreateUser] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  // Restore dialog
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<Backup | null>(null);
  const [restoreLoading, setRestoreLoading] = useState(false);

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Backup | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchBackups = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/backups");
      if (!res.ok) throw new Error("Failed to fetch backups");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setBackups(data);
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

  useEffect(() => {
    fetchBackups();
    fetchUsers();
  }, [fetchBackups, fetchUsers]);

  const handleCreateBackup = async () => {
    if (!createUser) return;
    setCreateLoading(true);
    try {
      const res = await fetch("/api/backups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: createUser }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to schedule backup");
      setCreateDialogOpen(false);
      setCreateUser("");
      await fetchBackups();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreTarget) return;
    setRestoreLoading(true);
    try {
      const res = await fetch("/api/backups", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: restoreTarget.user, backup: restoreTarget.filename }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to restore");
      setRestoreDialogOpen(false);
      setRestoreTarget(null);
      await fetchBackups();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRestoreLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(
        `/api/backups?user=${encodeURIComponent(deleteTarget.user)}&backup=${encodeURIComponent(deleteTarget.filename)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to delete");
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      await fetchBackups();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const filtered = backups.filter((b) => filterUser === "all" || b.user === filterUser);
  const totalSize = backups.reduce((sum, b) => sum + parseInt(b.SIZE || "0", 10), 0);
  const uniqueUsers = [...new Set(backups.map((b) => b.user))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#134E4A]">Backups</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage server backups and restore points
          </p>
        </div>
        <Button
          className="bg-teal-600 text-white hover:bg-teal-700 cursor-pointer"
          onClick={() => setCreateDialogOpen(true)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Create Backup
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
              <Archive className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#134E4A]">{backups.length}</p>
              <p className="text-xs text-muted-foreground">Total Backups</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#134E4A]">{formatSize(String(totalSize))}</p>
              <p className="text-xs text-muted-foreground">Total Size</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
              <User className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#134E4A]">{uniqueUsers.length}</p>
              <p className="text-xs text-muted-foreground">Users</p>
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
            <span className="ml-2 text-sm text-muted-foreground">Loading backups...</span>
          </div>
        </GlassCard>
      ) : filtered.length === 0 ? (
        <GlassCard className="p-16">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-teal-100 flex items-center justify-center">
              <Archive className="w-8 h-8 text-teal-600" />
            </div>
            <h2 className="text-xl font-semibold text-[#134E4A]">
              {backups.length === 0 ? "No backups yet" : "No backups match filter"}
            </h2>
            <p className="text-muted-foreground text-center">
              {backups.length === 0
                ? "Create your first backup to protect your data."
                : "Try selecting a different user."}
            </p>
          </div>
        </GlassCard>
      ) : (
        <div className="grid gap-4">
          {filtered.map((backup) => {
            const webDomains = hasContent(backup.WEB) ? backup.WEB.split(",") : [];
            const mailDomains = hasContent(backup.MAIL) ? backup.MAIL.split(",") : [];
            const dbList = hasContent(backup.DB) ? backup.DB.split(",") : [];
            const dnsDomains = hasContent(backup.DNS) ? backup.DNS.split(",") : [];

            return (
              <GlassCard
                key={`${backup.user}-${backup.filename}`}
                className="p-5 transition-all hover:shadow-md"
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  {/* Left: Icon + Info */}
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center shrink-0">
                      <FolderArchive className="w-6 h-6 text-teal-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-[#134E4A] text-sm truncate">
                          {backup.filename}
                        </h3>
                        <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-[10px]">
                          {backup.TYPE}
                        </Badge>
                      </div>

                      {/* Meta row */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          {backup.user}
                        </span>
                        <span className="flex items-center gap-1">
                          <HardDrive className="w-3.5 h-3.5" />
                          {formatSize(backup.SIZE)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {backup.DATE}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {backup.TIME}
                        </span>
                        {backup.RUNTIME && (
                          <span className="text-xs text-slate-400">
                            {backup.RUNTIME} min
                          </span>
                        )}
                      </div>

                      {/* Includes badges */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {webDomains.length > 0 && (
                          <Badge className="bg-teal-100 text-teal-700 border-teal-200 text-[11px]">
                            <Globe className="w-3 h-3 mr-1" />
                            Web ({webDomains.length})
                          </Badge>
                        )}
                        {dnsDomains.length > 0 && (
                          <Badge className="bg-cyan-100 text-cyan-700 border-cyan-200 text-[11px]">
                            <Globe className="w-3 h-3 mr-1" />
                            DNS ({dnsDomains.length})
                          </Badge>
                        )}
                        {mailDomains.length > 0 && (
                          <Badge className="bg-violet-100 text-violet-700 border-violet-200 text-[11px]">
                            <Mail className="w-3 h-3 mr-1" />
                            Mail ({mailDomains.length})
                          </Badge>
                        )}
                        {dbList.length > 0 && (
                          <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[11px]">
                            <Database className="w-3 h-3 mr-1" />
                            DB ({dbList.length})
                          </Badge>
                        )}
                        {hasContent(backup.CRON) && (
                          <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-[11px]">
                            <Clock className="w-3 h-3 mr-1" />
                            Cron
                          </Badge>
                        )}
                        {hasContent(backup.UDIR) && (
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[11px]">
                            <FolderArchive className="w-3 h-3 mr-1" />
                            User Dir
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="cursor-pointer border-teal-300 text-teal-700 hover:bg-teal-50 h-8"
                      onClick={() => {
                        setRestoreTarget(backup);
                        setRestoreDialogOpen(true);
                      }}
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Restore
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="cursor-pointer h-8 px-2"
                      title="Delete backup"
                      onClick={() => {
                        setDeleteTarget(backup);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Create Backup Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Backup</DialogTitle>
            <DialogDescription>
              Schedule a new backup. It will be created in the background.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-[#134E4A]">User</label>
              <Select value={createUser} onValueChange={(val) => setCreateUser(val || "")}>
                <SelectTrigger className="w-full cursor-pointer">
                  <SelectValue placeholder="Select a user" />
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
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              className="bg-teal-600 text-white hover:bg-teal-700 cursor-pointer"
              onClick={handleCreateBackup}
              disabled={createLoading || !createUser}
            >
              {createLoading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Create Backup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Backup</DialogTitle>
            <DialogDescription>
              Restore user <strong>{restoreTarget?.user}</strong> from backup{" "}
              <strong>{restoreTarget?.filename}</strong>?
              Current data may be overwritten. The restore will run in the background.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              className="bg-teal-600 text-white hover:bg-teal-700 cursor-pointer"
              onClick={handleRestore}
              disabled={restoreLoading}
            >
              {restoreLoading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Backup</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete backup{" "}
              <strong className="text-red-600">{deleteTarget?.filename}</strong>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
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
