"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Trash2,
  ShieldCheck,
  ShieldOff,
  Loader2,
  Shield,
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

export default function DomainsPage() {
  const [domains, setDomains] = useState<HestiaDomain[]>([]);
  const [users, setUsers] = useState<HestiaUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track which domains are currently getting SSL
  const [sslLoading, setSslLoading] = useState<Set<string>>(new Set());

  // Add domain dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    user: "",
    domain: "",
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

  useEffect(() => {
    fetchDomains();
    fetchUsers();
  }, [fetchDomains, fetchUsers]);

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
        body: JSON.stringify({ user: addForm.user, domain: addForm.domain }),
      });
      const data = await res.json();
      if (!res.ok || data.error)
        throw new Error(data.error || "Failed to add domain");

      const wantSsl = addForm.ssl;
      const domainUser = addForm.user;
      const domainName = addForm.domain;

      // Close dialog and reset form immediately
      setAddDialogOpen(false);
      setAddForm({ user: "", domain: "", ssl: false });

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
                      <Button
                        variant="ghost"
                        size="sm"
                        className="cursor-pointer"
                        onClick={() => {
                          setDeleteTarget({ user: d.user, domain: d.domain });
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
    </div>
  );
}
