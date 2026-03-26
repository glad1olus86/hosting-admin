"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Lock,
  Unlock,
  Shield,
  ShieldCheck,
  RefreshCw,
  Trash2,
  Loader2,
} from "lucide-react";
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

interface SslCertificate {
  domain: string;
  user: string;
  ssl: string;
  sslHome: string;
  letsencrypt: string;
  sslExpiry: string;
  sslIssuer: string;
}

function getDaysUntilExpiry(expiryDate: string): number | null {
  if (!expiryDate) return null;
  const expiry = new Date(expiryDate);
  if (isNaN(expiry.getTime())) return null;
  const now = new Date();
  const diffMs = expiry.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function formatExpiryDate(expiryDate: string): string {
  if (!expiryDate) return "N/A";
  const date = new Date(expiryDate);
  if (isNaN(date.getTime())) return expiryDate;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getExpiryColorClass(expiryDate: string): string {
  const days = getDaysUntilExpiry(expiryDate);
  if (days === null) return "text-muted-foreground";
  if (days < 30) return "text-red-600 font-medium";
  if (days < 60) return "text-amber-600 font-medium";
  return "text-muted-foreground";
}

export default function SslPage() {
  const [certificates, setCertificates] = useState<SslCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track per-row loading states for actions
  const [issuingDomain, setIssuingDomain] = useState<string | null>(null);
  const [renewingDomain, setRenewingDomain] = useState<string | null>(null);

  // Remove confirmation dialog
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{
    user: string;
    domain: string;
  } | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  const fetchCertificates = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/ssl");
      if (!res.ok) throw new Error("Failed to fetch SSL certificates");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCertificates(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch SSL certificates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  const handleIssueSSL = async (user: string, domain: string) => {
    const key = `${user}:${domain}`;
    setIssuingDomain(key);
    try {
      const res = await fetch("/api/ssl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, domain }),
      });
      const data = await res.json();
      if (!res.ok || data.error)
        throw new Error(data.error || "Failed to issue SSL certificate");
      await fetchCertificates();
    } catch (err: any) {
      alert(err.message || "Failed to issue SSL certificate");
    } finally {
      setIssuingDomain(null);
    }
  };

  const handleRenewSSL = async (user: string, domain: string) => {
    const key = `${user}:${domain}`;
    setRenewingDomain(key);
    try {
      const res = await fetch("/api/ssl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, domain }),
      });
      const data = await res.json();
      if (!res.ok || data.error)
        throw new Error(data.error || "Failed to renew SSL certificate");
      await fetchCertificates();
    } catch (err: any) {
      alert(err.message || "Failed to renew SSL certificate");
    } finally {
      setRenewingDomain(null);
    }
  };

  const handleRemoveSSL = async () => {
    if (!removeTarget) return;
    setRemoveLoading(true);
    try {
      const res = await fetch(
        `/api/ssl?user=${encodeURIComponent(removeTarget.user)}&domain=${encodeURIComponent(removeTarget.domain)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok || data.error)
        throw new Error(data.error || "Failed to remove SSL certificate");
      setRemoveDialogOpen(false);
      setRemoveTarget(null);
      await fetchCertificates();
    } catch (err: any) {
      alert(err.message || "Failed to remove SSL certificate");
    } finally {
      setRemoveLoading(false);
    }
  };

  const securedCount = certificates.filter((c) => c.ssl === "yes").length;
  const unsecuredCount = certificates.filter((c) => c.ssl !== "yes").length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#134E4A]">SSL Certificates</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <GlassCard className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
            <ShieldCheck className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Domains Secured</p>
            <p className="text-2xl font-bold text-emerald-700">
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
              ) : (
                securedCount
              )}
            </p>
          </div>
        </GlassCard>
        <GlassCard className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-100">
            <Shield className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Without SSL</p>
            <p className="text-2xl font-bold text-red-700">
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-red-600" />
              ) : (
                unsecuredCount
              )}
            </p>
          </div>
        </GlassCard>
      </div>

      {/* Error State */}
      {error && (
        <GlassCard className="border-red-200 bg-red-50/70">
          <p className="text-sm text-red-600">{error}</p>
        </GlassCard>
      )}

      {/* Certificates Table */}
      <GlassCard>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
            <span className="ml-2 text-sm text-muted-foreground">
              Loading SSL certificates...
            </span>
          </div>
        ) : certificates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-teal-100 flex items-center justify-center">
              <Shield className="w-8 h-8 text-teal-600" />
            </div>
            <h2 className="text-xl font-semibold text-[#134E4A]">
              No Domains Found
            </h2>
            <p className="text-muted-foreground">
              There are no domains configured yet. Add a domain first to manage
              SSL certificates.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Domain</TableHead>
                <TableHead>User</TableHead>
                <TableHead>SSL Status</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Issuer</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {certificates.map((cert) => {
                const hasSSL = cert.ssl === "yes";
                const isLetsEncrypt = cert.letsencrypt === "yes";
                const rowKey = `${cert.user}:${cert.domain}`;

                return (
                  <TableRow key={rowKey}>
                    {/* Domain */}
                    <TableCell className="font-medium text-[#134E4A]">
                      {cert.domain}
                    </TableCell>

                    {/* User */}
                    <TableCell>{cert.user}</TableCell>

                    {/* SSL Status */}
                    <TableCell>
                      {hasSSL ? (
                        <div className="flex items-center gap-2">
                          <Lock className="h-4 w-4 text-emerald-600" />
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                            Active
                          </Badge>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Unlock className="h-4 w-4 text-red-500" />
                          <Badge className="bg-red-100 text-red-700 border-red-200">
                            Not Secured
                          </Badge>
                        </div>
                      )}
                    </TableCell>

                    {/* Type */}
                    <TableCell>
                      {isLetsEncrypt ? (
                        <Badge className="bg-violet-100 text-violet-700 border-violet-200">
                          Let&apos;s Encrypt
                        </Badge>
                      ) : hasSSL ? (
                        <Badge className="bg-teal-100 text-teal-700 border-teal-200">
                          Custom
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-500 border-gray-200">
                          None
                        </Badge>
                      )}
                    </TableCell>

                    {/* Issuer */}
                    <TableCell className="text-muted-foreground">
                      {hasSSL && cert.sslIssuer ? cert.sslIssuer : "N/A"}
                    </TableCell>

                    {/* Expiry Date */}
                    <TableCell
                      className={
                        hasSSL
                          ? getExpiryColorClass(cert.sslExpiry)
                          : "text-muted-foreground"
                      }
                    >
                      {hasSSL ? formatExpiryDate(cert.sslExpiry) : "N/A"}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!hasSSL ? (
                          <Button
                            size="sm"
                            className="cursor-pointer bg-teal-600 text-white hover:bg-teal-700"
                            onClick={() =>
                              handleIssueSSL(cert.user, cert.domain)
                            }
                            disabled={issuingDomain === rowKey}
                          >
                            {issuingDomain === rowKey ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <ShieldCheck className="h-4 w-4" />
                            )}
                            Issue SSL
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="cursor-pointer border-teal-300 text-teal-700 hover:bg-teal-50"
                              onClick={() =>
                                handleRenewSSL(cert.user, cert.domain)
                              }
                              disabled={renewingDomain === rowKey}
                            >
                              {renewingDomain === rowKey ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                              Renew
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="cursor-pointer border-red-300 text-red-600 hover:bg-red-50"
                              onClick={() => {
                                setRemoveTarget({
                                  user: cert.user,
                                  domain: cert.domain,
                                });
                                setRemoveDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                              Remove
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </GlassCard>

      {/* Remove Confirmation Dialog */}
      <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove SSL Certificate</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove the SSL certificate for{" "}
              <strong>{removeTarget?.domain}</strong> (user{" "}
              <strong>{removeTarget?.user}</strong>)? The domain will no longer
              be served over HTTPS.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleRemoveSSL}
              disabled={removeLoading}
              className="cursor-pointer"
            >
              {removeLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Remove SSL
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
