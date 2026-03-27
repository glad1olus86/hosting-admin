"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Folder,
  File,
  ChevronRight,
  ArrowUp,
  Trash2,
  Loader2,
  FolderPlus,
  Eye,
  Home,
  User,
  Upload,
  Download,
} from "lucide-react";
import { GlassCard } from "@/components/layout/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { cn } from "@/lib/utils";

interface FileEntry {
  name: string;
  TYPE?: string;
  SIZE?: string;
  DATE?: string;
  TIME?: string;
  OWNER?: string;
  PERMISSIONS?: string;
}

interface HestiaUser {
  username: string;
}

export default function FilesPage() {
  const [users, setUsers] = useState<HestiaUser[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [currentPath, setCurrentPath] = useState("");
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerContent, setViewerContent] = useState("");
  const [viewerFile, setViewerFile] = useState("");
  const [viewerLoading, setViewerLoading] = useState(false);

  const [mkdirOpen, setMkdirOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [mkdirLoading, setMkdirLoading] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FileEntry | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [uploadLoading, setUploadLoading] = useState(false);

  const basePath = selectedUser ? `/home/${selectedUser}/web` : "";

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (Array.isArray(data)) setUsers(data);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  const fetchFiles = useCallback(async () => {
    if (!selectedUser || !currentPath || !currentPath.startsWith("/home/")) return;
    try {
      setError(null);
      setLoading(true);
      const res = await fetch(
        `/api/files?user=${encodeURIComponent(selectedUser)}&path=${encodeURIComponent(currentPath)}`
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.type === "files" && Array.isArray(data.data)) {
        setFiles(data.data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load files");
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [selectedUser, currentPath]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  useEffect(() => {
    if (selectedUser) {
      const newBase = `/home/${selectedUser}/web`;
      setCurrentPath(newBase);
    }
  }, [selectedUser]);

  useEffect(() => {
    if (selectedUser && currentPath && currentPath.includes("/web")) {
      fetchFiles();
    }
  }, [selectedUser, currentPath, fetchFiles]);

  const navigateTo = (name: string) => {
    setCurrentPath(currentPath === "/" ? `/${name}` : `${currentPath}/${name}`);
  };

  const navigateUp = () => {
    if (!basePath || currentPath === basePath) return;
    const parts = currentPath.split("/").filter(Boolean);
    parts.pop();
    const newPath = "/" + parts.join("/");
    setCurrentPath(newPath.length >= basePath.length ? newPath : basePath);
  };

  const breadcrumbs = currentPath.split("/").filter(Boolean).map((part, i, arr) => ({
    name: part,
    path: "/" + arr.slice(0, i + 1).join("/"),
  }));

  const handleViewFile = async (file: FileEntry) => {
    const filePath = `${currentPath}/${file.name}`;
    setViewerFile(file.name);
    setViewerOpen(true);
    setViewerLoading(true);
    try {
      const res = await fetch(
        `/api/files/content?user=${encodeURIComponent(selectedUser)}&path=${encodeURIComponent(filePath)}`
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setViewerContent(data.content || "");
    } catch (err: any) {
      setViewerContent(`Error: ${err.message}`);
    } finally {
      setViewerLoading(false);
    }
  };

  const handleDownload = (file: FileEntry) => {
    const filePath = `${currentPath}/${file.name}`;
    const url = `/api/files/download?user=${encodeURIComponent(selectedUser)}&path=${encodeURIComponent(filePath)}`;
    window.open(url, "_blank");
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setMkdirLoading(true);
    try {
      const res = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: selectedUser, path: `${currentPath}/${newFolderName.trim()}`, action: "mkdir" }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMkdirOpen(false);
      setNewFolderName("");
      await fetchFiles();
    } catch (err: any) {
      alert(err.message || "Failed to create folder");
    } finally {
      setMkdirLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const filePath = `${currentPath}/${deleteTarget.name}`;
      const type = deleteTarget.TYPE === "d" ? "dir" : "file";
      const res = await fetch(
        `/api/files?user=${encodeURIComponent(selectedUser)}&path=${encodeURIComponent(filePath)}&type=${type}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDeleteOpen(false);
      setDeleteTarget(null);
      await fetchFiles();
    } catch (err: any) {
      alert(err.message || "Failed to delete");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleUploadFiles = async (fileList: FileList) => {
    setUploadLoading(true);
    try {
      for (const file of Array.from(fileList)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("user", selectedUser);
        formData.append("path", currentPath);

        const res = await fetch("/api/files/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
      }
      await fetchFiles();
    } catch (err: any) {
      alert(err.message || "Failed to upload file");
    } finally {
      setUploadLoading(false);
    }
  };

  const formatSize = (size?: string) => {
    if (!size) return "—";
    const num = parseInt(size, 10);
    if (isNaN(num)) return size;
    if (num >= 1073741824) return `${(num / 1073741824).toFixed(1)} GB`;
    if (num >= 1048576) return `${(num / 1048576).toFixed(1)} MB`;
    if (num >= 1024) return `${(num / 1024).toFixed(1)} KB`;
    return `${num} B`;
  };

  const isTextFile = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase() || "";
    return ["txt","md","html","htm","css","js","ts","tsx","jsx","json","xml","yml","yaml","conf","cfg","ini","sh","bash","py","php","rb","log","env","htaccess","sql"].includes(ext);
  };

  // User selection screen
  if (!selectedUser) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[#134E4A]">File Manager</h1>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
            <span className="ml-2 text-sm text-muted-foreground">Loading users...</span>
          </div>
        ) : (
          <GlassCard>
            <p className="text-sm text-muted-foreground mb-4">Select a user to browse files:</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {users.map((u) => (
                <button
                  key={u.username}
                  onClick={() => setSelectedUser(u.username)}
                  className="flex items-center gap-3 rounded-xl border border-white/30 bg-white/40 px-4 py-3 text-left transition-all hover:bg-white/60 hover:shadow-md cursor-pointer"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100">
                    <User className="h-5 w-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="font-medium text-[#134E4A]">{u.username}</p>
                    <p className="text-xs text-muted-foreground">/home/{u.username}/web</p>
                  </div>
                </button>
              ))}
            </div>
          </GlassCard>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#134E4A]">File Manager</h1>
        <div className="flex items-center gap-2">
          <Select value={selectedUser} onValueChange={(v) => v && setSelectedUser(v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {users.map((u) => (
                <SelectItem key={u.username} value={u.username}>{u.username}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            className="cursor-pointer"
            disabled={uploadLoading}
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.multiple = true;
              input.onchange = () => {
                if (input.files && input.files.length > 0) {
                  handleUploadFiles(input.files);
                }
              };
              input.click();
            }}
          >
            {uploadLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload
          </Button>
          <Button className="bg-teal-600 text-white hover:bg-teal-700 cursor-pointer" onClick={() => setMkdirOpen(true)}>
            <FolderPlus className="h-4 w-4" />
            New Folder
          </Button>
        </div>
      </div>

      {/* Breadcrumbs */}
      <GlassCard className="!py-3">
        <div className="flex items-center gap-1 text-sm overflow-x-auto">
          <button
            onClick={() => setCurrentPath(basePath)}
            className="flex items-center gap-1 text-teal-600 hover:text-teal-800 cursor-pointer shrink-0"
          >
            <Home className="h-4 w-4" />
            web
          </button>
          {breadcrumbs.slice(3).map((crumb, i, arr) => (
            <span key={crumb.path} className="flex items-center gap-1 shrink-0">
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
              <button
                onClick={() => setCurrentPath(crumb.path)}
                className={cn(
                  "hover:text-teal-600 cursor-pointer",
                  i === arr.length - 1 ? "font-medium text-[#134E4A]" : "text-muted-foreground"
                )}
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </div>
      </GlassCard>

      {error && (
        <GlassCard className="border-red-200 bg-red-50/70">
          <p className="text-sm text-red-600">{error}</p>
        </GlassCard>
      )}

      {/* File List */}
      <GlassCard>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
            <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
          </div>
        ) : (
          <div className="space-y-0.5">
            {currentPath !== basePath && (
              <button
                onClick={navigateUp}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/50 cursor-pointer"
              >
                <ArrowUp className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">..</span>
              </button>
            )}

            {files.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                This folder is empty
              </div>
            )}

            {files
              .sort((a, b) => {
                if (a.TYPE === "d" && b.TYPE !== "d") return -1;
                if (a.TYPE !== "d" && b.TYPE === "d") return 1;
                return a.name.localeCompare(b.name);
              })
              .map((file) => {
                const isDir = file.TYPE === "d";
                const canView = !isDir && isTextFile(file.name);
                return (
                  <div
                    key={file.name}
                    className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/50"
                  >
                    {/* Icon */}
                    <div className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                      isDir ? "bg-amber-50 text-amber-500" : "bg-slate-50 text-slate-400"
                    )}>
                      {isDir ? <Folder className="h-5 w-5" /> : <File className="h-5 w-5" />}
                    </div>

                    {/* Name */}
                    {isDir ? (
                      <button onClick={() => navigateTo(file.name)} className="flex-1 text-left cursor-pointer min-w-0">
                        <p className="text-sm font-medium text-[#134E4A] hover:text-teal-600 transition-colors truncate">{file.name}</p>
                      </button>
                    ) : (
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#134E4A] truncate">{file.name}</p>
                      </div>
                    )}

                    {/* Metadata — fixed widths, always visible on sm+ */}
                    <div className="hidden sm:flex items-center text-xs text-muted-foreground shrink-0">
                      <span className="w-16 text-right font-mono">{file.PERMISSIONS || "—"}</span>
                      <span className="w-16 text-right">{!isDir && file.SIZE ? formatSize(file.SIZE) : "—"}</span>
                      <span className="w-24 text-right">{file.DATE || "—"}</span>
                    </div>

                    {/* Actions — fixed width container, always takes space */}
                    <div className="flex items-center shrink-0 w-[88px] justify-end">
                      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        {canView && (
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 cursor-pointer" onClick={() => handleViewFile(file)} title="View">
                            <Eye className="h-4 w-4 text-teal-500" />
                          </Button>
                        )}
                        {!isDir && (
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 cursor-pointer" onClick={() => handleDownload(file)} title="Download">
                            <Download className="h-4 w-4 text-blue-500" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 cursor-pointer" onClick={() => { setDeleteTarget(file); setDeleteOpen(true); }} title="Delete">
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </GlassCard>

      {/* File Viewer */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <File className="h-4 w-4" />
              {viewerFile}
            </DialogTitle>
          </DialogHeader>
          {viewerLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
            </div>
          ) : (
            <pre className="max-h-[60vh] overflow-auto rounded-xl bg-slate-50 p-4 text-sm font-mono text-slate-800 border border-slate-200">
              {viewerContent || "(empty file)"}
            </pre>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Folder */}
      <Dialog open={mkdirOpen} onOpenChange={setMkdirOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Folder</DialogTitle>
            <DialogDescription>Create a new folder in {currentPath}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="folder-name">Folder Name</Label>
              <Input id="folder-name" placeholder="my-folder" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button className="bg-teal-600 text-white hover:bg-teal-700" onClick={handleCreateFolder} disabled={mkdirLoading || !newFolderName.trim()}>
              {mkdirLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.TYPE === "d" ? "Folder" : "File"}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
