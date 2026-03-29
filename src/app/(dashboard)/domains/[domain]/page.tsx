"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Globe, ExternalLink, Loader2, HardDrive, Activity,
  ShieldCheck, ShieldOff, Mail, Folder, File, ChevronRight, ArrowUp,
  Home, Upload, Download, FolderPlus, Eye, Trash2, Plus, Copy, Check,
  Server, Key, EyeOff, Pencil, Search, Lock, Ban, PlayCircle, Link,
  Unlink, ArrowUpRight, FolderOpen, Database, Settings, RefreshCw,
  Forward, MessageSquareReply, Monitor, Inbox, KeyRound, UserX, UserCheck,
} from "lucide-react";
import { GlassCard } from "@/components/layout/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/* ═══════════════════════ Interfaces ═══════════════════════ */

interface HestiaDomain {
  domain: string; user: string; IP: string; IP6: string;
  U_DISK: string; U_BANDWIDTH: string;
  SSL: string; SSL_HOME: string; SSL_EXPIRE: string; SSL_ISSUER: string; LETSENCRYPT: string;
  BACKEND: string; PROXY: string; PROXY_EXT: string; TPL: string;
  ALIAS: string; REDIRECT: string; REDIRECT_CODE: string;
  SUSPENDED: string; DATE: string; TIME: string;
  AUTH_USER: string; DOCROOT: string; FTP_USER: string; FTP_PATH: string;
  httpAuthUsers?: any[];
}
interface FileEntry { name: string; TYPE?: string; SIZE?: string; DATE?: string; TIME?: string; OWNER?: string; PERMISSIONS?: string; }
interface FtpAccount { ftpUser: string; domain: string; user: string; path: string; }
interface DnsRecord { id: string; domain: string; user: string; RECORD: string; TYPE: string; VALUE: string; PRIORITY: string; TTL: string; SUSPENDED: string; }
interface MailAccount { account: string; domain: string; user: string; QUOTA: string; U_DISK: string; SUSPENDED: string; FWD: string; AUTOREPLY: string; ALIAS?: string; }
interface HestiaDatabase { name: string; user: string; DATABASE: string; DBUSER: string; HOST: string; TYPE: string; CHARSET: string; U_DISK: string; SUSPENDED: string; TIME: string; DATE: string; }
interface Templates { backend: string[]; web: string[]; proxy: string[]; }

/* ═══════════════════════ Constants ═══════════════════════ */

const FTP_HOST = "116.202.219.165";
const DNS_TYPES = ["A", "AAAA", "CNAME", "MX", "TXT", "SRV", "NS", "CAA"];
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
const TABS = ["Overview", "Files", "FTP", "DNS", "Mail", "Databases", "SSL", "Settings"] as const;
type Tab = (typeof TABS)[number];
const TAB_HASH: Record<string, Tab> = {
  overview: "Overview", files: "Files", ftp: "FTP", dns: "DNS",
  mail: "Mail", databases: "Databases", ssl: "SSL", settings: "Settings",
};

/* ═══════════════════════ Helpers ═══════════════════════ */

function generatePassword() {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let pwd = "";
  for (let i = 0; i < 16; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}
function cpClip(text: string) { navigator.clipboard.writeText(text); }
function formatDisk(mb: string) { const v = parseInt(mb || "0", 10); return v >= 1024 ? `${(v / 1024).toFixed(1)} GB` : `${v} MB`; }
function formatSize(size?: string) {
  if (!size) return "\u2014";
  const n = parseInt(size, 10);
  if (isNaN(n)) return size;
  if (n >= 1073741824) return `${(n / 1073741824).toFixed(1)} GB`;
  if (n >= 1048576) return `${(n / 1048576).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}
function isTextFile(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return ["txt","md","html","htm","css","js","ts","tsx","jsx","json","xml","yml","yaml","conf","cfg","ini","sh","bash","py","php","rb","log","env","htaccess","sql"].includes(ext);
}


/* ═══════════════════════ Page Component ═══════════════════════ */

export default function DomainPage() {
  const router = useRouter();
  const params = useParams<{ domain: string }>();
  const searchParams = useSearchParams();
  const domain = decodeURIComponent(params.domain || "");
  const user = searchParams.get("user") || "";

  const [domainInfo, setDomainInfo] = useState<HestiaDomain | null>(null);
  const [domainLoading, setDomainLoading] = useState(true);
  const [domainError, setDomainError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [loadedTabs, setLoadedTabs] = useState<Set<Tab>>(new Set());
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, field: string) => {
    cpClip(text); setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // FILES
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [filesError, setFilesError] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState("");
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerContent, setViewerContent] = useState("");
  const [viewerFile, setViewerFile] = useState("");
  const [viewerLoading, setViewerLoading] = useState(false);
  const [mkdirOpen, setMkdirOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [mkdirLoading, setMkdirLoading] = useState(false);
  const [fileDeleteOpen, setFileDeleteOpen] = useState(false);
  const [fileDeleteTarget, setFileDeleteTarget] = useState<FileEntry | null>(null);
  const [fileDeleteLoading, setFileDeleteLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);

  // FTP
  const [ftpAccounts, setFtpAccounts] = useState<FtpAccount[]>([]);
  const [ftpLoading, setFtpLoading] = useState(false);
  const [ftpError, setFtpError] = useState<string | null>(null);
  const [ftpCreateOpen, setFtpCreateOpen] = useState(false);
  const [ftpCreateForm, setFtpCreateForm] = useState({ ftp_user: "", password: "" });
  const [ftpCreateLoading, setFtpCreateLoading] = useState(false);
  const [showFtpCreatePw, setShowFtpCreatePw] = useState(false);
  const [ftpPwOpen, setFtpPwOpen] = useState(false);
  const [ftpPwTarget, setFtpPwTarget] = useState<FtpAccount | null>(null);
  const [ftpNewPw, setFtpNewPw] = useState("");
  const [showFtpPw, setShowFtpPw] = useState(false);
  const [ftpPwLoading, setFtpPwLoading] = useState(false);
  const [ftpDeleteOpen, setFtpDeleteOpen] = useState(false);
  const [ftpDeleteTarget, setFtpDeleteTarget] = useState<FtpAccount | null>(null);
  const [ftpDeleteLoading, setFtpDeleteLoading] = useState(false);

  // DNS
  const [dnsRecords, setDnsRecords] = useState<DnsRecord[]>([]);
  const [dnsLoading, setDnsLoading] = useState(false);
  const [dnsError, setDnsError] = useState<string | null>(null);
  const [dnsTypeFilter, setDnsTypeFilter] = useState("ALL");
  const [dnsSearch, setDnsSearch] = useState("");
  const [dnsFormOpen, setDnsFormOpen] = useState(false);
  const [dnsFormMode, setDnsFormMode] = useState<"add" | "edit">("add");
  const [dnsEditId, setDnsEditId] = useState("");
  const [dnsForm, setDnsForm] = useState({ record: "", type: "A", value: "", priority: "", ttl: "14400" });
  const [dnsFormLoading, setDnsFormLoading] = useState(false);
  const [dnsDeleteOpen, setDnsDeleteOpen] = useState(false);
  const [dnsDeleteTarget, setDnsDeleteTarget] = useState<DnsRecord | null>(null);
  const [dnsDeleteLoading, setDnsDeleteLoading] = useState(false);

  // MAIL
  const [mailAccounts, setMailAccounts] = useState<MailAccount[]>([]);
  const [mailLoading, setMailLoading] = useState(false);
  const [mailError, setMailError] = useState<string | null>(null);
  const [mailCreateOpen, setMailCreateOpen] = useState(false);
  const [mailCreateForm, setMailCreateForm] = useState({ account: "", password: "" });
  const [mailCreateLoading, setMailCreateLoading] = useState(false);
  const [mailDeleteOpen, setMailDeleteOpen] = useState(false);
  const [mailDeleteTarget, setMailDeleteTarget] = useState<MailAccount | null>(null);
  const [mailDeleteLoading, setMailDeleteLoading] = useState(false);
  const [mailPwOpen, setMailPwOpen] = useState(false);
  const [mailPwTarget, setMailPwTarget] = useState<MailAccount | null>(null);
  const [mailNewPw, setMailNewPw] = useState("");
  const [mailPwLoading, setMailPwLoading] = useState(false);
  const [mailSheetOpen, setMailSheetOpen] = useState(false);
  const [mailSheetAccount, setMailSheetAccount] = useState<MailAccount | null>(null);
  const [mailSheetTab, setMailSheetTab] = useState<"info" | "forwarding" | "autoreply" | "connection">("info");
  const [newFwdEmail, setNewFwdEmail] = useState("");
  const [fwdLoading, setFwdLoading] = useState(false);
  const [arMsg, setArMsg] = useState("");
  const [arLoading, setArLoading] = useState(false);
  const [arFetched, setArFetched] = useState(false);

  // DATABASES
  const [databases, setDatabases] = useState<HestiaDatabase[]>([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [dbCreateOpen, setDbCreateOpen] = useState(false);
  const [dbCreateForm, setDbCreateForm] = useState({ db_name: "", db_user: "", db_password: "", type: "mysql" });
  const [dbCreateLoading, setDbCreateLoading] = useState(false);
  const [showDbPw, setShowDbPw] = useState(false);
  const [dbPwOpen, setDbPwOpen] = useState(false);
  const [dbPwTarget, setDbPwTarget] = useState<HestiaDatabase | null>(null);
  const [dbNewPw, setDbNewPw] = useState("");
  const [showDbNewPw, setShowDbNewPw] = useState(false);
  const [dbPwLoading, setDbPwLoading] = useState(false);
  const [dbDeleteOpen, setDbDeleteOpen] = useState(false);
  const [dbDeleteTarget, setDbDeleteTarget] = useState<HestiaDatabase | null>(null);
  const [dbDeleteLoading, setDbDeleteLoading] = useState(false);
  const [dbActionLoading, setDbActionLoading] = useState<Record<string, boolean>>({});

  // SSL
  const [sslRequesting, setSslRequesting] = useState(false);
  const [mailSslRequesting, setMailSslRequesting] = useState(false);
  const [sslRevoking, setSslRevoking] = useState(false);
  const [sslError, setSslError] = useState<string | null>(null);
  const [sslSuccess, setSslSuccess] = useState<string | null>(null);

  // SETTINGS
  const [templates, setTemplates] = useState<Templates | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [newAlias, setNewAlias] = useState("");
  const [newRedirectUrl, setNewRedirectUrl] = useState("");
  const [newRedirectCode, setNewRedirectCode] = useState("301");
  const [newAuthUser, setNewAuthUser] = useState("");
  const [newAuthPass, setNewAuthPass] = useState("");
  const [httpAuthUsers, setHttpAuthUsers] = useState<any[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteDomainLoading, setDeleteDomainLoading] = useState(false);

  // ── Base path for files ──
  const basePath = user ? `/home/${user}/web/${domain}/public_html` : "";

  // ══════════════════ FETCH FUNCTIONS ══════════════════

  const fetchDomainInfo = useCallback(async () => {
    if (!domain || !user) return;
    setDomainLoading(true);
    setDomainError(null);
    try {
      const res = await fetch(`/api/domains/${encodeURIComponent(domain)}?user=${encodeURIComponent(user)}`);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to fetch domain info");
      setDomainInfo(data);
      if (data.httpAuthUsers) setHttpAuthUsers(data.httpAuthUsers);
    } catch (err: any) {
      setDomainError(err.message);
    } finally {
      setDomainLoading(false);
    }
  }, [domain, user]);

  const fetchFiles = useCallback(async (p?: string) => {
    const filePath = p || currentPath || basePath;
    if (!user || !filePath) return;
    setFilesLoading(true);
    setFilesError(null);
    try {
      const res = await fetch(`/api/files?user=${encodeURIComponent(user)}&path=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.type === "files" && Array.isArray(data.data)) setFiles(data.data);
    } catch (err: any) {
      setFilesError(err.message);
      setFiles([]);
    } finally {
      setFilesLoading(false);
    }
  }, [user, currentPath, basePath]);

  const fetchFtp = useCallback(async () => {
    setFtpLoading(true);
    setFtpError(null);
    try {
      const res = await fetch("/api/ftp");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setFtpAccounts((data as FtpAccount[]).filter((a) => a.domain === domain));
    } catch (err: any) {
      setFtpError(err.message);
    } finally {
      setFtpLoading(false);
    }
  }, [domain]);

  const fetchDns = useCallback(async () => {
    setDnsLoading(true);
    setDnsError(null);
    try {
      const res = await fetch(`/api/dns/records?user=${encodeURIComponent(user)}&domain=${encodeURIComponent(domain)}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDnsRecords(data);
    } catch (err: any) {
      setDnsError(err.message);
    } finally {
      setDnsLoading(false);
    }
  }, [user, domain]);

  const fetchMail = useCallback(async () => {
    setMailLoading(true);
    setMailError(null);
    try {
      const res = await fetch(`/api/mail/accounts?user=${encodeURIComponent(user)}&domain=${encodeURIComponent(domain)}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMailAccounts(data);
      return data as MailAccount[];
    } catch (err: any) {
      setMailError(err.message);
      return [];
    } finally {
      setMailLoading(false);
    }
  }, [user, domain]);

  const fetchDatabases = useCallback(async () => {
    setDbLoading(true);
    setDbError(null);
    try {
      const res = await fetch("/api/databases");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDatabases((data as HestiaDatabase[]).filter((db) => db.user === user));
    } catch (err: any) {
      setDbError(err.message);
    } finally {
      setDbLoading(false);
    }
  }, [user]);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/domains/templates");
      if (!res.ok) return;
      const data = await res.json();
      if (!data.error) setTemplates(data);
    } catch {}
  }, []);

  // ── Domain action helper ──
  const domainAction = useCallback(async (action: string, extraParams: Record<string, string> = {}) => {
    if (!domainInfo) return false;
    setActionLoading(action);
    try {
      const res = await fetch(`/api/domains/${encodeURIComponent(domain)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, action, ...extraParams }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Action failed");
      await fetchDomainInfo();
      return true;
    } catch (err: any) {
      alert(err.message || "Action failed");
      return false;
    } finally {
      setActionLoading(null);
    }
  }, [domain, user, domainInfo, fetchDomainInfo]);

  // ══════════════════ EFFECTS ══════════════════

  // Hash-based deep linking
  useEffect(() => {
    const hash = window.location.hash.replace("#", "").toLowerCase();
    if (hash && TAB_HASH[hash]) setActiveTab(TAB_HASH[hash]);
  }, []);

  // Fetch domain info on mount
  useEffect(() => { fetchDomainInfo(); }, [fetchDomainInfo]);

  // Lazy load tab data
  useEffect(() => {
    if (loadedTabs.has(activeTab)) return;
    setLoadedTabs((prev) => new Set(prev).add(activeTab));
    switch (activeTab) {
      case "Files":
        if (!currentPath) setCurrentPath(basePath);
        fetchFiles(basePath);
        break;
      case "FTP": fetchFtp(); break;
      case "DNS": fetchDns(); break;
      case "Mail": fetchMail(); break;
      case "Databases": fetchDatabases(); break;
      case "Settings": fetchTemplates(); break;
    }
  }, [activeTab, loadedTabs, basePath, currentPath, fetchFiles, fetchFtp, fetchDns, fetchMail, fetchDatabases, fetchTemplates]);

  // Refetch files when path changes
  useEffect(() => {
    if (activeTab === "Files" && currentPath && currentPath.startsWith("/home/")) {
      fetchFiles(currentPath);
    }
  }, [currentPath, activeTab, fetchFiles]);

  // Update URL hash on tab change
  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    window.location.hash = tab.toLowerCase();
  };

  // ══════════════════ FILE HANDLERS ══════════════════

  const navigateToDir = (name: string) => setCurrentPath(currentPath === "/" ? `/${name}` : `${currentPath}/${name}`);
  const navigateUp = () => {
    if (!basePath || currentPath === basePath) return;
    const parts = currentPath.split("/").filter(Boolean);
    parts.pop();
    const np = "/" + parts.join("/");
    setCurrentPath(np.length >= basePath.length ? np : basePath);
  };
  const breadcrumbs = currentPath.split("/").filter(Boolean).map((part, i, arr) => ({
    name: part, path: "/" + arr.slice(0, i + 1).join("/"),
  }));

  const handleViewFile = async (file: FileEntry) => {
    const filePath = `${currentPath}/${file.name}`;
    setViewerFile(file.name); setViewerOpen(true); setViewerLoading(true);
    try {
      const res = await fetch(`/api/files/content?user=${encodeURIComponent(user)}&path=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setViewerContent(data.content || "");
    } catch (err: any) { setViewerContent(`Error: ${err.message}`); }
    finally { setViewerLoading(false); }
  };
  const handleDownload = (file: FileEntry) => {
    const filePath = `${currentPath}/${file.name}`;
    window.open(`/api/files/download?user=${encodeURIComponent(user)}&path=${encodeURIComponent(filePath)}`, "_blank");
  };
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setMkdirLoading(true);
    try {
      const res = await fetch("/api/files", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, path: `${currentPath}/${newFolderName.trim()}`, action: "mkdir" }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMkdirOpen(false); setNewFolderName(""); await fetchFiles(currentPath);
    } catch (err: any) { alert(err.message); }
    finally { setMkdirLoading(false); }
  };
  const handleFileDelete = async () => {
    if (!fileDeleteTarget) return;
    setFileDeleteLoading(true);
    try {
      const filePath = `${currentPath}/${fileDeleteTarget.name}`;
      const type = fileDeleteTarget.TYPE === "d" ? "dir" : "file";
      const res = await fetch(`/api/files?user=${encodeURIComponent(user)}&path=${encodeURIComponent(filePath)}&type=${type}`, { method: "DELETE" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setFileDeleteOpen(false); setFileDeleteTarget(null); await fetchFiles(currentPath);
    } catch (err: any) { alert(err.message); }
    finally { setFileDeleteLoading(false); }
  };
  const handleUploadFiles = async (fileList: FileList) => {
    setUploadLoading(true);
    try {
      for (const file of Array.from(fileList)) {
        const formData = new FormData();
        formData.append("file", file); formData.append("user", user); formData.append("path", currentPath);
        const res = await fetch("/api/files/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
      }
      await fetchFiles(currentPath);
    } catch (err: any) { alert(err.message); }
    finally { setUploadLoading(false); }
  };

  // ══════════════════ FTP HANDLERS ══════════════════

  const handleFtpCreate = async () => {
    if (!ftpCreateForm.ftp_user || !ftpCreateForm.password) { alert("Fill in all fields."); return; }
    setFtpCreateLoading(true);
    try {
      const res = await fetch("/api/ftp", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, domain, ftp_user: ftpCreateForm.ftp_user, password: ftpCreateForm.password }) });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed");
      setFtpCreateOpen(false); setFtpCreateForm({ ftp_user: "", password: "" }); setShowFtpCreatePw(false); await fetchFtp();
    } catch (err: any) { alert(err.message); }
    finally { setFtpCreateLoading(false); }
  };
  const handleFtpChangePw = async () => {
    if (!ftpPwTarget || !ftpNewPw) return;
    setFtpPwLoading(true);
    try {
      const res = await fetch("/api/ftp", { method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: ftpPwTarget.user, domain: ftpPwTarget.domain, ftp_user: ftpPwTarget.ftpUser, password: ftpNewPw }) });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed");
      setFtpPwOpen(false); setFtpPwTarget(null); setFtpNewPw("");
    } catch (err: any) { alert(err.message); }
    finally { setFtpPwLoading(false); }
  };
  const handleFtpDelete = async () => {
    if (!ftpDeleteTarget) return;
    setFtpDeleteLoading(true);
    try {
      const res = await fetch(`/api/ftp?user=${encodeURIComponent(ftpDeleteTarget.user)}&domain=${encodeURIComponent(ftpDeleteTarget.domain)}&ftp_user=${encodeURIComponent(ftpDeleteTarget.ftpUser)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed");
      setFtpDeleteOpen(false); setFtpDeleteTarget(null); await fetchFtp();
    } catch (err: any) { alert(err.message); }
    finally { setFtpDeleteLoading(false); }
  };

  // DNS HANDLERS

  const openDnsAdd = () => { setDnsFormMode("add"); setDnsForm({ record: "", type: "A", value: "", priority: "", ttl: "14400" }); setDnsEditId(""); setDnsFormOpen(true); };
  const openDnsEdit = (rec: DnsRecord) => {
    setDnsFormMode("edit"); setDnsEditId(rec.id);
    setDnsForm({ record: rec.RECORD, type: rec.TYPE, value: rec.VALUE, priority: rec.PRIORITY || "", ttl: rec.TTL || "14400" });
    setDnsFormOpen(true);
  };
  const handleDnsSubmit = async () => {
    if (!dnsForm.record || !dnsForm.type || !dnsForm.value) { alert("Fill required fields."); return; }
    setDnsFormLoading(true);
    try {
      const body: any = { user, domain, record: dnsForm.record, type: dnsForm.type, value: dnsForm.value, priority: dnsForm.priority || undefined, ttl: dnsForm.ttl || undefined };
      if (dnsFormMode === "edit") {
        body.id = dnsEditId;
        const res = await fetch("/api/dns/records", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || "Failed");
      } else {
        const res = await fetch("/api/dns/records", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || "Failed");
      }
      setDnsFormOpen(false); await fetchDns();
    } catch (err: any) { alert(err.message); }
    finally { setDnsFormLoading(false); }
  };
  const handleDnsDelete = async () => {
    if (!dnsDeleteTarget) return;
    setDnsDeleteLoading(true);
    try {
      const res = await fetch(`/api/dns/records?user=${encodeURIComponent(user)}&domain=${encodeURIComponent(domain)}&id=${encodeURIComponent(dnsDeleteTarget.id)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed");
      setDnsDeleteOpen(false); setDnsDeleteTarget(null); await fetchDns();
    } catch (err: any) { alert(err.message); }
    finally { setDnsDeleteLoading(false); }
  };
  const dnsShowPriority = dnsForm.type === "MX" || dnsForm.type === "SRV";
  const filteredDns = dnsRecords.filter((r) => {
    if (dnsTypeFilter !== "ALL" && r.TYPE !== dnsTypeFilter) return false;
    if (dnsSearch) { const q = dnsSearch.toLowerCase(); return r.RECORD.toLowerCase().includes(q) || r.VALUE.toLowerCase().includes(q); }
    return true;
  });
  const dnsTypeCounts: Record<string, number> = {};
  dnsRecords.forEach((r) => { dnsTypeCounts[r.TYPE] = (dnsTypeCounts[r.TYPE] || 0) + 1; });

  // MAIL HANDLERS

  const handleMailCreate = async () => {
    if (!mailCreateForm.account || !mailCreateForm.password) { alert("Fill in all fields."); return; }
    setMailCreateLoading(true);
    try {
      const res = await fetch("/api/mail/accounts", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, domain, account: mailCreateForm.account, password: mailCreateForm.password }) });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed");
      setMailCreateOpen(false); setMailCreateForm({ account: "", password: "" }); await fetchMail();
    } catch (err: any) { alert(err.message); }
    finally { setMailCreateLoading(false); }
  };
  const handleMailDelete = async () => {
    if (!mailDeleteTarget) return;
    setMailDeleteLoading(true);
    try {
      const res = await fetch(`/api/mail/accounts?user=${encodeURIComponent(user)}&domain=${encodeURIComponent(domain)}&account=${encodeURIComponent(mailDeleteTarget.account)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed");
      setMailDeleteOpen(false); setMailDeleteTarget(null); await fetchMail();
    } catch (err: any) { alert(err.message); }
    finally { setMailDeleteLoading(false); }
  };
  const handleMailPwChange = async () => {
    if (!mailPwTarget || !mailNewPw) return;
    setMailPwLoading(true);
    try {
      const res = await fetch("/api/mail/accounts", { method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: mailPwTarget.user, domain: mailPwTarget.domain, account: mailPwTarget.account, action: "password", value: mailNewPw }) });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed");
      setMailPwOpen(false); setMailPwTarget(null); setMailNewPw("");
    } catch (err: any) { alert(err.message); }
    finally { setMailPwLoading(false); }
  };
  const handleMailSuspendToggle = async (a: MailAccount) => {
    const isSusp = a.SUSPENDED !== "no" && a.SUSPENDED !== "";
    try {
      const res = await fetch("/api/mail/accounts", { method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: a.user, domain: a.domain, account: a.account, action: isSusp ? "unsuspend" : "suspend" }) });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error);
      await fetchMail();
    } catch (err: any) { alert(err.message); }
  };
  const openMailSheet = (a: MailAccount) => {
    setMailSheetAccount(a); setMailSheetTab("info"); setNewFwdEmail(""); setArMsg(""); setArFetched(false); setMailSheetOpen(true);
  };
  const refreshMailSheet = async () => {
    const updated = await fetchMail();
    if (mailSheetAccount) { const found = updated.find((a: MailAccount) => a.account === mailSheetAccount.account); if (found) setMailSheetAccount(found); }
  };
  const handleAddFwd = async () => {
    if (!mailSheetAccount || !newFwdEmail) return;
    setFwdLoading(true);
    try {
      const res = await fetch("/api/mail/accounts", { method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: mailSheetAccount.user, domain: mailSheetAccount.domain, account: mailSheetAccount.account, action: "add-forward", value: newFwdEmail }) });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed");
      setNewFwdEmail(""); await refreshMailSheet();
    } catch (err: any) { alert(err.message); }
    finally { setFwdLoading(false); }
  };
  const handleDeleteFwd = async (fwd: string) => {
    if (!mailSheetAccount) return;
    setFwdLoading(true);
    try {
      const res = await fetch("/api/mail/accounts", { method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: mailSheetAccount.user, domain: mailSheetAccount.domain, account: mailSheetAccount.account, action: "delete-forward", value: fwd }) });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed");
      await refreshMailSheet();
    } catch (err: any) { alert(err.message); }
    finally { setFwdLoading(false); }
  };
  const fetchAutoreply = async (account: MailAccount) => {
    if (arFetched) return;
    setArLoading(true);
    try {
      const res = await fetch("/api/mail/accounts", { method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: account.user, domain: account.domain, account: account.account, action: "get-autoreply" }) });
      const data = await res.json();
      if (data.message) setArMsg(data.message);
      setArFetched(true);
    } catch {} finally { setArLoading(false); }
  };
  const handleSaveAutoreply = async () => {
    if (!mailSheetAccount || !arMsg.trim()) return;
    setArLoading(true);
    try {
      const res = await fetch("/api/mail/accounts", { method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: mailSheetAccount.user, domain: mailSheetAccount.domain, account: mailSheetAccount.account, action: "add-autoreply", value: arMsg }) });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed");
      await refreshMailSheet();
    } catch (err: any) { alert(err.message); }
    finally { setArLoading(false); }
  };
  const handleDeleteAutoreply = async () => {
    if (!mailSheetAccount) return;
    setArLoading(true);
    try {
      const res = await fetch("/api/mail/accounts", { method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: mailSheetAccount.user, domain: mailSheetAccount.domain, account: mailSheetAccount.account, action: "delete-autoreply" }) });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed");
      setArMsg(""); await refreshMailSheet();
    } catch (err: any) { alert(err.message); }
    finally { setArLoading(false); }
  };

  // DATABASE HANDLERS

  const handleDbCreate = async () => {
    if (!dbCreateForm.db_name || !dbCreateForm.db_user || !dbCreateForm.db_password) { alert("Fill all fields."); return; }
    setDbCreateLoading(true);
    try {
      const res = await fetch("/api/databases", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, ...dbCreateForm }) });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed");
      setDbCreateOpen(false); setDbCreateForm({ db_name: "", db_user: "", db_password: "", type: "mysql" }); await fetchDatabases();
    } catch (err: any) { alert(err.message); }
    finally { setDbCreateLoading(false); }
  };
  const handleDbDelete = async () => {
    if (!dbDeleteTarget) return;
    setDbDeleteLoading(true);
    try {
      const res = await fetch(`/api/databases?user=${encodeURIComponent(dbDeleteTarget.user)}&db_name=${encodeURIComponent(dbDeleteTarget.name)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed");
      setDbDeleteOpen(false); setDbDeleteTarget(null); await fetchDatabases();
    } catch (err: any) { alert(err.message); }
    finally { setDbDeleteLoading(false); }
  };
  const handleDbChangePw = async () => {
    if (!dbPwTarget || !dbNewPw) return;
    setDbPwLoading(true);
    try {
      const res = await fetch("/api/databases", { method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: dbPwTarget.user, db_name: dbPwTarget.name, action: "change_password", password: dbNewPw }) });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed");
      setDbPwOpen(false); setDbPwTarget(null); setDbNewPw("");
    } catch (err: any) { alert(err.message); }
    finally { setDbPwLoading(false); }
  };
  const handleDbToggleSuspend = async (db: HestiaDatabase) => {
    const key = `${db.user}-${db.name}`;
    setDbActionLoading((prev) => ({ ...prev, [key]: true }));
    try {
      const action = db.SUSPENDED === "yes" ? "unsuspend" : "suspend";
      const res = await fetch("/api/databases", { method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: db.user, db_name: db.name, action }) });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed");
      await fetchDatabases();
    } catch (err: any) { alert(err.message); }
    finally { setDbActionLoading((prev) => ({ ...prev, [key]: false })); }
  };

  // SSL HANDLERS

  const handleRequestSsl = async () => {
    setSslRequesting(true);
    setSslError(null);
    setSslSuccess(null);
    try {
      const res = await fetch("/api/domains", { method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, domain }) });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "SSL error");
      setSslSuccess("SSL certificate issued successfully");
      await fetchDomainInfo();
    } catch (err: any) { setSslError(err.message); }
    finally { setSslRequesting(false); }
  };
  const handleRequestMailSsl = async () => {
    setMailSslRequesting(true);
    setSslError(null);
    setSslSuccess(null);
    try {
      const res = await fetch("/api/mail", { method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, domain, action: "ssl" }) });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Mail SSL error");
      setSslSuccess("Mail SSL certificate issued successfully");
      await fetchDomainInfo();
    } catch (err: any) { setSslError(err.message); }
    finally { setMailSslRequesting(false); }
  };
  const handleRevokeSsl = async () => {
    setSslRevoking(true);
    setSslError(null);
    setSslSuccess(null);
    try {
      const res = await fetch("/api/domains", { method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, domain, action: "revoke-ssl" }) });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Revoke error");
      setSslSuccess("SSL certificate revoked");
      await fetchDomainInfo();
    } catch (err: any) { setSslError(err.message); }
    finally { setSslRevoking(false); }
  };

  // SETTINGS HELPERS

  const aliases = domainInfo ? (domainInfo.ALIAS || "").split(",").map((s) => s.trim()).filter(Boolean) : [];

  const handleDeleteDomain = async () => {
    setDeleteDomainLoading(true);
    try {
      const res = await fetch(`/api/domains?user=${encodeURIComponent(user)}&domain=${encodeURIComponent(domain)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed");
      setDeleteDialogOpen(false);
      router.push("/domains");
    } catch (err: any) { alert(err.message); }
    finally { setDeleteDomainLoading(false); }
  };

  // ══════════════════ RENDER ══════════════════

  if (domainLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        <span className="ml-3 text-muted-foreground">Loading domain...</span>
      </div>
    );
  }

  if (domainError || !domainInfo) {
    return (
      <div className="space-y-6">
        <button onClick={() => router.push("/domains")} className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700 cursor-pointer">
          <ArrowLeft className="h-4 w-4" /> Back to Domains
        </button>
        <GlassCard className="border-red-200 bg-red-50/70">
          <p className="text-sm text-red-600">{domainError || "Domain not found"}</p>
        </GlassCard>
      </div>
    );
  }

  const isSuspended = domainInfo.SUSPENDED !== "no";
  const hasSSL = domainInfo.SSL && domainInfo.SSL !== "no";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <button onClick={() => router.push("/domains")} className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700 cursor-pointer">
          <ArrowLeft className="h-4 w-4" /> Back to Domains
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-100">
              <Globe className="h-6 w-6 text-teal-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#134E4A]">{domainInfo.domain}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                {isSuspended ? (
                  <Badge className="bg-red-100 text-red-700 border-red-200">Suspended</Badge>
                ) : (
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Active</Badge>
                )}
                <span className="text-xs text-muted-foreground">{domainInfo.user}</span>
                <span className="text-xs text-muted-foreground font-mono">{domainInfo.IP}</span>
              </div>
            </div>
          </div>
          <a
            href={`${hasSSL ? "https" : "http"}://${domainInfo.domain}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" className="cursor-pointer">
              <ExternalLink className="h-4 w-4" />
              Open Site
            </Button>
          </a>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => switchTab(tab)}
            className={cn(
              "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors cursor-pointer",
              activeTab === tab
                ? "bg-teal-600 text-white"
                : "bg-white/60 text-gray-600 hover:bg-white/80 border border-gray-200"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ═══════════ OVERVIEW TAB ═══════════ */}
      {activeTab === "Overview" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <GlassCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
                  <HardDrive className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#134E4A]">{formatDisk(domainInfo.U_DISK)}</p>
                  <p className="text-xs text-muted-foreground">Disk Usage</p>
                </div>
              </div>
            </GlassCard>
            <GlassCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#134E4A]">{formatDisk(domainInfo.U_BANDWIDTH)}</p>
                  <p className="text-xs text-muted-foreground">Bandwidth</p>
                </div>
              </div>
            </GlassCard>
            <GlassCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: hasSSL ? "rgb(209 250 229)" : "rgb(254 226 226)" }}>
                  {hasSSL ? <ShieldCheck className="w-5 h-5 text-emerald-600" /> : <ShieldOff className="w-5 h-5 text-red-600" />}
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#134E4A]">{hasSSL ? "Active" : "None"}</p>
                  <p className="text-xs text-muted-foreground">SSL Status</p>
                </div>
              </div>
            </GlassCard>
            <GlassCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#134E4A]">{loadedTabs.has("Mail") ? mailAccounts.length : "\u2014"}</p>
                  <p className="text-xs text-muted-foreground">Mail Accounts</p>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Quick Actions */}
          <h3 className="text-lg font-semibold text-[#134E4A]">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "File Manager", icon: <FolderOpen className="h-5 w-5 text-amber-600" />, bg: "bg-amber-100", tab: "Files" as Tab },
              { label: "FTP Accounts", icon: <Upload className="h-5 w-5 text-teal-600" />, bg: "bg-teal-100", tab: "FTP" as Tab },
              { label: "DNS Records", icon: <Globe className="h-5 w-5 text-violet-600" />, bg: "bg-violet-100", tab: "DNS" as Tab },
              { label: "Mail Accounts", icon: <Mail className="h-5 w-5 text-rose-600" />, bg: "bg-rose-100", tab: "Mail" as Tab },
              { label: "Databases", icon: <Database className="h-5 w-5 text-blue-600" />, bg: "bg-blue-100", tab: "Databases" as Tab },
              { label: "SSL Certificate", icon: <ShieldCheck className="h-5 w-5 text-emerald-600" />, bg: "bg-emerald-100", tab: "SSL" as Tab },
              { label: "Settings", icon: <Settings className="h-5 w-5 text-slate-600" />, bg: "bg-slate-100", tab: "Settings" as Tab },
              { label: "Webmail", icon: <ExternalLink className="h-5 w-5 text-cyan-600" />, bg: "bg-cyan-100", tab: undefined },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => item.tab ? switchTab(item.tab) : window.open(`https://mail.${domain}`, "_blank")}
                className="flex items-center gap-3 rounded-xl border border-white/30 bg-white/40 px-4 py-3 text-left transition-all hover:bg-white/60 hover:shadow-md cursor-pointer"
              >
                <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", item.bg)}>
                  {item.icon}
                </div>
                <span className="text-sm font-medium text-[#134E4A]">{item.label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* ═══════════ FILES TAB ═══════════ */}
      {activeTab === "Files" && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#134E4A]">File Manager</h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="cursor-pointer" disabled={uploadLoading}
                onClick={() => { const input = document.createElement("input"); input.type = "file"; input.multiple = true;
                  input.onchange = () => { if (input.files && input.files.length > 0) handleUploadFiles(input.files); }; input.click(); }}>
                {uploadLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload
              </Button>
              <Button className="bg-teal-600 text-white hover:bg-teal-700 cursor-pointer" onClick={() => setMkdirOpen(true)}>
                <FolderPlus className="h-4 w-4" /> New Folder
              </Button>
            </div>
          </div>
          <GlassCard className="!py-3">
            <div className="flex items-center gap-1 text-sm overflow-x-auto">
              <button onClick={() => setCurrentPath(basePath)} className="flex items-center gap-1 text-teal-600 hover:text-teal-800 cursor-pointer shrink-0">
                <Home className="h-4 w-4" /> public_html
              </button>
              {breadcrumbs.slice(basePath.split("/").filter(Boolean).length).map((crumb, i, arr) => (
                <span key={crumb.path} className="flex items-center gap-1 shrink-0">
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  <button onClick={() => setCurrentPath(crumb.path)}
                    className={cn("hover:text-teal-600 cursor-pointer", i === arr.length - 1 ? "font-medium text-[#134E4A]" : "text-muted-foreground")}>
                    {crumb.name}
                  </button>
                </span>
              ))}
            </div>
          </GlassCard>
          {filesError && <GlassCard className="border-red-200 bg-red-50/70"><p className="text-sm text-red-600">{filesError}</p></GlassCard>}
          <GlassCard>
            {filesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
                <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
              </div>
            ) : (
              <div className="space-y-0.5">
                {currentPath !== basePath && (
                  <button onClick={navigateUp} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/50 cursor-pointer">
                    <ArrowUp className="h-5 w-5 text-muted-foreground" /> <span className="text-sm text-muted-foreground">..</span>
                  </button>
                )}
                {files.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">This folder is empty</div>}
                {files.sort((a, b) => { if (a.TYPE === "d" && b.TYPE !== "d") return -1; if (a.TYPE !== "d" && b.TYPE === "d") return 1; return a.name.localeCompare(b.name); }).map((file) => {
                  const isDir = file.TYPE === "d";
                  const canView = !isDir && isTextFile(file.name);
                  return (
                    <div key={file.name} className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/50">
                      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", isDir ? "bg-amber-50 text-amber-500" : "bg-slate-50 text-slate-400")}>
                        {isDir ? <Folder className="h-5 w-5" /> : <File className="h-5 w-5" />}
                      </div>
                      {isDir ? (
                        <button onClick={() => navigateToDir(file.name)} className="flex-1 text-left cursor-pointer min-w-0">
                          <p className="text-sm font-medium text-[#134E4A] hover:text-teal-600 transition-colors truncate">{file.name}</p>
                        </button>
                      ) : (
                        <div className="flex-1 min-w-0"><p className="text-sm font-medium text-[#134E4A] truncate">{file.name}</p></div>
                      )}
                      <div className="hidden sm:flex items-center text-xs text-muted-foreground shrink-0">
                        <span className="w-16 text-right font-mono">{file.PERMISSIONS || "\u2014"}</span>
                        <span className="w-16 text-right">{!isDir && file.SIZE ? formatSize(file.SIZE) : "\u2014"}</span>
                        <span className="w-24 text-right">{file.DATE || "\u2014"}</span>
                      </div>
                      <div className="flex items-center shrink-0 w-[88px] justify-end">
                        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                          {canView && <Button variant="ghost" size="sm" className="h-8 w-8 p-0 cursor-pointer" onClick={() => handleViewFile(file)} title="View"><Eye className="h-4 w-4 text-teal-500" /></Button>}
                          {!isDir && <Button variant="ghost" size="sm" className="h-8 w-8 p-0 cursor-pointer" onClick={() => handleDownload(file)} title="Download"><Download className="h-4 w-4 text-blue-500" /></Button>}
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 cursor-pointer" onClick={() => { setFileDeleteTarget(file); setFileDeleteOpen(true); }} title="Delete"><Trash2 className="h-4 w-4 text-red-400" /></Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>
        </>
      )}

      {/* ═══════════ FTP TAB ═══════════ */}
      {activeTab === "FTP" && (
        <>
          {/* Connection Info */}
          <GlassCard className="p-4">
            <h3 className="text-sm font-semibold text-[#134E4A] mb-3">FTP Connection Info</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Server", value: FTP_HOST, field: "ftp-server" },
                { label: "Port", value: "21", field: "ftp-port" },
                { label: "Protocol", value: "FTP / FTPS", field: "ftp-proto" },
                { label: "Base Path", value: `/home/${user}/web/${domain}`, field: "ftp-path" },
              ].map((item) => (
                <div key={item.field} className="rounded-lg border border-slate-200 bg-white/50 p-2.5">
                  <p className="text-[11px] text-muted-foreground mb-0.5">{item.label}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-mono text-[#134E4A] truncate">{item.value}</p>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 cursor-pointer shrink-0" onClick={() => handleCopy(item.value, item.field)}>
                      {copiedField === item.field ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Login format: <span className="font-mono text-teal-600">{user}_username</span></p>
          </GlassCard>

          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#134E4A]">FTP Accounts</h2>
            <Button className="bg-teal-600 text-white hover:bg-teal-700 cursor-pointer" onClick={() => setFtpCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Create FTP Account
            </Button>
          </div>
          {ftpError && <GlassCard className="border-red-200 bg-red-50/70"><p className="text-sm text-red-600">{ftpError}</p></GlassCard>}
          {ftpLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-teal-600" /><span className="ml-2 text-sm text-muted-foreground">Loading FTP accounts...</span></div>
          ) : ftpAccounts.length === 0 ? (
            <GlassCard><div className="flex flex-col items-center justify-center py-12 space-y-3"><Upload className="h-10 w-10 text-muted-foreground/40" /><p className="text-sm text-muted-foreground">No FTP accounts for this domain.</p></div></GlassCard>
          ) : (
            <div className="grid gap-4">
              {ftpAccounts.map((acc) => (
                <GlassCard key={`${acc.user}-${acc.ftpUser}`} className="p-5 transition-all hover:shadow-md">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center shrink-0"><Upload className="w-6 h-6 text-teal-600" /></div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-[#134E4A]">{acc.ftpUser}</h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><Server className="w-3.5 h-3.5" />{FTP_HOST}:21</span>
                          {acc.path && <span className="flex items-center gap-1"><FolderOpen className="w-3.5 h-3.5" />{acc.path}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button variant="ghost" size="sm" className="cursor-pointer h-8 px-2" title="Copy username" onClick={() => cpClip(acc.ftpUser)}><Copy className="h-4 w-4 text-slate-500" /></Button>
                      <Button variant="ghost" size="sm" className="cursor-pointer h-8 px-2" title="Change password" onClick={() => { setFtpPwTarget(acc); setFtpNewPw(""); setShowFtpPw(false); setFtpPwOpen(true); }}><Key className="h-4 w-4 text-amber-500" /></Button>
                      <Button variant="ghost" size="sm" className="cursor-pointer h-8 px-2" title="Delete" onClick={() => { setFtpDeleteTarget(acc); setFtpDeleteOpen(true); }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </>
      )}

      {/* ═══════════ DNS TAB ═══════════ */}
      {activeTab === "DNS" && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#134E4A]">DNS Records</h2>
            <Button className="bg-teal-600 text-white hover:bg-teal-700 cursor-pointer" onClick={openDnsAdd}>
              <Plus className="h-4 w-4" /> Add Record
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setDnsTypeFilter("ALL")}
              className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors ${dnsTypeFilter === "ALL" ? "bg-[#134E4A] text-white" : "bg-white/60 text-[#134E4A] hover:bg-white/80"}`}>
              All ({dnsRecords.length})
            </button>
            {Object.entries(dnsTypeCounts).sort(([a], [b]) => a.localeCompare(b)).map(([type, count]) => (
              <button key={type} onClick={() => setDnsTypeFilter(type)}
                className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors ${dnsTypeFilter === type ? "bg-[#134E4A] text-white" : `${TYPE_COLORS[type]?.split(" ")[0] || "bg-gray-100"} ${TYPE_COLORS[type]?.split(" ")[1] || "text-gray-700"} hover:opacity-80`}`}>
                {type} ({count})
              </button>
            ))}
            <div className="ml-auto">
              <Input placeholder="Search records..." value={dnsSearch} onChange={(e) => setDnsSearch(e.target.value)} className="h-8 w-48 text-sm" />
            </div>
          </div>
          {dnsError && <GlassCard className="border-red-200 bg-red-50/70"><p className="text-sm text-red-600">{dnsError}</p></GlassCard>}
          <GlassCard>
            {dnsLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-teal-600" /><span className="ml-2 text-sm text-muted-foreground">Loading records...</span></div>
            ) : filteredDns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3"><Globe className="h-10 w-10 text-muted-foreground/40" /><p className="text-sm text-muted-foreground">{dnsRecords.length === 0 ? "No records." : "No records match filter."}</p></div>
            ) : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead className="w-[80px]">Type</TableHead><TableHead>Name</TableHead><TableHead>Value</TableHead>
                  <TableHead className="w-[70px]">Priority</TableHead><TableHead className="w-[70px]">TTL</TableHead><TableHead className="w-[90px] text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filteredDns.map((rec) => (
                    <TableRow key={rec.id}>
                      <TableCell><Badge className={TYPE_COLORS[rec.TYPE] || "bg-gray-100 text-gray-700"}>{rec.TYPE}</Badge></TableCell>
                      <TableCell className="font-medium text-[#134E4A]">{rec.RECORD}</TableCell>
                      <TableCell className="font-mono text-xs max-w-[350px]"><span className="break-all">{rec.VALUE}</span></TableCell>
                      <TableCell className="text-muted-foreground">{rec.PRIORITY || "\u2014"}</TableCell>
                      <TableCell className="text-muted-foreground">{rec.TTL || "\u2014"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 cursor-pointer" onClick={() => openDnsEdit(rec)} title="Edit"><Pencil className="h-3.5 w-3.5 text-teal-600" /></Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 cursor-pointer" onClick={() => { setDnsDeleteTarget(rec); setDnsDeleteOpen(true); }} title="Delete"><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
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

      {/* ═══════════ MAIL TAB ═══════════ */}
      {activeTab === "Mail" && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#134E4A]">Mail Accounts</h2>
            <Button className="bg-teal-600 text-white hover:bg-teal-700 cursor-pointer" onClick={() => setMailCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Add Account
            </Button>
          </div>
          {mailError && <GlassCard className="border-red-200 bg-red-50/70"><p className="text-sm text-red-600">{mailError}</p></GlassCard>}
          <GlassCard>
            {mailLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-teal-600" /><span className="ml-2 text-sm text-muted-foreground">Loading accounts...</span></div>
            ) : mailAccounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3"><Mail className="h-10 w-10 text-muted-foreground/40" /><p className="text-sm text-muted-foreground">No mail accounts yet.</p></div>
            ) : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Email</TableHead><TableHead>Quota</TableHead><TableHead>Used</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {mailAccounts.map((a) => {
                    const isSusp = a.SUSPENDED !== "no" && a.SUSPENDED !== "";
                    return (
                      <TableRow key={`${a.account}@${a.domain}`}>
                        <TableCell className="font-medium text-[#134E4A]">
                          <button onClick={() => openMailSheet(a)} className="text-left hover:text-teal-600 transition-colors cursor-pointer">
                            {a.account}@{a.domain}
                          </button>
                          {a.FWD && <p className="text-xs text-muted-foreground mt-0.5"><Forward className="inline h-3 w-3 mr-0.5" />{a.FWD}</p>}
                        </TableCell>
                        <TableCell><span className="text-sm">{a.QUOTA === "unlimited" ? "Unlimited" : `${a.QUOTA} MB`}</span></TableCell>
                        <TableCell><span className="text-sm">{a.U_DISK || "0"} MB</span></TableCell>
                        <TableCell>
                          {isSusp ? <Badge className="bg-red-100 text-red-700 border-red-200">Suspended</Badge> : <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Active</Badge>}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 cursor-pointer" onClick={() => openMailSheet(a)}><Settings className="h-4 w-4 text-teal-600" /></Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 cursor-pointer" onClick={() => { setMailPwTarget(a); setMailNewPw(""); setMailPwOpen(true); }}><KeyRound className="h-4 w-4 text-amber-600" /></Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 cursor-pointer" onClick={() => handleMailSuspendToggle(a)}>
                              {isSusp ? <UserCheck className="h-4 w-4 text-emerald-600" /> : <UserX className="h-4 w-4 text-orange-500" />}
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 cursor-pointer" onClick={() => { setMailDeleteTarget(a); setMailDeleteOpen(true); }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </GlassCard>
        </>
      )}

      {/* ═══════════ DATABASES TAB ═══════════ */}
      {activeTab === "Databases" && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#134E4A]">Databases</h2>
            <Button className="bg-teal-600 text-white hover:bg-teal-700 cursor-pointer" onClick={() => setDbCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Create Database
            </Button>
          </div>
          {dbError && <GlassCard className="border-red-200 bg-red-50/70"><p className="text-sm text-red-600">{dbError}</p></GlassCard>}
          {dbLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-teal-600" /><span className="ml-2 text-sm text-muted-foreground">Loading databases...</span></div>
          ) : databases.length === 0 ? (
            <GlassCard><div className="flex flex-col items-center justify-center py-12 space-y-3"><Database className="h-10 w-10 text-muted-foreground/40" /><p className="text-sm text-muted-foreground">No databases for this user.</p></div></GlassCard>
          ) : (
            <div className="grid gap-4">
              {databases.map((db) => {
                const key = `${db.user}-${db.name}`;
                const isMySQL = db.TYPE.toLowerCase() === "mysql";
                const isSusp = db.SUSPENDED === "yes";
                const isActLoading = dbActionLoading[key];
                return (
                  <GlassCard key={key} className={`p-5 transition-all hover:shadow-md ${isSusp ? "opacity-60 border-red-200" : ""}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isMySQL ? "bg-blue-100" : "bg-violet-100"}`}>
                          <Database className={`w-6 h-6 ${isMySQL ? "text-blue-600" : "text-violet-600"}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-[#134E4A] truncate">{db.name}</h3>
                            <Badge className={isMySQL ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-violet-100 text-violet-700 border-violet-200"}>
                              {isMySQL ? "MySQL" : "PostgreSQL"}
                            </Badge>
                            {isSusp && <Badge className="bg-red-100 text-red-700 border-red-200"><Ban className="w-3 h-3 mr-1" />Suspended</Badge>}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1"><Key className="w-3.5 h-3.5" />{db.DBUSER}</span>
                            <span className="flex items-center gap-1"><HardDrive className="w-3.5 h-3.5" />{db.U_DISK} MB</span>
                            <span>{db.CHARSET}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button variant="ghost" size="sm" className="cursor-pointer h-8 px-2" title="Copy name" onClick={() => cpClip(db.name)}><Copy className="h-4 w-4 text-slate-500" /></Button>
                        <Button variant="ghost" size="sm" className="cursor-pointer h-8 px-2" title="Change password" onClick={() => { setDbPwTarget(db); setDbNewPw(""); setShowDbNewPw(false); setDbPwOpen(true); }}><Key className="h-4 w-4 text-amber-500" /></Button>
                        <Button variant="ghost" size="sm" className="cursor-pointer h-8 px-2" title={isSusp ? "Unsuspend" : "Suspend"} disabled={isActLoading} onClick={() => handleDbToggleSuspend(db)}>
                          {isActLoading ? <Loader2 className="h-4 w-4 animate-spin text-slate-500" /> : isSusp ? <PlayCircle className="h-4 w-4 text-green-500" /> : <Ban className="h-4 w-4 text-orange-500" />}
                        </Button>
                        <Button variant="ghost" size="sm" className="cursor-pointer h-8 px-2" title="Delete" onClick={() => { setDbDeleteTarget(db); setDbDeleteOpen(true); }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ═══════════ SSL TAB ═══════════ */}
      {activeTab === "SSL" && (
        <>
          <h2 className="text-lg font-semibold text-[#134E4A]">SSL Certificate</h2>
          {/* Status / Error / Success messages */}
          {sslError && (
            <GlassCard className="p-4 border-red-200 bg-red-50/70">
              <div className="flex items-start gap-2">
                <ShieldOff className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-700">SSL Error</p>
                  <p className="text-xs text-red-600 mt-1 break-all">{sslError}</p>
                </div>
                <button onClick={() => setSslError(null)} className="ml-auto text-red-400 hover:text-red-600 cursor-pointer">&times;</button>
              </div>
            </GlassCard>
          )}
          {sslSuccess && (
            <GlassCard className="p-4 border-emerald-200 bg-emerald-50/70">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                <p className="text-sm text-emerald-700">{sslSuccess}</p>
                <button onClick={() => setSslSuccess(null)} className="ml-auto text-emerald-400 hover:text-emerald-600 cursor-pointer">&times;</button>
              </div>
            </GlassCard>
          )}
          <GlassCard className="p-5">
            <div className="flex items-center gap-3 mb-4">
              {hasSSL ? (
                <><div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center"><ShieldCheck className="w-6 h-6 text-emerald-600" /></div>
                <div><p className="font-semibold text-[#134E4A]">SSL Active</p><p className="text-xs text-muted-foreground">Your site is secured with HTTPS</p></div></>
              ) : (
                <><div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center"><ShieldOff className="w-6 h-6 text-red-600" /></div>
                <div><p className="font-semibold text-[#134E4A]">No SSL Certificate</p><p className="text-xs text-muted-foreground">Your site is not secured</p></div></>
              )}
            </div>
            {hasSSL && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                <InfoItem label="Issuer" value={domainInfo.SSL_ISSUER || "N/A"} />
                <InfoItem label="Expires" value={domainInfo.SSL_EXPIRE || "N/A"} />
                <InfoItem label="Type" value={domainInfo.LETSENCRYPT === "yes" ? "Let's Encrypt" : "Custom"} />
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {!hasSSL ? (
                <Button className="bg-teal-600 text-white hover:bg-teal-700 cursor-pointer" disabled={sslRequesting} onClick={handleRequestSsl}>
                  {sslRequesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  Request Let&apos;s Encrypt
                </Button>
              ) : (
                <>
                  <Button className="bg-teal-600 text-white hover:bg-teal-700 cursor-pointer" disabled={sslRequesting} onClick={handleRequestSsl}>
                    {sslRequesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Renew SSL
                  </Button>
                  <Button variant="outline" className="cursor-pointer" disabled={mailSslRequesting} onClick={handleRequestMailSsl}>
                    {mailSslRequesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                    Enable Mail SSL
                  </Button>
                  <Button variant="outline" className="cursor-pointer text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700" disabled={sslRevoking} onClick={handleRevokeSsl}>
                    {sslRevoking ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
                    Revoke Certificate
                  </Button>
                </>
              )}
            </div>
          </GlassCard>
        </>
      )}

      {/* ═══════════ SETTINGS TAB ═══════════ */}
      {activeTab === "Settings" && (
        <div className="space-y-6">
          {/* Templates */}
          <GlassCard className="p-5">
            <h3 className="text-sm font-semibold text-[#134E4A] mb-4">Templates</h3>
            {!templates ? (
              <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading templates...</div>
            ) : (
              <div className="space-y-4">
                <TemplateSelect label="PHP / Backend" current={domainInfo.BACKEND} options={templates.backend} loading={actionLoading === "change-backend"}
                  onApply={(tpl) => domainAction("change-backend", { template: tpl })} />
                <TemplateSelect label="Web Template" current={domainInfo.TPL} options={templates.web} loading={actionLoading === "change-web-tpl"}
                  onApply={(tpl) => domainAction("change-web-tpl", { template: tpl })} />
                <TemplateSelect label="Proxy Template" current={domainInfo.PROXY} options={templates.proxy} loading={actionLoading === "change-proxy-tpl"}
                  onApply={(tpl) => domainAction("change-proxy-tpl", { template: tpl })} />
              </div>
            )}
          </GlassCard>

          {/* Aliases */}
          <GlassCard className="p-5">
            <h3 className="text-sm font-semibold text-[#134E4A] mb-3">Aliases</h3>
            {aliases.length > 0 ? (
              <div className="space-y-2 mb-3">
                {aliases.map((alias) => (
                  <div key={alias} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white/50 px-3 py-2">
                    <div className="flex items-center gap-2"><Link className="h-4 w-4 text-teal-500" /><span className="text-sm font-medium text-[#134E4A]">{alias}</span></div>
                    <Button size="sm" variant="ghost" className="text-red-500 cursor-pointer h-7 w-7 p-0" disabled={actionLoading === `delete-alias-${alias}`}
                      onClick={async () => { setActionLoading(`delete-alias-${alias}`); await domainAction("delete-alias", { alias }); setActionLoading(null); }}>
                      {actionLoading === `delete-alias-${alias}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unlink className="h-3 w-3" />}
                    </Button>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground mb-3">No aliases configured.</p>}
            <div className="flex gap-2">
              <Input placeholder="www.example.com" value={newAlias} onChange={(e) => setNewAlias(e.target.value)} className="flex-1" />
              <Button className="bg-teal-600 text-white hover:bg-teal-700 cursor-pointer" disabled={!newAlias || actionLoading === "add-alias"}
                onClick={async () => { const ok = await domainAction("add-alias", { alias: newAlias }); if (ok) setNewAlias(""); }}>
                {actionLoading === "add-alias" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add Alias
              </Button>
            </div>
          </GlassCard>

          {/* Redirects */}
          <GlassCard className="p-5">
            <h3 className="text-sm font-semibold text-[#134E4A] mb-3">Redirects</h3>
            {domainInfo.REDIRECT && domainInfo.REDIRECT !== "" ? (
              <div className="rounded-lg border border-slate-200 bg-white/50 p-3 mb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#134E4A]"><ArrowUpRight className="inline h-4 w-4 mr-1" />{domainInfo.REDIRECT}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">HTTP {domainInfo.REDIRECT_CODE || "301"}</p>
                  </div>
                  <Button size="sm" variant="ghost" className="text-red-500 cursor-pointer" disabled={actionLoading === "delete-redirect"}
                    onClick={() => domainAction("delete-redirect", { redirectId: "1" })}>
                    {actionLoading === "delete-redirect" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            ) : <p className="text-sm text-muted-foreground mb-3">No redirects configured.</p>}
            <div className="rounded-lg border border-dashed border-slate-300 p-3 space-y-3">
              <p className="text-sm font-medium text-[#134E4A]">Add Redirect</p>
              <Input placeholder="https://target-url.com" value={newRedirectUrl} onChange={(e) => setNewRedirectUrl(e.target.value)} />
              <div className="flex gap-2">
                <Select value={newRedirectCode} onValueChange={(v) => v && setNewRedirectCode(v)}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="301">301 (Permanent)</SelectItem>
                    <SelectItem value="302">302 (Temporary)</SelectItem>
                  </SelectContent>
                </Select>
                <Button className="bg-teal-600 text-white hover:bg-teal-700 cursor-pointer flex-1" disabled={!newRedirectUrl || actionLoading === "add-redirect"}
                  onClick={async () => { const ok = await domainAction("add-redirect", { url: newRedirectUrl, code: newRedirectCode }); if (ok) setNewRedirectUrl(""); }}>
                  {actionLoading === "add-redirect" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add
                </Button>
              </div>
            </div>
          </GlassCard>

          {/* HTTP Auth */}
          <GlassCard className="p-5">
            <h3 className="text-sm font-semibold text-[#134E4A] mb-3"><Lock className="inline h-4 w-4 mr-1" />HTTP Basic Auth</h3>
            {httpAuthUsers.length > 0 ? (
              <div className="space-y-2 mb-3">
                {httpAuthUsers.map((u: any) => (
                  <div key={u.authUser} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white/50 px-3 py-2">
                    <span className="text-sm font-medium text-[#134E4A]">{u.authUser}</span>
                    <Button size="sm" variant="ghost" className="text-red-500 cursor-pointer h-7 w-7 p-0" disabled={actionLoading === `delete-httpauth-${u.authUser}`}
                      onClick={async () => { setActionLoading(`delete-httpauth-${u.authUser}`); await domainAction("delete-httpauth", { authUser: u.authUser }); setActionLoading(null); }}>
                      {actionLoading === `delete-httpauth-${u.authUser}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    </Button>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-muted-foreground mb-3">No HTTP auth users configured.</p>}
            <div className="rounded-lg border border-dashed border-slate-300 p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Username" value={newAuthUser} onChange={(e) => setNewAuthUser(e.target.value)} />
                <Input placeholder="Password" type="password" value={newAuthPass} onChange={(e) => setNewAuthPass(e.target.value)} />
              </div>
              <Button size="sm" className="bg-teal-600 text-white hover:bg-teal-700 cursor-pointer w-full" disabled={!newAuthUser || !newAuthPass || actionLoading === "add-httpauth"}
                onClick={async () => { const ok = await domainAction("add-httpauth", { authUser: newAuthUser, password: newAuthPass }); if (ok) { setNewAuthUser(""); setNewAuthPass(""); } }}>
                {actionLoading === "add-httpauth" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add Auth User
              </Button>
            </div>
          </GlassCard>

          {/* Danger Zone */}
          <GlassCard className="p-5 border-red-200">
            <h3 className="text-sm font-semibold text-red-600 mb-3">Danger Zone</h3>
            <div className="flex flex-wrap gap-2">
              {isSuspended ? (
                <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer" disabled={actionLoading === "unsuspend"}
                  onClick={() => domainAction("unsuspend")}>
                  {actionLoading === "unsuspend" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />} Unsuspend Domain
                </Button>
              ) : (
                <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 cursor-pointer" disabled={actionLoading === "suspend"}
                  onClick={() => { if (confirm(`Suspend ${domain}?`)) domainAction("suspend"); }}>
                  {actionLoading === "suspend" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />} Suspend Domain
                </Button>
              )}
              <Button size="sm" variant="destructive" className="cursor-pointer" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 className="h-4 w-4" /> Delete Domain
              </Button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ═══════════ DIALOGS ═══════════ */}
      {/* ═══════════════════════════════════════════════════════════════════ */}

      {/* ── File Viewer ── */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Eye className="h-4 w-4" />{viewerFile}</DialogTitle>
          </DialogHeader>
          {viewerLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-teal-600" /></div>
          ) : (
            <pre className="overflow-auto max-h-[60vh] text-sm font-mono bg-slate-50 rounded-lg p-4 whitespace-pre-wrap break-words">{viewerContent}</pre>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Mkdir ── */}
      <Dialog open={mkdirOpen} onOpenChange={setMkdirOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>Enter the name for the new folder.</DialogDescription>
          </DialogHeader>
          <Input placeholder="Folder name" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()} />
          <DialogFooter>
            <DialogClose render={<Button variant="outline" className="cursor-pointer" />}>Cancel</DialogClose>
            <Button className="bg-teal-600 text-white hover:bg-teal-700 cursor-pointer" disabled={mkdirLoading || !newFolderName.trim()} onClick={handleCreateFolder}>
              {mkdirLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderPlus className="h-4 w-4" />} Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── File Delete ── */}
      <Dialog open={fileDeleteOpen} onOpenChange={setFileDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {fileDeleteTarget?.TYPE === "d" ? "Folder" : "File"}</DialogTitle>
            <DialogDescription>Are you sure you want to delete <strong>{fileDeleteTarget?.name}</strong>?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" className="cursor-pointer" />}>Cancel</DialogClose>
            <Button variant="destructive" className="cursor-pointer" disabled={fileDeleteLoading} onClick={handleFileDelete}>
              {fileDeleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── FTP Create ── */}
      <Dialog open={ftpCreateOpen} onOpenChange={setFtpCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create FTP Account</DialogTitle>
            <DialogDescription>Create a new FTP account for {domain}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>FTP Username</Label>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-sm text-muted-foreground">{user}_</span>
                <Input placeholder="username" value={ftpCreateForm.ftp_user} onChange={(e) => setFtpCreateForm((f) => ({ ...f, ftp_user: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Password</Label>
              <div className="flex gap-2 mt-1">
                <div className="relative flex-1">
                  <Input type={showFtpCreatePw ? "text" : "password"} value={ftpCreateForm.password} onChange={(e) => setFtpCreateForm((f) => ({ ...f, password: e.target.value }))} />
                  <Button variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 cursor-pointer" onClick={() => setShowFtpCreatePw(!showFtpCreatePw)}>
                    {showFtpCreatePw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => setFtpCreateForm((f) => ({ ...f, password: generatePassword() }))}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" className="cursor-pointer" />}>Cancel</DialogClose>
            <Button className="bg-teal-600 text-white hover:bg-teal-700 cursor-pointer" disabled={ftpCreateLoading} onClick={handleFtpCreate}>
              {ftpCreateLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── FTP Change Password ── */}
      <Dialog open={ftpPwOpen} onOpenChange={setFtpPwOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change FTP Password</DialogTitle>
            <DialogDescription>Change password for {ftpPwTarget?.ftpUser}</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input type={showFtpPw ? "text" : "password"} value={ftpNewPw} onChange={(e) => setFtpNewPw(e.target.value)} placeholder="New password" />
              <Button variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 cursor-pointer" onClick={() => setShowFtpPw(!showFtpPw)}>
                {showFtpPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => setFtpNewPw(generatePassword())}><RefreshCw className="h-4 w-4" /></Button>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" className="cursor-pointer" />}>Cancel</DialogClose>
            <Button className="bg-teal-600 text-white hover:bg-teal-700 cursor-pointer" disabled={ftpPwLoading || !ftpNewPw} onClick={handleFtpChangePw}>
              {ftpPwLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />} Change Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── FTP Delete ── */}
      <Dialog open={ftpDeleteOpen} onOpenChange={setFtpDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete FTP Account</DialogTitle>
            <DialogDescription>Delete <strong>{ftpDeleteTarget?.ftpUser}</strong>? This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" className="cursor-pointer" />}>Cancel</DialogClose>
            <Button variant="destructive" className="cursor-pointer" disabled={ftpDeleteLoading} onClick={handleFtpDelete}>
              {ftpDeleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DNS Form (Add/Edit) ── */}
      <Dialog open={dnsFormOpen} onOpenChange={setDnsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dnsFormMode === "add" ? "Add DNS Record" : "Edit DNS Record"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Record Name</Label>
              <Input className="mt-1" placeholder={domain} value={dnsForm.record} onChange={(e) => setDnsForm((f) => ({ ...f, record: e.target.value }))} />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={dnsForm.type} onValueChange={(v) => v && setDnsForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{DNS_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Value</Label>
              <Input className="mt-1" placeholder="IP address or hostname" value={dnsForm.value} onChange={(e) => setDnsForm((f) => ({ ...f, value: e.target.value }))} />
            </div>
            {dnsShowPriority && (
              <div>
                <Label>Priority</Label>
                <Input className="mt-1" type="number" placeholder="10" value={dnsForm.priority} onChange={(e) => setDnsForm((f) => ({ ...f, priority: e.target.value }))} />
              </div>
            )}
            <div>
              <Label>TTL</Label>
              <Input className="mt-1" type="number" placeholder="14400" value={dnsForm.ttl} onChange={(e) => setDnsForm((f) => ({ ...f, ttl: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" className="cursor-pointer" />}>Cancel</DialogClose>
            <Button className="bg-teal-600 text-white hover:bg-teal-700 cursor-pointer" disabled={dnsFormLoading} onClick={handleDnsSubmit}>
              {dnsFormLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : dnsFormMode === "add" ? <Plus className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
              {dnsFormMode === "add" ? " Add Record" : " Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DNS Delete ── */}
      <Dialog open={dnsDeleteOpen} onOpenChange={setDnsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete DNS Record</DialogTitle>
            <DialogDescription>Delete <strong>{dnsDeleteTarget?.TYPE} {dnsDeleteTarget?.RECORD}</strong>?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" className="cursor-pointer" />}>Cancel</DialogClose>
            <Button variant="destructive" className="cursor-pointer" disabled={dnsDeleteLoading} onClick={handleDnsDelete}>
              {dnsDeleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Mail Create ── */}
      <Dialog open={mailCreateOpen} onOpenChange={setMailCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Mail Account</DialogTitle>
            <DialogDescription>Create a new email account for {domain}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Email Address</Label>
              <div className="flex items-center gap-1 mt-1">
                <Input placeholder="username" value={mailCreateForm.account} onChange={(e) => setMailCreateForm((f) => ({ ...f, account: e.target.value }))} />
                <span className="text-sm text-muted-foreground shrink-0">@{domain}</span>
              </div>
            </div>
            <div>
              <Label>Password</Label>
              <div className="flex gap-2 mt-1">
                <Input type="text" value={mailCreateForm.password} onChange={(e) => setMailCreateForm((f) => ({ ...f, password: e.target.value }))} />
                <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => setMailCreateForm((f) => ({ ...f, password: generatePassword() }))}><RefreshCw className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" className="cursor-pointer" />}>Cancel</DialogClose>
            <Button className="bg-teal-600 text-white hover:bg-teal-700 cursor-pointer" disabled={mailCreateLoading} onClick={handleMailCreate}>
              {mailCreateLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Mail Password ── */}
      <Dialog open={mailPwOpen} onOpenChange={setMailPwOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Mail Password</DialogTitle>
            <DialogDescription>Change password for {mailPwTarget?.account}@{mailPwTarget?.domain}</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input type="text" value={mailNewPw} onChange={(e) => setMailNewPw(e.target.value)} placeholder="New password" />
            <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => setMailNewPw(generatePassword())}><RefreshCw className="h-4 w-4" /></Button>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" className="cursor-pointer" />}>Cancel</DialogClose>
            <Button className="bg-teal-600 text-white hover:bg-teal-700 cursor-pointer" disabled={mailPwLoading || !mailNewPw} onClick={handleMailPwChange}>
              {mailPwLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />} Change Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Mail Delete ── */}
      <Dialog open={mailDeleteOpen} onOpenChange={setMailDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Mail Account</DialogTitle>
            <DialogDescription>Delete <strong>{mailDeleteTarget?.account}@{mailDeleteTarget?.domain}</strong>? This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" className="cursor-pointer" />}>Cancel</DialogClose>
            <Button variant="destructive" className="cursor-pointer" disabled={mailDeleteLoading} onClick={handleMailDelete}>
              {mailDeleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Mail Account Sheet ── */}
      <Sheet open={mailSheetOpen} onOpenChange={setMailSheetOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2"><Mail className="h-5 w-5 text-teal-600" />{mailSheetAccount?.account}@{mailSheetAccount?.domain}</SheetTitle>
            <SheetDescription>Manage account settings</SheetDescription>
          </SheetHeader>
          {mailSheetAccount && (
            <div className="space-y-4 mt-4">
              {/* Sheet Tabs */}
              <div className="flex gap-1.5 flex-wrap">
                {(["info", "forwarding", "autoreply", "connection"] as const).map((t) => (
                  <button key={t} onClick={() => { setMailSheetTab(t); if (t === "autoreply") fetchAutoreply(mailSheetAccount); }}
                    className={cn("px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer capitalize",
                      mailSheetTab === t ? "bg-teal-600 text-white" : "bg-white/60 text-gray-600 hover:bg-white/80 border border-gray-200")}>
                    {t}
                  </button>
                ))}
              </div>

              {/* Info Tab */}
              {mailSheetTab === "info" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <InfoItem label="Account" value={`${mailSheetAccount.account}@${mailSheetAccount.domain}`} />
                    <InfoItem label="Quota" value={mailSheetAccount.QUOTA === "unlimited" ? "Unlimited" : `${mailSheetAccount.QUOTA} MB`} />
                    <InfoItem label="Disk Used" value={`${mailSheetAccount.U_DISK || "0"} MB`} />
                    <InfoItem label="Status" value={mailSheetAccount.SUSPENDED !== "no" && mailSheetAccount.SUSPENDED !== "" ? "Suspended" : "Active"} />
                  </div>
                  {mailSheetAccount.FWD && (
                    <div className="rounded-lg border border-slate-200 bg-white/50 p-3">
                      <p className="text-xs text-muted-foreground mb-1">Forwarding</p>
                      <p className="text-sm font-mono text-[#134E4A]">{mailSheetAccount.FWD}</p>
                    </div>
                  )}
                  {mailSheetAccount.AUTOREPLY === "yes" && (
                    <Badge className="bg-violet-100 text-violet-700 border-violet-200"><MessageSquareReply className="h-3 w-3 mr-1" />Autoreply enabled</Badge>
                  )}
                </div>
              )}

              {/* Forwarding Tab */}
              {mailSheetTab === "forwarding" && (
                <div className="space-y-3">
                  {mailSheetAccount.FWD ? (
                    <div className="space-y-2">
                      {mailSheetAccount.FWD.split(",").map((fwd) => fwd.trim()).filter(Boolean).map((fwd) => (
                        <div key={fwd} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white/50 px-3 py-2">
                          <div className="flex items-center gap-2"><Forward className="h-4 w-4 text-teal-500" /><span className="text-sm text-[#134E4A]">{fwd}</span></div>
                          <Button size="sm" variant="ghost" className="text-red-500 cursor-pointer h-7 w-7 p-0" disabled={fwdLoading} onClick={() => handleDeleteFwd(fwd)}>
                            {fwdLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-sm text-muted-foreground">No forwarding configured.</p>}
                  <div className="flex gap-2">
                    <Input placeholder="forward@example.com" value={newFwdEmail} onChange={(e) => setNewFwdEmail(e.target.value)} className="flex-1" />
                    <Button size="sm" className="bg-teal-600 text-white hover:bg-teal-700 cursor-pointer" disabled={fwdLoading || !newFwdEmail} onClick={handleAddFwd}>
                      {fwdLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add
                    </Button>
                  </div>
                </div>
              )}

              {/* Autoreply Tab */}
              {mailSheetTab === "autoreply" && (
                <div className="space-y-3">
                  {arLoading && !arFetched ? (
                    <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-teal-600" /></div>
                  ) : (
                    <>
                      <textarea
                        className="w-full min-h-[120px] rounded-lg border border-slate-200 bg-white/50 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="Enter autoreply message..."
                        value={arMsg}
                        onChange={(e) => setArMsg(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-teal-600 text-white hover:bg-teal-700 cursor-pointer" disabled={arLoading || !arMsg.trim()} onClick={handleSaveAutoreply}>
                          {arLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save Autoreply
                        </Button>
                        {mailSheetAccount.AUTOREPLY === "yes" && (
                          <Button size="sm" variant="outline" className="text-red-500 cursor-pointer" disabled={arLoading} onClick={handleDeleteAutoreply}>
                            <Trash2 className="h-4 w-4" /> Remove
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Connection Tab */}
              {mailSheetTab === "connection" && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-[#134E4A]">Incoming Mail (IMAP)</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <InfoItem label="Server" value={`mail.${domain}`} />
                    <InfoItem label="Port" value="993 (SSL)" />
                    <InfoItem label="Username" value={`${mailSheetAccount.account}@${domain}`} />
                    <InfoItem label="Security" value="SSL/TLS" />
                  </div>
                  <h4 className="text-sm font-semibold text-[#134E4A] pt-2">Outgoing Mail (SMTP)</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <InfoItem label="Server" value={`mail.${domain}`} />
                    <InfoItem label="Port" value="465 (SSL)" />
                    <InfoItem label="Username" value={`${mailSheetAccount.account}@${domain}`} />
                    <InfoItem label="Security" value="SSL/TLS" />
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── DB Create ── */}
      <Dialog open={dbCreateOpen} onOpenChange={setDbCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Database</DialogTitle>
            <DialogDescription>Create a new database for user {user}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Database Name</Label>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-sm text-muted-foreground">{user}_</span>
                <Input placeholder="mydb" value={dbCreateForm.db_name} onChange={(e) => setDbCreateForm((f) => ({ ...f, db_name: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Database User</Label>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-sm text-muted-foreground">{user}_</span>
                <Input placeholder="dbuser" value={dbCreateForm.db_user} onChange={(e) => setDbCreateForm((f) => ({ ...f, db_user: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Password</Label>
              <div className="flex gap-2 mt-1">
                <div className="relative flex-1">
                  <Input type={showDbPw ? "text" : "password"} value={dbCreateForm.db_password} onChange={(e) => setDbCreateForm((f) => ({ ...f, db_password: e.target.value }))} />
                  <Button variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 cursor-pointer" onClick={() => setShowDbPw(!showDbPw)}>
                    {showDbPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => setDbCreateForm((f) => ({ ...f, db_password: generatePassword() }))}><RefreshCw className="h-4 w-4" /></Button>
              </div>
            </div>
            <div>
              <Label>Type</Label>
              <Select value={dbCreateForm.type} onValueChange={(v) => v && setDbCreateForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mysql">MySQL</SelectItem>
                  <SelectItem value="pgsql">PostgreSQL</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" className="cursor-pointer" />}>Cancel</DialogClose>
            <Button className="bg-teal-600 text-white hover:bg-teal-700 cursor-pointer" disabled={dbCreateLoading} onClick={handleDbCreate}>
              {dbCreateLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create Database
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DB Change Password ── */}
      <Dialog open={dbPwOpen} onOpenChange={setDbPwOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Database Password</DialogTitle>
            <DialogDescription>Change password for {dbPwTarget?.name}</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input type={showDbNewPw ? "text" : "password"} value={dbNewPw} onChange={(e) => setDbNewPw(e.target.value)} placeholder="New password" />
              <Button variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 cursor-pointer" onClick={() => setShowDbNewPw(!showDbNewPw)}>
                {showDbNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => setDbNewPw(generatePassword())}><RefreshCw className="h-4 w-4" /></Button>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" className="cursor-pointer" />}>Cancel</DialogClose>
            <Button className="bg-teal-600 text-white hover:bg-teal-700 cursor-pointer" disabled={dbPwLoading || !dbNewPw} onClick={handleDbChangePw}>
              {dbPwLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />} Change Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DB Delete ── */}
      <Dialog open={dbDeleteOpen} onOpenChange={setDbDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Database</DialogTitle>
            <DialogDescription>Delete <strong>{dbDeleteTarget?.name}</strong>? This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" className="cursor-pointer" />}>Cancel</DialogClose>
            <Button variant="destructive" className="cursor-pointer" disabled={dbDeleteLoading} onClick={handleDbDelete}>
              {dbDeleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Domain ── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Domain</DialogTitle>
            <DialogDescription>Are you sure you want to delete <strong>{domain}</strong>? This will permanently remove all associated data including websites, email accounts, and databases. This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" className="cursor-pointer" />}>Cancel</DialogClose>
            <Button variant="destructive" className="cursor-pointer" disabled={deleteDomainLoading} onClick={handleDeleteDomain}>
              {deleteDomainLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete Domain
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

/* ═══════════════════════ Helper Components ═══════════════════════ */

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white/50 p-2.5">
      <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-medium text-[#134E4A] truncate">{value}</p>
    </div>
  );
}

function TemplateSelect({ label, current, options, loading, onApply }: {
  label: string; current: string; options: string[]; loading: boolean;
  onApply: (tpl: string) => void;
}) {
  const [selected, setSelected] = useState(current);
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <span className="text-sm font-medium text-[#134E4A] w-36 shrink-0">{label}</span>
      <Select value={selected} onValueChange={(v) => v && setSelected(v)}>
        <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
        <SelectContent>{options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
      </Select>
      <Button size="sm" className="bg-teal-600 text-white hover:bg-teal-700 cursor-pointer shrink-0" disabled={loading || selected === current}
        onClick={() => onApply(selected)}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Apply
      </Button>
    </div>
  );
}