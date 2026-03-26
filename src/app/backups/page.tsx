"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, RefreshCw, Archive, Loader2, Download } from "lucide-react";
import { GlassCard } from "@/components/layout/glass-card";
import { Button } from "@/components/ui/button";
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

interface Backup {
  filename: string;
  user: string;
  SIZE: string;
  DATE: string;
  TIME: string;
  RUNTIME: string;
  WEB: string;
  MAIL: string;
  DB: string;
  CRON: string;
  UDIR: string;
}

interface User {
  username: string;
}

function formatSize(sizeMb: string): string {
  const num = parseInt(sizeMb, 10);
  if (isNaN(num)) return sizeMb;
  if (num > 1024) {
    return `${(num / 1024).toFixed(1)} GB`;
  }
  return `${num} MB`;
}

export default function BackupsPage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setError(err.message || "Failed to fetch backups");
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
    } catch {
      // Non-critical, silently fail
    }
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
      alert(err.message || "Failed to schedule backup");
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
        body: JSON.stringify({
          user: restoreTarget.user,
          backup: restoreTarget.filename,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to restore backup");
      setRestoreDialogOpen(false);
      setRestoreTarget(null);
      await fetchBackups();
    } catch (err: any) {
      alert(err.message || "Failed to restore backup");
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
      if (!res.ok || data.error) throw new Error(data.error || "Failed to delete backup");
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      await fetchBackups();
    } catch (err: any) {
      alert(err.message || "Failed to delete backup");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#134E4A]">Backups</h1>
        <Button
          className="bg-teal-600 text-white hover:bg-teal-700 cursor-pointer"
          onClick={() => setCreateDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Create Backup
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
            <span className="ml-2 text-sm text-muted-foreground">Loading backups...</span>
          </div>
        ) : backups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-teal-100 flex items-center justify-center">
              <Archive className="w-8 h-8 text-teal-600" />
            </div>
            <p className="text-sm text-muted-foreground">No backups found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Filename</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Runtime</TableHead>
                <TableHead>Includes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {backups.map((backup) => (
                <TableRow key={`${backup.user}-${backup.filename}`}>
                  <TableCell className="font-medium text-[#134E4A]">
                    {backup.filename}
                  </TableCell>
                  <TableCell>{backup.user}</TableCell>
                  <TableCell>{formatSize(backup.SIZE)}</TableCell>
                  <TableCell>{backup.DATE}</TableCell>
                  <TableCell>{backup.TIME}</TableCell>
                  <TableCell>{backup.RUNTIME}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {backup.WEB === "yes" && (
                        <Badge className="bg-teal-100 text-teal-700 border-teal-200">
                          Web
                        </Badge>
                      )}
                      {backup.MAIL === "yes" && (
                        <Badge className="bg-violet-100 text-violet-700 border-violet-200">
                          Mail
                        </Badge>
                      )}
                      {backup.DB === "yes" && (
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                          DB
                        </Badge>
                      )}
                      {backup.CRON === "yes" && (
                        <Badge className="bg-slate-100 text-slate-700 border-slate-200">
                          Cron
                        </Badge>
                      )}
                      {backup.UDIR === "yes" && (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                          Dir
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="cursor-pointer text-teal-600 border-teal-300 hover:bg-teal-50"
                        onClick={() => {
                          setRestoreTarget(backup);
                          setRestoreDialogOpen(true);
                        }}
                      >
                        <RefreshCw className="h-4 w-4" />
                        Restore
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="cursor-pointer text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => {
                          setDeleteTarget(backup);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </GlassCard>

      {/* Create Backup Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Backup</DialogTitle>
            <DialogDescription>
              Schedule a new backup for a user. The backup will be created in the background.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-[#134E4A]">User</label>
              <Select
                value={createUser}
                onValueChange={(val) => setCreateUser(val as string)}
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
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" className="cursor-pointer" />}>
              Cancel
            </DialogClose>
            <Button
              className="bg-teal-600 text-white hover:bg-teal-700 cursor-pointer"
              onClick={handleCreateBackup}
              disabled={createLoading || !createUser}
            >
              {createLoading && <Loader2 className="h-4 w-4 animate-spin" />}
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
              This will restore user <strong>{restoreTarget?.user}</strong> data from
              backup <strong>{restoreTarget?.filename}</strong>. Current data may be
              overwritten.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" className="cursor-pointer" />}>
              Cancel
            </DialogClose>
            <Button
              className="bg-teal-600 text-white hover:bg-teal-700 cursor-pointer"
              onClick={handleRestore}
              disabled={restoreLoading}
            >
              {restoreLoading && <Loader2 className="h-4 w-4 animate-spin" />}
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
              <strong>{deleteTarget?.filename}</strong> for user{" "}
              <strong>{deleteTarget?.user}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" className="cursor-pointer" />}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              className="cursor-pointer"
              onClick={handleDelete}
              disabled={deleteLoading}
            >
              {deleteLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
