"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Database, Loader2 } from "lucide-react";
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

interface HestiaDatabase {
  name: string;
  user: string;
  TYPE: string;
  HOST: string;
  CHARSETS: string;
  U_DISK: string;
  DATABASE: string;
  DBUSER: string;
}

interface HestiaUser {
  username: string;
}

export default function DatabasesPage() {
  const [databases, setDatabases] = useState<HestiaDatabase[]>([]);
  const [users, setUsers] = useState<HestiaUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add database dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    user: "",
    db_name: "",
    db_user: "",
    db_password: "",
    type: "mysql",
  });
  const [addLoading, setAddLoading] = useState(false);

  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    user: string;
    name: string;
  } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchDatabases = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/databases");
      if (!res.ok) throw new Error("Failed to fetch databases");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDatabases(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch databases");
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
    fetchDatabases();
    fetchUsers();
  }, [fetchDatabases, fetchUsers]);

  const handleAddDatabase = async () => {
    if (
      !addForm.user ||
      !addForm.db_name ||
      !addForm.db_user ||
      !addForm.db_password
    ) {
      alert("Please fill in all required fields.");
      return;
    }
    setAddLoading(true);
    try {
      const res = await fetch("/api/databases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (!res.ok || data.error)
        throw new Error(data.error || "Failed to add database");
      setAddDialogOpen(false);
      setAddForm({
        user: "",
        db_name: "",
        db_user: "",
        db_password: "",
        type: "mysql",
      });
      await fetchDatabases();
    } catch (err: any) {
      alert(err.message || "Failed to add database");
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeleteDatabase = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(
        `/api/databases?user=${encodeURIComponent(deleteTarget.user)}&db_name=${encodeURIComponent(deleteTarget.name)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok || data.error)
        throw new Error(data.error || "Failed to delete database");
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      await fetchDatabases();
    } catch (err: any) {
      alert(err.message || "Failed to delete database");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#134E4A]">Databases</h1>
        <Button
          className="bg-teal-600 text-white hover:bg-teal-700 cursor-pointer"
          onClick={() => setAddDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Add Database
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
              Loading databases...
            </span>
          </div>
        ) : databases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-teal-100 flex items-center justify-center">
              <Database className="w-8 h-8 text-teal-600" />
            </div>
            <h2 className="text-xl font-semibold text-[#134E4A]">
              No databases found
            </h2>
            <p className="text-muted-foreground">
              Create your first database to get started.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Database Name</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Charset</TableHead>
                <TableHead>Disk Used</TableHead>
                <TableHead>DB User</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {databases.map((db) => {
                const dbType = (db.TYPE || "mysql").toLowerCase();
                return (
                  <TableRow key={`${db.user}-${db.name}`}>
                    <TableCell className="font-medium text-[#134E4A]">
                      {db.name}
                    </TableCell>
                    <TableCell>{db.user}</TableCell>
                    <TableCell>
                      {dbType === "pgsql" ? (
                        <Badge className="bg-violet-100 text-violet-700 border-violet-200">
                          pgsql
                        </Badge>
                      ) : (
                        <Badge className="bg-teal-100 text-teal-700 border-teal-200">
                          mysql
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{db.CHARSETS}</TableCell>
                    <TableCell>{db.U_DISK} MB</TableCell>
                    <TableCell>{db.DBUSER}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="cursor-pointer"
                        onClick={() => {
                          setDeleteTarget({
                            user: db.user,
                            name: db.name,
                          });
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </GlassCard>

      {/* Add Database Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Database</DialogTitle>
            <DialogDescription>
              Create a new database on the server.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>User</Label>
              <Select
                value={addForm.user}
                onValueChange={(val) =>
                  setAddForm((f) => ({ ...f, user: val as string }))
                }
              >
                <SelectTrigger className="w-full cursor-pointer">
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem
                      key={u.username}
                      value={u.username}
                      className="cursor-pointer"
                    >
                      {u.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-db-name">Database Name</Label>
              <Input
                id="add-db-name"
                placeholder="my_database"
                value={addForm.db_name}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, db_name: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-db-user">Database User</Label>
              <Input
                id="add-db-user"
                placeholder="db_user"
                value={addForm.db_user}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, db_user: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-db-password">Password</Label>
              <Input
                id="add-db-password"
                type="password"
                placeholder="Password"
                value={addForm.db_password}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, db_password: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select
                value={addForm.type}
                onValueChange={(val) =>
                  setAddForm((f) => ({ ...f, type: val as string }))
                }
              >
                <SelectTrigger className="w-full cursor-pointer">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mysql" className="cursor-pointer">
                    MySQL
                  </SelectItem>
                  <SelectItem value="pgsql" className="cursor-pointer">
                    PostgreSQL
                  </SelectItem>
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
              onClick={handleAddDatabase}
              disabled={addLoading}
            >
              {addLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Database
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Database</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete database{" "}
              <strong>{deleteTarget?.name}</strong>? This action cannot be undone
              and will permanently remove the database and all its data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              className="cursor-pointer"
              onClick={handleDeleteDatabase}
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
