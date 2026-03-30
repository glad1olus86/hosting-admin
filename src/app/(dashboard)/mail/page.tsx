"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Trash2,
  Mail,
  Loader2,
  ShieldCheck,
  Shield,
  KeyRound,
  UserX,
  UserCheck,
  Settings2,
  Copy,
  Check,
  ExternalLink,
  Lock,
  LockOpen,
  Forward,
  MessageSquareReply,
  Monitor,
  Globe,
  Inbox,
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useToast } from "@/contexts/toast-context";

interface MailDomain {
  domain: string;
  user: string;
  ACCOUNTS: string;
  U_DISK: string;
  ANTIVIRUS: string;
  ANTISPAM: string;
  DKIM: string;
  SSL: string;
  CATCHALL: string;
  RATE_LIMIT: string;
  WEBMAIL: string;
  SUSPENDED: string;
}

interface MailAccount {
  account: string;
  domain: string;
  user: string;
  QUOTA: string;
  U_DISK: string;
  AUTOREPLY: string;
  SUSPENDED: string;
  FWD: string;
  ALIAS: string;
}

interface HestiaUser {
  username: string;
}

export default function MailPage() {
  const { toast } = useToast();
  const [domains, setDomains] = useState<MailDomain[]>([]);
  const [users, setUsers] = useState<HestiaUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedDomain, setSelectedDomain] = useState<MailDomain | null>(null);
  const [accounts, setAccounts] = useState<MailAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountsError, setAccountsError] = useState<string | null>(null);

  // Toggle loading tracker
  const [toggling, setToggling] = useState<Set<string>>(new Set());

  // Add domain dialog
  const [addDomainOpen, setAddDomainOpen] = useState(false);
  const [addDomainForm, setAddDomainForm] = useState({ user: "", domain: "" });
  const [addDomainLoading, setAddDomainLoading] = useState(false);

  // Delete domain dialog
  const [deleteDomainOpen, setDeleteDomainOpen] = useState(false);
  const [deleteDomainTarget, setDeleteDomainTarget] = useState<{ user: string; domain: string } | null>(null);
  const [deleteDomainLoading, setDeleteDomainLoading] = useState(false);

  // Add account dialog
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [addAccountForm, setAddAccountForm] = useState({ account: "", password: "", quota: "unlimited" });
  const [addAccountLoading, setAddAccountLoading] = useState(false);

  // Delete account dialog
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [deleteAccountTarget, setDeleteAccountTarget] = useState<{ user: string; domain: string; account: string } | null>(null);
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);

  // Change password dialog
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<{ user: string; domain: string; account: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Account Settings Sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetAccount, setSheetAccount] = useState<MailAccount | null>(null);
  const [activeTab, setActiveTab] = useState<"info" | "forwarding" | "autoreply" | "connection">("info");

  // Forwarding
  const [newForwardEmail, setNewForwardEmail] = useState("");
  const [forwardLoading, setForwardLoading] = useState(false);

  // Autoreply
  const [autoreplyMessage, setAutoreplyMessage] = useState("");
  const [autoreplyLoading, setAutoreplyLoading] = useState(false);
  const [autoreplyFetched, setAutoreplyFetched] = useState(false);

  // Mail domain SSL
  const [sslLoading, setSslLoading] = useState<Set<string>>(new Set());

  // Copy state
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Fetch mail domains
  const fetchDomains = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/mail");
      if (!res.ok) throw new Error("Failed to fetch mail domains");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDomains(data);
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

  const fetchAccounts = useCallback(async (user: string, domain: string) => {
    setAccountsLoading(true);
    setAccountsError(null);
    try {
      const res = await fetch(`/api/mail/accounts?user=${encodeURIComponent(user)}&domain=${encodeURIComponent(domain)}`);
      if (!res.ok) throw new Error("Failed to fetch mail accounts");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAccounts(data);
      return data as MailAccount[];
    } catch (err: any) {
      setAccountsError(err.message);
      return [];
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  useEffect(() => { fetchDomains(); fetchUsers(); }, [fetchDomains, fetchUsers]);

  const handleSelectDomain = (domain: MailDomain) => {
    setSelectedDomain(domain);
    setAccounts([]);
    fetchAccounts(domain.user, domain.domain);
  };

  // Toggle domain setting (dkim, antivirus, antispam)
  const handleToggle = async (domain: MailDomain, action: string, currentValue: string) => {
    const key = `${domain.domain}:${action}`;
    setToggling((prev) => new Set(prev).add(key));
    try {
      const enable = currentValue === "no" || currentValue === "";
      const res = await fetch("/api/mail", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: domain.user, domain: domain.domain, action, value: enable }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      await fetchDomains();
      if (selectedDomain?.domain === domain.domain) {
        const updated = domains.find(d => d.domain === domain.domain);
        if (updated) setSelectedDomain(updated);
      }
    } catch (err: any) {
      toast.error(`Failed to toggle ${action}: ${err.message}`);
    } finally {
      setToggling((prev) => { const n = new Set(prev); n.delete(key); return n; });
    }
  };

  // Add mail domain
  const handleAddDomain = async () => {
    if (!addDomainForm.user || !addDomainForm.domain) { toast.error("Please fill in all fields."); return; }
    setAddDomainLoading(true);
    try {
      const res = await fetch("/api/mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addDomainForm),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to add mail domain");
      setAddDomainOpen(false);
      setAddDomainForm({ user: "", domain: "" });
      await fetchDomains();
    } catch (err: any) { toast.error(err.message); }
    finally { setAddDomainLoading(false); }
  };

  const handleDeleteDomain = async () => {
    if (!deleteDomainTarget) return;
    setDeleteDomainLoading(true);
    try {
      const res = await fetch(`/api/mail?user=${encodeURIComponent(deleteDomainTarget.user)}&domain=${encodeURIComponent(deleteDomainTarget.domain)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to delete");
      setDeleteDomainOpen(false);
      setDeleteDomainTarget(null);
      if (selectedDomain?.domain === deleteDomainTarget.domain) { setSelectedDomain(null); setAccounts([]); }
      await fetchDomains();
    } catch (err: any) { toast.error(err.message); }
    finally { setDeleteDomainLoading(false); }
  };

  const handleAddAccount = async () => {
    if (!selectedDomain || !addAccountForm.account || !addAccountForm.password) { toast.error("Please fill in all fields."); return; }
    setAddAccountLoading(true);
    try {
      const res = await fetch("/api/mail/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: selectedDomain.user, domain: selectedDomain.domain,
          account: addAccountForm.account, password: addAccountForm.password,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to add account");
      setAddAccountOpen(false);
      setAddAccountForm({ account: "", password: "", quota: "unlimited" });
      await fetchAccounts(selectedDomain.user, selectedDomain.domain);
      await fetchDomains();
    } catch (err: any) { toast.error(err.message); }
    finally { setAddAccountLoading(false); }
  };

  const handleDeleteAccount = async () => {
    if (!deleteAccountTarget) return;
    setDeleteAccountLoading(true);
    try {
      const res = await fetch(`/api/mail/accounts?user=${encodeURIComponent(deleteAccountTarget.user)}&domain=${encodeURIComponent(deleteAccountTarget.domain)}&account=${encodeURIComponent(deleteAccountTarget.account)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to delete account");
      setDeleteAccountOpen(false);
      setDeleteAccountTarget(null);
      if (selectedDomain) { await fetchAccounts(selectedDomain.user, selectedDomain.domain); await fetchDomains(); }
    } catch (err: any) { toast.error(err.message); }
    finally { setDeleteAccountLoading(false); }
  };

  const handleChangePassword = async () => {
    if (!passwordTarget || !newPassword) { toast.error("Please enter a new password."); return; }
    setPasswordLoading(true);
    try {
      const res = await fetch("/api/mail/accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...passwordTarget, action: "password", value: newPassword }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to change password");
      setPasswordOpen(false);
      setPasswordTarget(null);
      setNewPassword("");
      toast.success("Password changed successfully.");
    } catch (err: any) { toast.error(err.message); }
    finally { setPasswordLoading(false); }
  };

  const handleSuspendToggle = async (a: MailAccount) => {
    const isSuspended = a.SUSPENDED !== "no" && a.SUSPENDED !== "";
    try {
      const res = await fetch("/api/mail/accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: a.user, domain: a.domain, account: a.account,
          action: isSuspended ? "unsuspend" : "suspend",
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error);
      if (selectedDomain) await fetchAccounts(selectedDomain.user, selectedDomain.domain);
    } catch (err: any) { toast.error(err.message); }
  };

  // === Mail SSL ===
  const handleRequestMailSsl = async (domain: MailDomain) => {
    const key = `${domain.user}:${domain.domain}`;
    setSslLoading((prev) => new Set(prev).add(key));
    try {
      const res = await fetch("/api/mail", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: domain.user, domain: domain.domain, action: "ssl" }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "SSL error");
      await fetchDomains();
    } catch (err: any) {
      toast.error(`Mail SSL error: ${err.message}`);
    } finally {
      setSslLoading((prev) => { const n = new Set(prev); n.delete(key); return n; });
    }
  };

  // === Account Sheet ===
  const openAccountSheet = (account: MailAccount) => {
    setSheetAccount(account);
    setActiveTab("info");
    setNewForwardEmail("");
    setAutoreplyMessage("");
    setAutoreplyFetched(false);
    setSheetOpen(true);
  };

  const refreshSheetAccount = async () => {
    if (!sheetAccount || !selectedDomain) return;
    const updated = await fetchAccounts(selectedDomain.user, selectedDomain.domain);
    const found = updated.find((a: MailAccount) => a.account === sheetAccount.account);
    if (found) setSheetAccount(found);
  };

  // === Forwarding ===
  const handleAddForward = async () => {
    if (!sheetAccount || !newForwardEmail) return;
    setForwardLoading(true);
    try {
      const res = await fetch("/api/mail/accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: sheetAccount.user, domain: sheetAccount.domain, account: sheetAccount.account,
          action: "add-forward", value: newForwardEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed");
      setNewForwardEmail("");
      await refreshSheetAccount();
    } catch (err: any) { toast.error(err.message); }
    finally { setForwardLoading(false); }
  };

  const handleDeleteForward = async (fwdEmail: string) => {
    if (!sheetAccount) return;
    setForwardLoading(true);
    try {
      const res = await fetch("/api/mail/accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: sheetAccount.user, domain: sheetAccount.domain, account: sheetAccount.account,
          action: "delete-forward", value: fwdEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed");
      await refreshSheetAccount();
    } catch (err: any) { toast.error(err.message); }
    finally { setForwardLoading(false); }
  };

  // === Autoreply ===
  const fetchAutoreply = async (account: MailAccount) => {
    if (autoreplyFetched) return;
    setAutoreplyLoading(true);
    try {
      const res = await fetch("/api/mail/accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: account.user, domain: account.domain, account: account.account,
          action: "get-autoreply",
        }),
      });
      const data = await res.json();
      if (data.message) setAutoreplyMessage(data.message);
      setAutoreplyFetched(true);
    } catch {}
    finally { setAutoreplyLoading(false); }
  };

  const handleSaveAutoreply = async () => {
    if (!sheetAccount || !autoreplyMessage.trim()) return;
    setAutoreplyLoading(true);
    try {
      const res = await fetch("/api/mail/accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: sheetAccount.user, domain: sheetAccount.domain, account: sheetAccount.account,
          action: "add-autoreply", value: autoreplyMessage,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed");
      await refreshSheetAccount();
    } catch (err: any) { toast.error(err.message); }
    finally { setAutoreplyLoading(false); }
  };

  const handleDeleteAutoreply = async () => {
    if (!sheetAccount) return;
    setAutoreplyLoading(true);
    try {
      const res = await fetch("/api/mail/accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: sheetAccount.user, domain: sheetAccount.domain, account: sheetAccount.account,
          action: "delete-autoreply",
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed");
      setAutoreplyMessage("");
      await refreshSheetAccount();
    } catch (err: any) { toast.error(err.message); }
    finally { setAutoreplyLoading(false); }
  };

  // === Copy ===
  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const isOn = (val: string) => val !== "no" && val !== "" && val !== "0";

  const ToggleBadge = ({ label, value, loading: isLoading, onClick }: { label: string; value: string; loading: boolean; onClick: () => void }) => (
    <Tooltip>
      <TooltipTrigger>
        <button
          onClick={onClick}
          disabled={isLoading}
          className="cursor-pointer disabled:cursor-wait"
        >
          {isLoading ? (
            <Badge className="bg-amber-50 text-amber-600 border-amber-200">
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ...
            </Badge>
          ) : isOn(value) ? (
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200 transition-colors">
              <ShieldCheck className="h-3 w-3 mr-1" />
              On
            </Badge>
          ) : (
            <Badge className="bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200 transition-colors">
              <Shield className="h-3 w-3 mr-1" />
              Off
            </Badge>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        Click to {isOn(value) ? "disable" : "enable"} {label}
      </TooltipContent>
    </Tooltip>
  );

  const ConnectionRow = ({ label, value, field }: { label: string; value: string; field: string }) => (
    <div className="flex items-center justify-between">
      <div className="min-w-0">
        <span className="text-xs text-muted-foreground">{label}:</span>
        <span className="ml-2 text-sm font-mono text-[#134E4A] break-all">{value}</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 cursor-pointer shrink-0 ml-2"
        onClick={() => copyToClipboard(value, field)}
      >
        {copiedField === field ? (
          <Check className="h-3.5 w-3.5 text-emerald-500" />
        ) : (
          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#134E4A]">Mail</h1>
        <Button className="bg-teal-600 text-white hover:bg-teal-700 cursor-pointer" onClick={() => setAddDomainOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Mail Domain
        </Button>
      </div>

      {error && (
        <GlassCard className="border-red-200 bg-red-50/70">
          <p className="text-sm text-red-600">{error}</p>
        </GlassCard>
      )}

      {/* Mail Domains */}
      <GlassCard>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
            <span className="ml-2 text-sm text-muted-foreground">Loading mail domains...</span>
          </div>
        ) : domains.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-teal-100 flex items-center justify-center">
              <Mail className="w-8 h-8 text-teal-600" />
            </div>
            <h2 className="text-xl font-semibold text-[#134E4A]">No mail domains</h2>
            <p className="text-muted-foreground">Add a mail domain to get started.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Domain</TableHead>
                <TableHead>User</TableHead>
                <TableHead className="text-center">Accounts</TableHead>
                <TableHead className="text-center">DKIM</TableHead>
                <TableHead className="text-center">Antivirus</TableHead>
                <TableHead className="text-center">Antispam</TableHead>
                <TableHead className="text-center">SSL</TableHead>
                <TableHead>Webmail</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {domains.map((d) => {
                const isSelected = selectedDomain?.domain === d.domain && selectedDomain?.user === d.user;
                const sslKey = `${d.user}:${d.domain}`;
                return (
                  <TableRow key={`${d.user}-${d.domain}`} className={isSelected ? "bg-teal-50/50" : ""}>
                    <TableCell>
                      <button onClick={() => handleSelectDomain(d)} className="font-medium text-[#134E4A] hover:text-teal-600 transition-colors cursor-pointer">
                        {d.domain}
                      </button>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{d.user}</TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-violet-100 text-violet-700 border-violet-200">{d.ACCOUNTS || "0"}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <ToggleBadge label="DKIM" value={d.DKIM} loading={toggling.has(`${d.domain}:dkim`)} onClick={() => handleToggle(d, "dkim", d.DKIM)} />
                    </TableCell>
                    <TableCell className="text-center">
                      <ToggleBadge label="Antivirus" value={d.ANTIVIRUS} loading={toggling.has(`${d.domain}:antivirus`)} onClick={() => handleToggle(d, "antivirus", d.ANTIVIRUS)} />
                    </TableCell>
                    <TableCell className="text-center">
                      <ToggleBadge label="Antispam" value={d.ANTISPAM} loading={toggling.has(`${d.domain}:antispam`)} onClick={() => handleToggle(d, "antispam", d.ANTISPAM)} />
                    </TableCell>
                    <TableCell className="text-center">
                      {sslLoading.has(sslKey) ? (
                        <Loader2 className="h-4 w-4 animate-spin text-amber-500 mx-auto" />
                      ) : isOn(d.SSL) ? (
                        <Tooltip>
                          <TooltipTrigger>
                            <Lock className="h-4 w-4 text-emerald-500 mx-auto" />
                          </TooltipTrigger>
                          <TooltipContent>Mail SSL active</TooltipContent>
                        </Tooltip>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger>
                            <button
                              className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 cursor-pointer mx-auto"
                              onClick={() => handleRequestMailSsl(d)}
                            >
                              <LockOpen className="h-3.5 w-3.5" />
                              Enable
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Enable Let&apos;s Encrypt SSL for mail.{d.domain}</TooltipContent>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell>
                      {d.WEBMAIL ? (
                        <a
                          href={`https://mail.${d.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {d.WEBMAIL}
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">&mdash;</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="cursor-pointer" onClick={() => { setDeleteDomainTarget({ user: d.user, domain: d.domain }); setDeleteDomainOpen(true); }}>
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

      {/* Mail Accounts */}
      {selectedDomain && (
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-[#134E4A]">
                Accounts — <span className="text-teal-600">{selectedDomain.domain}</span>
              </h2>
              {selectedDomain.CATCHALL && (
                <p className="text-xs text-muted-foreground mt-0.5">Catchall: {selectedDomain.CATCHALL}</p>
              )}
            </div>
            <Button className="bg-teal-600 text-white hover:bg-teal-700 cursor-pointer" onClick={() => setAddAccountOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Account
            </Button>
          </div>

          {accountsError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50/70 p-3">
              <p className="text-sm text-red-600">{accountsError}</p>
            </div>
          )}

          {accountsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
              <span className="ml-2 text-sm text-muted-foreground">Loading accounts...</span>
            </div>
          ) : accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-100 flex items-center justify-center">
                <Mail className="w-6 h-6 text-teal-600" />
              </div>
              <p className="text-sm text-muted-foreground">No mail accounts yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Quota</TableHead>
                  <TableHead>Used</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((a) => {
                  const isSuspended = a.SUSPENDED !== "no" && a.SUSPENDED !== "";
                  return (
                    <TableRow key={`${a.account}@${a.domain}`}>
                      <TableCell className="font-medium text-[#134E4A]">
                        <button
                          onClick={() => openAccountSheet(a)}
                          className="text-left hover:text-teal-600 transition-colors cursor-pointer"
                        >
                          {a.account}@{a.domain}
                        </button>
                        {a.FWD && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            <Forward className="inline h-3 w-3 mr-0.5" /> {a.FWD}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{a.QUOTA === "unlimited" ? "Unlimited" : `${a.QUOTA} MB`}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{a.U_DISK || "0"} MB</span>
                      </TableCell>
                      <TableCell>
                        {isSuspended ? (
                          <Badge className="bg-red-100 text-red-700 border-red-200">Suspended</Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 cursor-pointer" onClick={() => openAccountSheet(a)}>
                                <Settings2 className="h-4 w-4 text-teal-600" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Account settings</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 cursor-pointer" onClick={() => {
                                setPasswordTarget({ user: a.user, domain: a.domain, account: a.account });
                                setNewPassword("");
                                setPasswordOpen(true);
                              }}>
                                <KeyRound className="h-4 w-4 text-amber-600" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Change password</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 cursor-pointer" onClick={() => handleSuspendToggle(a)}>
                                {isSuspended ? (
                                  <UserCheck className="h-4 w-4 text-emerald-600" />
                                ) : (
                                  <UserX className="h-4 w-4 text-orange-500" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{isSuspended ? "Unsuspend" : "Suspend"} account</TooltipContent>
                          </Tooltip>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 cursor-pointer" onClick={() => {
                            setDeleteAccountTarget({ user: a.user, domain: a.domain, account: a.account });
                            setDeleteAccountOpen(true);
                          }}>
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
      )}

      {/* ==================== DIALOGS ==================== */}

      {/* Add Mail Domain Dialog */}
      <Dialog open={addDomainOpen} onOpenChange={setAddDomainOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Mail Domain</DialogTitle>
            <DialogDescription>Add a new mail domain. DKIM will be enabled automatically.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>User</Label>
              <Select value={addDomainForm.user} onValueChange={(val) => val && setAddDomainForm((f) => ({ ...f, user: val }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select a user" /></SelectTrigger>
                <SelectContent>
                  {users.map((u) => (<SelectItem key={u.username} value={u.username}>{u.username}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-mail-domain">Domain Name</Label>
              <Input id="add-mail-domain" placeholder="example.com" value={addDomainForm.domain} onChange={(e) => setAddDomainForm((f) => ({ ...f, domain: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button className="bg-teal-600 text-white hover:bg-teal-700 cursor-pointer" onClick={handleAddDomain} disabled={addDomainLoading}>
              {addDomainLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Add Domain
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Mail Domain Dialog */}
      <Dialog open={deleteDomainOpen} onOpenChange={setDeleteDomainOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Mail Domain</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteDomainTarget?.domain}</strong>? All mail accounts will be removed. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button variant="destructive" className="cursor-pointer" onClick={handleDeleteDomain} disabled={deleteDomainLoading}>
              {deleteDomainLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Mail Account Dialog */}
      <Dialog open={addAccountOpen} onOpenChange={setAddAccountOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Mail Account</DialogTitle>
            <DialogDescription>Create a new email for <strong>{selectedDomain?.domain}</strong>.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="add-account-name">Email Address</Label>
              <div className="flex items-center gap-2">
                <Input id="add-account-name" placeholder="user" value={addAccountForm.account} onChange={(e) => setAddAccountForm((f) => ({ ...f, account: e.target.value }))} />
                <span className="text-sm text-muted-foreground whitespace-nowrap">@{selectedDomain?.domain}</span>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-account-password">Password</Label>
              <Input id="add-account-password" type="password" placeholder="Password" value={addAccountForm.password} onChange={(e) => setAddAccountForm((f) => ({ ...f, password: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button className="bg-teal-600 text-white hover:bg-teal-700 cursor-pointer" onClick={handleAddAccount} disabled={addAccountLoading}>
              {addAccountLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Add Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Mail Account Dialog */}
      <Dialog open={deleteAccountOpen} onOpenChange={setDeleteAccountOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Mail Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteAccountTarget?.account}@{deleteAccountTarget?.domain}</strong>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button variant="destructive" className="cursor-pointer" onClick={handleDeleteAccount} disabled={deleteAccountLoading}>
              {deleteAccountLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Set a new password for <strong>{passwordTarget?.account}@{passwordTarget?.domain}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input id="new-password" type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleChangePassword()} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button className="bg-teal-600 text-white hover:bg-teal-700 cursor-pointer" onClick={handleChangePassword} disabled={passwordLoading || !newPassword}>
              {passwordLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Change Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== ACCOUNT SETTINGS SHEET ==================== */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="sm:max-w-xl w-full overflow-y-auto">
          {sheetAccount && (
            <>
              <SheetHeader className="pb-2">
                <SheetTitle className="flex items-center gap-2 text-[#134E4A]">
                  <Mail className="h-5 w-5 text-teal-600" />
                  {sheetAccount.account}@{sheetAccount.domain}
                </SheetTitle>
                <SheetDescription>
                  {sheetAccount.user} &middot; {sheetAccount.SUSPENDED !== "no" && sheetAccount.SUSPENDED !== "" ? "Suspended" : "Active"}
                </SheetDescription>
              </SheetHeader>

              {/* Tabs */}
              <div className="flex flex-wrap gap-1 px-4 pb-3 border-b border-slate-200">
                {([
                  { key: "info" as const, label: "Info" },
                  { key: "forwarding" as const, label: "Forwarding" },
                  { key: "autoreply" as const, label: "Autoreply" },
                  { key: "connection" as const, label: "Connection" },
                ]).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setActiveTab(tab.key);
                      if (tab.key === "autoreply" && sheetAccount) fetchAutoreply(sheetAccount);
                    }}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer",
                      activeTab === tab.key
                        ? "bg-teal-600 text-white"
                        : "bg-white/60 text-gray-600 hover:bg-white/80 border border-gray-200"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="px-4 py-4 space-y-4">

                {/* === Info Tab === */}
                {activeTab === "info" && (
                  <>
                    <div className="flex items-center justify-between">
                      {sheetAccount.SUSPENDED !== "no" && sheetAccount.SUSPENDED !== "" ? (
                        <Badge className="bg-red-100 text-red-700 border-red-200">Suspended</Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Active</Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <InfoItem label="Email" value={`${sheetAccount.account}@${sheetAccount.domain}`} mono />
                      <InfoItem label="Quota" value={sheetAccount.QUOTA === "unlimited" ? "Unlimited" : `${sheetAccount.QUOTA} MB`} />
                      <InfoItem label="Used" value={`${sheetAccount.U_DISK || "0"} MB`} />
                      <InfoItem label="Autoreply" value={sheetAccount.AUTOREPLY === "yes" ? "Enabled" : "Disabled"} />
                    </div>

                    {sheetAccount.FWD && (
                      <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3">
                        <p className="text-xs text-muted-foreground mb-1">Forwarding to:</p>
                        <p className="text-sm font-medium text-[#134E4A]">{sheetAccount.FWD}</p>
                      </div>
                    )}

                    {/* Webmail quick link */}
                    <div className="rounded-lg border border-teal-200 bg-teal-50/50 p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Globe className="h-4 w-4 text-teal-600" />
                        <span className="text-sm font-medium text-[#134E4A]">Webmail</span>
                      </div>
                      <a
                        href={`https://mail.${sheetAccount.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-teal-600 hover:underline flex items-center gap-1"
                      >
                        https://mail.{sheetAccount.domain}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </>
                )}

                {/* === Forwarding Tab === */}
                {activeTab === "forwarding" && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Forward copies of incoming emails to other addresses. The original mailbox still receives mail.
                    </p>

                    {sheetAccount.FWD ? (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Active Forwards</Label>
                        {sheetAccount.FWD.split(",").map((fwd) => fwd.trim()).filter(Boolean).map((fwd) => (
                          <div key={fwd} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white/50 p-2.5">
                            <span className="text-sm font-mono text-[#134E4A]">{fwd}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 cursor-pointer"
                              disabled={forwardLoading}
                              onClick={() => handleDeleteForward(fwd)}
                            >
                              {forwardLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 text-red-500" />}
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No forwards configured.</p>
                    )}

                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      <Label>Add Forward</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="user@example.com"
                          value={newForwardEmail}
                          onChange={(e) => setNewForwardEmail(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAddForward()}
                        />
                        <Button
                          className="bg-teal-600 text-white hover:bg-teal-700 cursor-pointer shrink-0"
                          disabled={forwardLoading || !newForwardEmail}
                          onClick={handleAddForward}
                        >
                          {forwardLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* === Autoreply Tab === */}
                {activeTab === "autoreply" && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Automatically reply to incoming messages (e.g., vacation notice).
                    </p>

                    {autoreplyLoading && !autoreplyFetched ? (
                      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading autoreply...
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <Label>Autoreply Message</Label>
                          <textarea
                            className="w-full rounded-lg border border-slate-200 bg-white/50 p-3 text-sm min-h-[120px] resize-y focus:outline-none focus:ring-2 focus:ring-teal-500"
                            placeholder="I'm currently out of office..."
                            value={autoreplyMessage}
                            onChange={(e) => setAutoreplyMessage(e.target.value)}
                          />
                        </div>

                        <div className="flex gap-2">
                          <Button
                            className="bg-teal-600 text-white hover:bg-teal-700 cursor-pointer"
                            disabled={autoreplyLoading || !autoreplyMessage.trim()}
                            onClick={handleSaveAutoreply}
                          >
                            {autoreplyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquareReply className="h-4 w-4" />}
                            Save Autoreply
                          </Button>
                          {sheetAccount.AUTOREPLY === "yes" && (
                            <Button
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50 cursor-pointer"
                              disabled={autoreplyLoading}
                              onClick={handleDeleteAutoreply}
                            >
                              Disable
                            </Button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* === Connection Settings Tab === */}
                {activeTab === "connection" && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Use these settings to configure Outlook, Thunderbird, Gmail, or any email client.
                    </p>

                    {/* Webmail Quick Access */}
                    <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Globe className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-[#134E4A]">Webmail Access</span>
                      </div>
                      <a
                        href={`https://mail.${sheetAccount.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                      >
                        https://mail.{sheetAccount.domain}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>

                    {/* Incoming Mail (IMAP) */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-[#134E4A] flex items-center gap-2">
                        <Inbox className="h-4 w-4 text-teal-600" />
                        Incoming Mail (IMAP)
                      </h4>
                      <div className="rounded-lg border border-slate-200 bg-white/50 p-3 space-y-2">
                        <ConnectionRow label="Server" value={`mail.${sheetAccount.domain}`} field="imap-server" />
                        <ConnectionRow label="Port" value="993" field="imap-port" />
                        <ConnectionRow label="Security" value="SSL/TLS" field="imap-security" />
                        <ConnectionRow label="Username" value={`${sheetAccount.account}@${sheetAccount.domain}`} field="imap-user" />
                      </div>
                    </div>

                    {/* Outgoing Mail (SMTP) */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-[#134E4A] flex items-center gap-2">
                        <Forward className="h-4 w-4 text-teal-600" />
                        Outgoing Mail (SMTP)
                      </h4>
                      <div className="rounded-lg border border-slate-200 bg-white/50 p-3 space-y-2">
                        <ConnectionRow label="Server" value={`mail.${sheetAccount.domain}`} field="smtp-server" />
                        <ConnectionRow label="Port" value="465 (SSL) or 587 (STARTTLS)" field="smtp-port" />
                        <ConnectionRow label="Security" value="SSL/TLS or STARTTLS" field="smtp-security" />
                        <ConnectionRow label="Username" value={`${sheetAccount.account}@${sheetAccount.domain}`} field="smtp-user" />
                        <ConnectionRow label="Auth" value="Normal password" field="smtp-auth" />
                      </div>
                    </div>

                    {/* POP3 (Alternative) */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-[#134E4A] flex items-center gap-2">
                        <Monitor className="h-4 w-4 text-teal-600" />
                        POP3 (Alternative)
                      </h4>
                      <div className="rounded-lg border border-slate-200 bg-white/50 p-3 space-y-2">
                        <ConnectionRow label="Server" value={`mail.${sheetAccount.domain}`} field="pop3-server" />
                        <ConnectionRow label="Port" value="995" field="pop3-port" />
                        <ConnectionRow label="Security" value="SSL/TLS" field="pop3-security" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function InfoItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white/50 p-2.5">
      <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
      <p className={cn("text-sm font-medium text-[#134E4A]", mono && "font-mono text-xs")}>{value}</p>
    </div>
  );
}
