"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Globe, Eye, Loader2 } from "lucide-react";
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

interface DnsZone {
  domain: string;
  user: string;
  RECORDS: string;
  SOA: string;
  TTL: string;
  IP: string;
}

interface DnsRecord {
  id: string;
  domain: string;
  user: string;
  RECORD: string;
  TYPE: string;
  VALUE: string;
  PRIORITY: string;
  SUSPENDED: string;
}

const TYPE_BADGE_COLORS: Record<string, string> = {
  A: "bg-teal-100 text-teal-700",
  AAAA: "bg-cyan-100 text-cyan-700",
  CNAME: "bg-violet-100 text-violet-700",
  MX: "bg-amber-100 text-amber-700",
  TXT: "bg-slate-100 text-slate-700",
  SRV: "bg-rose-100 text-rose-700",
  NS: "bg-emerald-100 text-emerald-700",
};

const DNS_RECORD_TYPES = ["A", "AAAA", "CNAME", "MX", "TXT", "SRV", "NS"];

export default function DnsPage() {
  // --- DNS Zones state ---
  const [zones, setZones] = useState<DnsZone[]>([]);
  const [zonesLoading, setZonesLoading] = useState(true);
  const [zonesError, setZonesError] = useState<string | null>(null);

  // --- Selected zone / DNS Records state ---
  const [selectedZone, setSelectedZone] = useState<DnsZone | null>(null);
  const [records, setRecords] = useState<DnsRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);

  // --- Add Record dialog ---
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    record: "",
    type: "",
    value: "",
    priority: "",
  });
  const [addLoading, setAddLoading] = useState(false);

  // --- Delete confirmation dialog ---
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DnsRecord | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // --- Fetch all DNS zones ---
  const fetchZones = useCallback(async () => {
    try {
      setZonesError(null);
      const res = await fetch("/api/dns");
      if (!res.ok) throw new Error("Failed to fetch DNS zones");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setZones(data);
    } catch (err: any) {
      setZonesError(err.message || "Failed to fetch DNS zones");
    } finally {
      setZonesLoading(false);
    }
  }, []);

  // --- Fetch DNS records for selected zone ---
  const fetchRecords = useCallback(async (user: string, domain: string) => {
    setRecordsLoading(true);
    setRecordsError(null);
    try {
      const res = await fetch(
        `/api/dns/records?user=${encodeURIComponent(user)}&domain=${encodeURIComponent(domain)}`
      );
      if (!res.ok) throw new Error("Failed to fetch DNS records");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setRecords(data);
    } catch (err: any) {
      setRecordsError(err.message || "Failed to fetch DNS records");
    } finally {
      setRecordsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchZones();
  }, [fetchZones]);

  // --- Select a zone to view records ---
  const handleViewRecords = (zone: DnsZone) => {
    setSelectedZone(zone);
    setRecords([]);
    fetchRecords(zone.user, zone.domain);
  };

  // --- Add Record handler ---
  const handleAddRecord = async () => {
    if (!selectedZone || !addForm.record || !addForm.type || !addForm.value) {
      alert("Please fill in all required fields.");
      return;
    }
    setAddLoading(true);
    try {
      const body: any = {
        user: selectedZone.user,
        domain: selectedZone.domain,
        record: addForm.record,
        type: addForm.type,
        value: addForm.value,
      };
      if (
        (addForm.type === "MX" || addForm.type === "SRV") &&
        addForm.priority
      ) {
        body.priority = addForm.priority;
      }
      const res = await fetch("/api/dns/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || data.error)
        throw new Error(data.error || "Failed to add DNS record");
      setAddDialogOpen(false);
      setAddForm({ record: "", type: "", value: "", priority: "" });
      await fetchRecords(selectedZone.user, selectedZone.domain);
    } catch (err: any) {
      alert(err.message || "Failed to add DNS record");
    } finally {
      setAddLoading(false);
    }
  };

  // --- Delete Record handler ---
  const handleDeleteRecord = async () => {
    if (!deleteTarget || !selectedZone) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(
        `/api/dns/records?user=${encodeURIComponent(selectedZone.user)}&domain=${encodeURIComponent(selectedZone.domain)}&id=${encodeURIComponent(deleteTarget.id)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok || data.error)
        throw new Error(data.error || "Failed to delete DNS record");
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      await fetchRecords(selectedZone.user, selectedZone.domain);
    } catch (err: any) {
      alert(err.message || "Failed to delete DNS record");
    } finally {
      setDeleteLoading(false);
    }
  };

  const showPriority = addForm.type === "MX" || addForm.type === "SRV";

  return (
    <div className="space-y-6">
      {/* ===== Section 1: DNS Zones ===== */}
      <h1 className="text-2xl font-bold text-[#134E4A]">DNS Zones</h1>

      {zonesError && (
        <GlassCard className="border-red-200 bg-red-50/70">
          <p className="text-sm text-red-600">{zonesError}</p>
        </GlassCard>
      )}

      <GlassCard>
        {zonesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
            <span className="ml-2 text-sm text-muted-foreground">
              Loading DNS zones...
            </span>
          </div>
        ) : zones.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <Globe className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No DNS zones found.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Domain</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Records</TableHead>
                <TableHead>SOA</TableHead>
                <TableHead>TTL</TableHead>
                <TableHead>IP</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {zones.map((zone) => (
                <TableRow key={`${zone.user}-${zone.domain}`}>
                  <TableCell className="font-medium text-[#134E4A]">
                    {zone.domain}
                  </TableCell>
                  <TableCell>{zone.user}</TableCell>
                  <TableCell>
                    <Badge className="bg-violet-100 text-violet-700 border-violet-200">
                      {zone.RECORDS}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {zone.SOA}
                  </TableCell>
                  <TableCell>{zone.TTL}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {zone.IP}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewRecords(zone)}
                    >
                      <Eye className="h-4 w-4 text-teal-600" />
                      <span className="ml-1">View Records</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </GlassCard>

      {/* ===== Section 2: DNS Records (shown when a zone is selected) ===== */}
      {selectedZone && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[#134E4A]">
              Records for {selectedZone.domain}
            </h2>
            <Button
              className="bg-teal-600 text-white hover:bg-teal-700"
              onClick={() => setAddDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add Record
            </Button>
          </div>

          {recordsError && (
            <GlassCard className="border-red-200 bg-red-50/70">
              <p className="text-sm text-red-600">{recordsError}</p>
            </GlassCard>
          )}

          <GlassCard>
            {recordsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Loading DNS records...
                </span>
              </div>
            ) : records.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <Globe className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  No DNS records found for this zone.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Record Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((rec) => (
                    <TableRow key={rec.id}>
                      <TableCell className="font-mono text-xs">
                        {rec.id}
                      </TableCell>
                      <TableCell className="font-medium text-[#134E4A]">
                        {rec.RECORD}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            TYPE_BADGE_COLORS[rec.TYPE] ||
                            "bg-gray-100 text-gray-700"
                          }
                        >
                          {rec.TYPE}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs max-w-[300px] truncate">
                        {rec.VALUE}
                      </TableCell>
                      <TableCell>{rec.PRIORITY || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDeleteTarget(rec);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </GlassCard>
        </>
      )}

      {/* ===== Add Record Dialog ===== */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add DNS Record</DialogTitle>
            <DialogDescription>
              Add a new DNS record to {selectedZone?.domain}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="add-record-name">Record Name</Label>
              <Input
                id="add-record-name"
                placeholder="e.g. www, mail, @"
                value={addForm.record}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, record: e.target.value }))
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
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select record type" />
                </SelectTrigger>
                <SelectContent>
                  {DNS_RECORD_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-record-value">Value</Label>
              <Input
                id="add-record-value"
                placeholder="e.g. 192.168.1.1"
                value={addForm.value}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, value: e.target.value }))
                }
              />
            </div>
            {showPriority && (
              <div className="grid gap-2">
                <Label htmlFor="add-record-priority">Priority</Label>
                <Input
                  id="add-record-priority"
                  type="number"
                  placeholder="e.g. 10"
                  value={addForm.priority}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, priority: e.target.value }))
                  }
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              className="bg-teal-600 text-white hover:bg-teal-700"
              onClick={handleAddRecord}
              disabled={addLoading}
            >
              {addLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Add Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Delete Confirmation Dialog ===== */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete DNS Record</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete record{" "}
              <strong>{deleteTarget?.RECORD}</strong> (
              {deleteTarget?.TYPE}) from{" "}
              <strong>{selectedZone?.domain}</strong>? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDeleteRecord}
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
