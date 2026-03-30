"use client";

import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/contexts/toast-context";
import {
  Plus,
  Trash2,
  Globe,
  Loader2,
  Pencil,
  X,
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

interface DnsZone {
  domain: string;
  user: string;
  RECORDS: string;
  SOA: string;
  TTL: string;
  IP: string;
  SUSPENDED: string;
}

interface DnsRecord {
  id: string;
  domain: string;
  user: string;
  RECORD: string;
  TYPE: string;
  VALUE: string;
  PRIORITY: string;
  TTL: string;
  SUSPENDED: string;
}

const TYPE_COLORS: Record<string, string> = {
  A: "bg-teal-100 text-teal-700 border-teal-200",
  AAAA: "bg-cyan-100 text-cyan-700 border-cyan-200",
  CNAME: "bg-violet-100 text-violet-700 border-violet-200",
  MX: "bg-amber-100 text-amber-700 border-amber-200",
  TXT: "bg-slate-200 text-slate-700 border-slate-300",
  SRV: "bg-rose-100 text-rose-700 border-rose-200",
  NS: "bg-emerald-100 text-emerald-700 border-emerald-200",
  CAA: "bg-orange-100 text-orange-700 border-orange-200",
};

const DNS_TYPES = ["A", "AAAA", "CNAME", "MX", "TXT", "SRV", "NS", "CAA"];

type RecordForm = {
  record: string;
  type: string;
  value: string;
  priority: string;
  ttl: string;
};

const emptyForm: RecordForm = { record: "", type: "A", value: "", priority: "", ttl: "14400" };

export default function DnsPage() {
  const { toast } = useToast();
  const [zones, setZones] = useState<DnsZone[]>([]);
  const [zonesLoading, setZonesLoading] = useState(true);
  const [zonesError, setZonesError] = useState<string | null>(null);

  const [selectedZone, setSelectedZone] = useState<DnsZone | null>(null);
  const [records, setRecords] = useState<DnsRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);

  // Filter
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Add/Edit dialog
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [editingId, setEditingId] = useState<string>("");
  const [form, setForm] = useState<RecordForm>(emptyForm);
  const [formLoading, setFormLoading] = useState(false);

  // Delete record dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DnsRecord | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Delete zone dialog
  const [deleteZoneOpen, setDeleteZoneOpen] = useState(false);
  const [deleteZoneTarget, setDeleteZoneTarget] = useState<DnsZone | null>(null);
  const [deleteZoneLoading, setDeleteZoneLoading] = useState(false);

  const fetchZones = useCallback(async () => {
    try {
      setZonesError(null);
      const res = await fetch("/api/dns");
      if (!res.ok) throw new Error("Failed to fetch DNS zones");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setZones(data);
    } catch (err: any) {
      setZonesError(err.message);
    } finally {
      setZonesLoading(false);
    }
  }, []);

  const fetchRecords = useCallback(async (user: string, domain: string) => {
    setRecordsLoading(true);
    setRecordsError(null);
    try {
      const res = await fetch(`/api/dns/records?user=${encodeURIComponent(user)}&domain=${encodeURIComponent(domain)}`);
      if (!res.ok) throw new Error("Failed to fetch DNS records");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setRecords(data);
    } catch (err: any) {
      setRecordsError(err.message);
    } finally {
      setRecordsLoading(false);
    }
  }, []);

  useEffect(() => { fetchZones(); }, [fetchZones]);

  const handleSelectZone = (zone: DnsZone) => {
    setSelectedZone(zone);
    setRecords([]);
    setTypeFilter("ALL");
    setSearchQuery("");
    fetchRecords(zone.user, zone.domain);
  };

  // Open add dialog
  const openAddDialog = () => {
    setFormMode("add");
    setForm(emptyForm);
    setEditingId("");
    setFormOpen(true);
  };

  // Open edit dialog
  const openEditDialog = (rec: DnsRecord) => {
    setFormMode("edit");
    setEditingId(rec.id);
    setForm({
      record: rec.RECORD,
      type: rec.TYPE,
      value: rec.VALUE,
      priority: rec.PRIORITY || "",
      ttl: rec.TTL || "14400",
    });
    setFormOpen(true);
  };

  const handleSubmitForm = async () => {
    if (!selectedZone || !form.record || !form.type || !form.value) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setFormLoading(true);
    try {
      const body: any = {
        user: selectedZone.user,
        domain: selectedZone.domain,
        record: form.record,
        type: form.type,
        value: form.value,
        priority: form.priority || undefined,
        ttl: form.ttl || undefined,
      };

      if (formMode === "edit") {
        body.id = editingId;
        const res = await fetch("/api/dns/records", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || "Failed to edit record");
      } else {
        const res = await fetch("/api/dns/records", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || "Failed to add record");
      }

      setFormOpen(false);
      setForm(emptyForm);
      await fetchRecords(selectedZone.user, selectedZone.domain);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || !selectedZone) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(
        `/api/dns/records?user=${encodeURIComponent(selectedZone.user)}&domain=${encodeURIComponent(selectedZone.domain)}&id=${encodeURIComponent(deleteTarget.id)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to delete");
      setDeleteOpen(false);
      setDeleteTarget(null);
      await fetchRecords(selectedZone.user, selectedZone.domain);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteZone = async () => {
    if (!deleteZoneTarget) return;
    setDeleteZoneLoading(true);
    try {
      const res = await fetch(
        `/api/dns?user=${encodeURIComponent(deleteZoneTarget.user)}&domain=${encodeURIComponent(deleteZoneTarget.domain)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to delete zone");
      setDeleteZoneOpen(false);
      setDeleteZoneTarget(null);
      if (selectedZone?.domain === deleteZoneTarget.domain) {
        setSelectedZone(null);
        setRecords([]);
      }
      await fetchZones();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleteZoneLoading(false);
    }
  };

  const showPriority = form.type === "MX" || form.type === "SRV";

  // Filtered records
  const filteredRecords = records.filter((r) => {
    if (typeFilter !== "ALL" && r.TYPE !== typeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return r.RECORD.toLowerCase().includes(q) || r.VALUE.toLowerCase().includes(q);
    }
    return true;
  });

  // Count by type
  const typeCounts: Record<string, number> = {};
  records.forEach((r) => { typeCounts[r.TYPE] = (typeCounts[r.TYPE] || 0) + 1; });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#134E4A]">DNS</h1>

      {zonesError && (
        <GlassCard className="border-red-200 bg-red-50/70">
          <p className="text-sm text-red-600">{zonesError}</p>
        </GlassCard>
      )}

      {/* DNS Zones */}
      <GlassCard>
        {zonesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
            <span className="ml-2 text-sm text-muted-foreground">Loading DNS zones...</span>
          </div>
        ) : zones.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <Globe className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No DNS zones found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {zones.map((zone) => {
              const isSelected = selectedZone?.domain === zone.domain && selectedZone?.user === zone.user;
              return (
                <div
                  key={`${zone.user}-${zone.domain}`}
                  className={`relative flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all cursor-pointer group ${
                    isSelected
                      ? "border-teal-300 bg-teal-50/80 shadow-md"
                      : "border-white/30 bg-white/40 hover:bg-white/60 hover:shadow-md"
                  }`}
                  onClick={() => handleSelectZone(zone)}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${isSelected ? "bg-teal-200" : "bg-teal-100"}`}>
                    <Globe className="h-5 w-5 text-teal-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[#134E4A] truncate">{zone.domain}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{zone.user}</span>
                      <Badge className="bg-violet-100 text-violet-700 border-violet-200 text-[10px] px-1.5 py-0">{zone.RECORDS} records</Badge>
                    </div>
                  </div>
                  <button
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-red-100 cursor-pointer"
                    title="Удалить DNS-зону"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteZoneTarget(zone);
                      setDeleteZoneOpen(true);
                    }}
                  >
                    <X className="h-4 w-4 text-red-500" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>

      {/* DNS Records */}
      {selectedZone && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#134E4A]">
              Records — <span className="text-teal-600">{selectedZone.domain}</span>
            </h2>
            <Button className="bg-teal-600 text-white hover:bg-teal-700 cursor-pointer" onClick={openAddDialog}>
              <Plus className="h-4 w-4" />
              Add Record
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setTypeFilter("ALL")}
              className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors ${typeFilter === "ALL" ? "bg-[#134E4A] text-white" : "bg-white/60 text-[#134E4A] hover:bg-white/80"}`}
            >
              All ({records.length})
            </button>
            {Object.entries(typeCounts).sort(([a], [b]) => a.localeCompare(b)).map(([type, count]) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors ${typeFilter === type ? "bg-[#134E4A] text-white" : `${TYPE_COLORS[type]?.split(" ")[0] || "bg-gray-100"} ${TYPE_COLORS[type]?.split(" ")[1] || "text-gray-700"} hover:opacity-80`}`}
              >
                {type} ({count})
              </button>
            ))}
            <div className="ml-auto">
              <Input
                placeholder="Search records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-48 text-sm"
              />
            </div>
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
                <span className="ml-2 text-sm text-muted-foreground">Loading records...</span>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <Globe className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  {records.length === 0 ? "No records in this zone." : "No records match your filter."}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Type</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead className="w-[70px]">Priority</TableHead>
                    <TableHead className="w-[70px]">TTL</TableHead>
                    <TableHead className="w-[90px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((rec) => (
                    <TableRow key={rec.id}>
                      <TableCell>
                        <Badge className={TYPE_COLORS[rec.TYPE] || "bg-gray-100 text-gray-700"}>
                          {rec.TYPE}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-[#134E4A]">{rec.RECORD}</TableCell>
                      <TableCell className="font-mono text-xs max-w-[350px]">
                        <span className="break-all">{rec.VALUE}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{rec.PRIORITY || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{rec.TTL || "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 cursor-pointer" onClick={() => openEditDialog(rec)} title="Edit">
                            <Pencil className="h-3.5 w-3.5 text-teal-600" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 cursor-pointer" onClick={() => { setDeleteTarget(rec); setDeleteOpen(true); }} title="Delete">
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </GlassCard>
        </>
      )}

      {/* Add/Edit Record Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{formMode === "edit" ? "Edit" : "Add"} DNS Record</DialogTitle>
            <DialogDescription>
              {formMode === "edit" ? "Modify the DNS record." : `Add a new record to ${selectedZone?.domain}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(val) => val && setForm((f) => ({ ...f, type: val }))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DNS_TYPES.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dns-record">Name</Label>
              <Input id="dns-record" placeholder="@ or subdomain (www, mail...)" value={form.record} onChange={(e) => setForm((f) => ({ ...f, record: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dns-value">Value</Label>
              <Input id="dns-value" placeholder={form.type === "A" ? "192.168.1.1" : form.type === "CNAME" ? "example.com." : form.type === "MX" ? "mail.example.com." : form.type === "TXT" ? "v=spf1 include:..." : "value"} value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} />
            </div>
            {showPriority && (
              <div className="grid gap-2">
                <Label htmlFor="dns-priority">Priority</Label>
                <Input id="dns-priority" type="number" placeholder="10" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="dns-ttl">TTL (seconds)</Label>
              <Select value={form.ttl} onValueChange={(val) => val && setForm((f) => ({ ...f, ttl: val }))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="300">5 min (300)</SelectItem>
                  <SelectItem value="3600">1 hour (3600)</SelectItem>
                  <SelectItem value="14400">4 hours (14400)</SelectItem>
                  <SelectItem value="86400">1 day (86400)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button className="bg-teal-600 text-white hover:bg-teal-700 cursor-pointer" onClick={handleSubmitForm} disabled={formLoading}>
              {formLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {formMode === "edit" ? "Save Changes" : "Add Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Record Confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить DNS-запись</DialogTitle>
            <DialogDescription>
              Удалить запись <strong>{deleteTarget?.TYPE}</strong> <strong>{deleteTarget?.RECORD}</strong> → <code className="text-xs">{deleteTarget?.VALUE}</code>? Это действие необратимо.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Отмена</DialogClose>
            <Button variant="destructive" className="cursor-pointer" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Zone Confirmation */}
      <Dialog open={deleteZoneOpen} onOpenChange={setDeleteZoneOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить DNS-зону</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите удалить DNS-зону{" "}
              <strong className="text-red-600">{deleteZoneTarget?.domain}</strong>?
              Все DNS-записи этой зоны будут удалены безвозвратно.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Отмена</DialogClose>
            <Button variant="destructive" className="cursor-pointer" onClick={handleDeleteZone} disabled={deleteZoneLoading}>
              {deleteZoneLoading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Удалить зону
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
