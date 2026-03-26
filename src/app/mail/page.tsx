"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Trash2,
  Mail,
  Eye,
  Loader2,
  Shield,
  ShieldCheck,
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
}

interface MailAccount {
  account: string;
  domain: string;
  user: string;
  QUOTA: string;
  U_DISK: string;
  AUTOREPLY: string;
  SUSPENDED: string;
}

interface HestiaUser {
  username: string;
}

export default function MailPage() {
  // Mail domains state
  const [domains, setDomains] = useState<MailDomain[]>([]);
  const [users, setUsers] = useState<HestiaUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected domain for accounts view
  const [selectedDomain, setSelectedDomain] = useState<MailDomain | null>(null);

  // Mail accounts state
  const [accounts, setAccounts] = useState<MailAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountsError, setAccountsError] = useState<string | null>(null);

  // Add domain dialog
  const [addDomainOpen, setAddDomainOpen] = useState(false);
  const [addDomainForm, setAddDomainForm] = useState({ user: "", domain: "" });
  const [addDomainLoading, setAddDomainLoading] = useState(false);

  // Delete domain dialog
  const [deleteDomainOpen, setDeleteDomainOpen] = useState(false);
  const [deleteDomainTarget, setDeleteDomainTarget] = useState<{
    user: string;
    domain: string;
  } | null>(null);
  const [deleteDomainLoading, setDeleteDomainLoading] = useState(false);

  // Add account dialog
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [addAccountForm, setAddAccountForm] = useState({
    account: "",
    password: "",
  });
  const [addAccountLoading, setAddAccountLoading] = useState(false);

  // Delete account dialog
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [deleteAccountTarget, setDeleteAccountTarget] = useState<{
    user: string;
    domain: string;
    account: string;
  } | null>(null);
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);

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
      setError(err.message || "Failed to fetch mail domains");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch users for the add domain dialog
  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      if (!res.ok) return;
      const data = await res.json();
      if (!data.error) setUsers(data);
    } catch {
      // Non-critical
    }
  }, []);

  // Fetch mail accounts for a selected domain
  const fetchAccounts = useCallback(
    async (user: string, domain: string) => {
      setAccountsLoading(true);
      setAccountsError(null);
      try {
        const res = await fetch(
          `/api/mail/accounts?user=${encodeURIComponent(user)}&domain=${encodeURIComponent(domain)}`
        );
        if (!res.ok) throw new Error("Failed to fetch mail accounts");
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setAccounts(data);
      } catch (err: any) {
        setAccountsError(err.message || "Failed to fetch mail accounts");
      } finally {
        setAccountsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchDomains();
    fetchUsers();
  }, [fetchDomains, fetchUsers]);

  // When a domain is selected, load its accounts
  const handleSelectDomain = (domain: MailDomain) => {
    setSelectedDomain(domain);
    setAccounts([]);
    fetchAccounts(domain.user, domain.domain);
  };

  // Add mail domain
  const handleAddDomain = async () => {
    if (!addDomainForm.user || !addDomainForm.domain) {
      alert("Please fill in all required fields.");
      return;
    }
    setAddDomainLoading(true);
    try {
      const res = await fetch("/api/mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addDomainForm),
      });
      const data = await res.json();
      if (!res.ok || data.error)
        throw new Error(data.error || "Failed to add mail domain");
      setAddDomainOpen(false);
      setAddDomainForm({ user: "", domain: "" });
      await fetchDomains();
    } catch (err: any) {
      alert(err.message || "Failed to add mail domain");
    } finally {
      setAddDomainLoading(false);
    }
  };

  // Delete mail domain
  const handleDeleteDomain = async () => {
    if (!deleteDomainTarget) return;
    setDeleteDomainLoading(true);
    try {
      const res = await fetch(
        `/api/mail?user=${encodeURIComponent(deleteDomainTarget.user)}&domain=${encodeURIComponent(deleteDomainTarget.domain)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok || data.error)
        throw new Error(data.error || "Failed to delete mail domain");
      setDeleteDomainOpen(false);
      setDeleteDomainTarget(null);
      // If the deleted domain was the selected one, clear the accounts view
      if (
        selectedDomain &&
        selectedDomain.domain === deleteDomainTarget.domain &&
        selectedDomain.user === deleteDomainTarget.user
      ) {
        setSelectedDomain(null);
        setAccounts([]);
      }
      await fetchDomains();
    } catch (err: any) {
      alert(err.message || "Failed to delete mail domain");
    } finally {
      setDeleteDomainLoading(false);
    }
  };

  // Add mail account
  const handleAddAccount = async () => {
    if (!selectedDomain) return;
    if (!addAccountForm.account || !addAccountForm.password) {
      alert("Please fill in all required fields.");
      return;
    }
    setAddAccountLoading(true);
    try {
      const res = await fetch("/api/mail/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: selectedDomain.user,
          domain: selectedDomain.domain,
          account: addAccountForm.account,
          password: addAccountForm.password,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error)
        throw new Error(data.error || "Failed to add mail account");
      setAddAccountOpen(false);
      setAddAccountForm({ account: "", password: "" });
      await fetchAccounts(selectedDomain.user, selectedDomain.domain);
      await fetchDomains();
    } catch (err: any) {
      alert(err.message || "Failed to add mail account");
    } finally {
      setAddAccountLoading(false);
    }
  };

  // Delete mail account
  const handleDeleteAccount = async () => {
    if (!deleteAccountTarget) return;
    setDeleteAccountLoading(true);
    try {
      const res = await fetch(
        `/api/mail/accounts?user=${encodeURIComponent(deleteAccountTarget.user)}&domain=${encodeURIComponent(deleteAccountTarget.domain)}&account=${encodeURIComponent(deleteAccountTarget.account)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok || data.error)
        throw new Error(data.error || "Failed to delete mail account");
      setDeleteAccountOpen(false);
      setDeleteAccountTarget(null);
      if (selectedDomain) {
        await fetchAccounts(selectedDomain.user, selectedDomain.domain);
        await fetchDomains();
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete mail account");
    } finally {
      setDeleteAccountLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#134E4A]">Mail</h1>
        <Button
          className="bg-teal-600 text-white hover:bg-teal-700"
          onClick={() => setAddDomainOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Add Domain
        </Button>
      </div>

      {/* Error banner */}
      {error && (
        <GlassCard className="border-red-200 bg-red-50/70">
          <p className="text-sm text-red-600">{error}</p>
        </GlassCard>
      )}

      {/* Section 1: Mail Domains */}
      <GlassCard>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
            <span className="ml-2 text-sm text-muted-foreground">
              Loading mail domains...
            </span>
          </div>
        ) : domains.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-teal-100 flex items-center justify-center">
              <Mail className="w-8 h-8 text-teal-600" />
            </div>
            <h2 className="text-xl font-semibold text-[#134E4A]">
              No mail domains
            </h2>
            <p className="text-muted-foreground">
              Add a mail domain to get started.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Domain</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Accounts</TableHead>
                <TableHead>Disk</TableHead>
                <TableHead>DKIM</TableHead>
                <TableHead>Antivirus</TableHead>
                <TableHead>Antispam</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {domains.map((d) => {
                const dkimEnabled =
                  d.DKIM !== "" && d.DKIM !== "no" && d.DKIM !== "0";
                const isSelected =
                  selectedDomain?.domain === d.domain &&
                  selectedDomain?.user === d.user;
                return (
                  <TableRow
                    key={`${d.user}-${d.domain}`}
                    className={
                      isSelected
                        ? "bg-teal-50/50"
                        : ""
                    }
                  >
                    <TableCell className="font-medium text-[#134E4A]">
                      {d.domain}
                    </TableCell>
                    <TableCell>{d.user}</TableCell>
                    <TableCell>{d.ACCOUNTS || "0"}</TableCell>
                    <TableCell>{d.U_DISK || "0"} MB</TableCell>
                    <TableCell>
                      {dkimEnabled ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          Enabled
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-500 border-gray-200">
                          <Shield className="h-3 w-3 mr-1" />
                          Disabled
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {d.ANTIVIRUS !== "no" && d.ANTIVIRUS !== "" ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                          On
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-500 border-gray-200">
                          Off
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {d.ANTISPAM !== "no" && d.ANTISPAM !== "" ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                          On
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-500 border-gray-200">
                          Off
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="View accounts"
                          onClick={() => handleSelectDomain(d)}
                        >
                          <Eye className="h-4 w-4 text-teal-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Delete domain"
                          onClick={() => {
                            setDeleteDomainTarget({
                              user: d.user,
                              domain: d.domain,
                            });
                            setDeleteDomainOpen(true);
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

      {/* Section 2: Mail Accounts (shown when a domain is selected) */}
      {selectedDomain && (
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#134E4A]">
              Accounts for{" "}
              <span className="text-teal-600">{selectedDomain.domain}</span>
            </h2>
            <Button
              className="bg-teal-600 text-white hover:bg-teal-700"
              onClick={() => setAddAccountOpen(true)}
            >
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
              <span className="ml-2 text-sm text-muted-foreground">
                Loading accounts...
              </span>
            </div>
          ) : accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-100 flex items-center justify-center">
                <Mail className="w-6 h-6 text-teal-600" />
              </div>
              <p className="text-sm text-muted-foreground">
                No mail accounts for this domain.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Quota</TableHead>
                  <TableHead>Disk Used</TableHead>
                  <TableHead>Autoreply</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((a) => {
                  const isSuspended =
                    a.SUSPENDED !== "no" && a.SUSPENDED !== "";
                  const hasAutoreply =
                    a.AUTOREPLY !== "no" && a.AUTOREPLY !== "";
                  return (
                    <TableRow key={`${a.account}@${a.domain}`}>
                      <TableCell className="font-medium text-[#134E4A]">
                        {a.account}@{a.domain}
                      </TableCell>
                      <TableCell>
                        {a.QUOTA === "unlimited" ? "Unlimited" : `${a.QUOTA} MB`}
                      </TableCell>
                      <TableCell>{a.U_DISK || "0"} MB</TableCell>
                      <TableCell>
                        {hasAutoreply ? (
                          <Badge className="bg-violet-100 text-violet-700 border-violet-200">
                            On
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-500 border-gray-200">
                            Off
                          </Badge>
                        )}
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
                          title="Delete account"
                          onClick={() => {
                            setDeleteAccountTarget({
                              user: a.user,
                              domain: a.domain,
                              account: a.account,
                            });
                            setDeleteAccountOpen(true);
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
      )}

      {/* Add Mail Domain Dialog */}
      <Dialog open={addDomainOpen} onOpenChange={setAddDomainOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Mail Domain</DialogTitle>
            <DialogDescription>
              Add a new mail domain to an existing user account.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>User</Label>
              <Select
                value={addDomainForm.user}
                onValueChange={(val) =>
                  setAddDomainForm((f) => ({ ...f, user: val as string }))
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
              <Label htmlFor="add-mail-domain">Domain Name</Label>
              <Input
                id="add-mail-domain"
                placeholder="example.com"
                value={addDomainForm.domain}
                onChange={(e) =>
                  setAddDomainForm((f) => ({ ...f, domain: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              className="bg-teal-600 text-white hover:bg-teal-700"
              onClick={handleAddDomain}
              disabled={addDomainLoading}
            >
              {addDomainLoading && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
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
              Are you sure you want to delete the mail domain{" "}
              <strong>{deleteDomainTarget?.domain}</strong> from user{" "}
              <strong>{deleteDomainTarget?.user}</strong>? This will remove all
              associated mail accounts and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDeleteDomain}
              disabled={deleteDomainLoading}
            >
              {deleteDomainLoading && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
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
            <DialogDescription>
              Create a new mail account for{" "}
              <strong>{selectedDomain?.domain}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="add-account-name">Account Name</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="add-account-name"
                  placeholder="user"
                  value={addAccountForm.account}
                  onChange={(e) =>
                    setAddAccountForm((f) => ({
                      ...f,
                      account: e.target.value,
                    }))
                  }
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  @{selectedDomain?.domain}
                </span>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-account-password">Password</Label>
              <Input
                id="add-account-password"
                type="password"
                placeholder="Password"
                value={addAccountForm.password}
                onChange={(e) =>
                  setAddAccountForm((f) => ({
                    ...f,
                    password: e.target.value,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              className="bg-teal-600 text-white hover:bg-teal-700"
              onClick={handleAddAccount}
              disabled={addAccountLoading}
            >
              {addAccountLoading && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
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
              Are you sure you want to delete{" "}
              <strong>
                {deleteAccountTarget?.account}@{deleteAccountTarget?.domain}
              </strong>
              ? This action cannot be undone.
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
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
