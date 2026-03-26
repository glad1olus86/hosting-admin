"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Ban, CheckCircle, Loader2 } from "lucide-react";
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

export default function UsersPage() {
  const [users, setUsers] = useState<HestiaUser[]>([]);
  const [packages, setPackages] = useState<HestiaPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add user dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    username: "",
    password: "",
    email: "",
    package_name: "",
  });
  const [addLoading, setAddLoading] = useState(false);

  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Suspend/unsuspend loading
  const [suspendLoading, setSuspendLoading] = useState<string | null>(null);

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
      // Non-critical, silently fail
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchPackages();
  }, [fetchUsers, fetchPackages]);

  const handleAddUser = async () => {
    if (!addForm.username || !addForm.password || !addForm.email) {
      alert("Please fill in all required fields.");
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
      if (!res.ok || data.error) throw new Error(data.error || "Failed to add user");
      setAddDialogOpen(false);
      setAddForm({ username: "", password: "", email: "", package_name: "" });
      await fetchUsers();
    } catch (err: any) {
      alert(err.message || "Failed to add user");
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/users?username=${encodeURIComponent(deleteTarget)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to delete user");
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      await fetchUsers();
    } catch (err: any) {
      alert(err.message || "Failed to delete user");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSuspendToggle = async (username: string, isSuspended: boolean) => {
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
      alert(err.message || "Failed to update user status");
    } finally {
      setSuspendLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#134E4A]">Users</h1>
        <Button
          className="bg-teal-600 text-white hover:bg-teal-700"
          onClick={() => setAddDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Add User
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
            <span className="ml-2 text-sm text-muted-foreground">Loading users...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">No users found.</p>
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

      {/* Add User Dialog */}
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
            <DialogClose
              render={<Button variant="outline" />}
            >
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

      {/* Delete Confirmation Dialog */}
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
            <DialogClose
              render={<Button variant="outline" />}
            >
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
    </div>
  );
}
