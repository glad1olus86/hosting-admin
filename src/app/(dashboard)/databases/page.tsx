"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Trash2,
  Database,
  Loader2,
  Key,
  Search,
  HardDrive,
  User,
  Ban,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
} from "lucide-react";
import { GlassCard } from "@/components/layout/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

interface HestiaDatabase {
  name: string;
  user: string;
  DATABASE: string;
  DBUSER: string;
  HOST: string;
  TYPE: string;
  CHARSET: string;
  U_DISK: string;
  SUSPENDED: string;
  TIME: string;
  DATE: string;
}

interface HestiaUser {
  username: string;
}

export default function DatabasesPage() {
  const [databases, setDatabases] = useState<HestiaDatabase[]>([]);
  const [users, setUsers] = useState<HestiaUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterUser, setFilterUser] = useState<string>("all");

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
  const [deleteTarget, setDeleteTarget] = useState<HestiaDatabase | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Change password dialog
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<HestiaDatabase | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Action loading states
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

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
      // Non-critical
    }
  }, []);

  useEffect(() => {
    fetchDatabases();
    fetchUsers();
  }, [fetchDatabases, fetchUsers]);

  const handleAddDatabase = async () => {
    if (!addForm.user || !addForm.db_name || !addForm.db_user || !addForm.db_password) {
      setError("Заполните все обязательные поля");
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
      if (!res.ok || data.error) throw new Error(data.error || "Failed to add database");
      setAddDialogOpen(false);
      setAddForm({ user: "", db_name: "", db_user: "", db_password: "", type: "mysql" });
      await fetchDatabases();
    } catch (err: any) {
      setError(err.message);
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
      if (!res.ok || data.error) throw new Error(data.error || "Failed to delete");
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      await fetchDatabases();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordTarget || !newPassword) return;
    setPasswordLoading(true);
    try {
      const res = await fetch("/api/databases", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: passwordTarget.user,
          db_name: passwordTarget.name,
          action: "change_password",
          password: newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to change password");
      setPasswordDialogOpen(false);
      setPasswordTarget(null);
      setNewPassword("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleToggleSuspend = async (db: HestiaDatabase) => {
    const key = `${db.user}-${db.name}`;
    setActionLoading((prev) => ({ ...prev, [key]: true }));
    try {
      const action = db.SUSPENDED === "yes" ? "unsuspend" : "suspend";
      const res = await fetch("/api/databases", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: db.user, db_name: db.name, action }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed");
      await fetchDatabases();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let pwd = "";
    for (let i = 0; i < 16; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
    return pwd;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Filter & search
  const filtered = databases.filter((db) => {
    const matchesSearch =
      !search ||
      db.name.toLowerCase().includes(search.toLowerCase()) ||
      db.DBUSER.toLowerCase().includes(search.toLowerCase()) ||
      db.user.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === "all" || db.TYPE.toLowerCase() === filterType;
    const matchesUser = filterUser === "all" || db.user === filterUser;
    return matchesSearch && matchesType && matchesUser;
  });

  const mysqlCount = databases.filter((d) => d.TYPE.toLowerCase() === "mysql").length;
  const pgsqlCount = databases.filter((d) => d.TYPE.toLowerCase() === "pgsql").length;
  const suspendedCount = databases.filter((d) => d.SUSPENDED === "yes").length;
  const totalDisk = databases.reduce((sum, d) => sum + parseInt(d.U_DISK || "0", 10), 0);

  const uniqueUsers = [...new Set(databases.map((d) => d.user))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#134E4A]">Базы данных</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Управление базами данных MySQL и PostgreSQL
          </p>
        </div>
        <Button
          className="bg-teal-600 text-white hover:bg-teal-700 cursor-pointer"
          onClick={() => setAddDialogOpen(true)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Создать БД
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
              <Database className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#134E4A]">{databases.length}</p>
              <p className="text-xs text-muted-foreground">Всего БД</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Database className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#134E4A]">{mysqlCount}</p>
              <p className="text-xs text-muted-foreground">MySQL</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
              <Database className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#134E4A]">{pgsqlCount}</p>
              <p className="text-xs text-muted-foreground">PostgreSQL</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#134E4A]">{totalDisk} MB</p>
              <p className="text-xs text-muted-foreground">Диск</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Filters */}
      <GlassCard className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по имени, пользователю..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {/* Type filter pills */}
            {[
              { key: "all", label: "Все", count: databases.length },
              { key: "mysql", label: "MySQL", count: mysqlCount },
              { key: "pgsql", label: "PostgreSQL", count: pgsqlCount },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilterType(f.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  filterType === f.key
                    ? "bg-teal-600 text-white shadow-sm"
                    : "bg-white/60 text-slate-600 hover:bg-white/80 border border-slate-200"
                }`}
              >
                {f.label}
                <span className="ml-1.5 opacity-70">{f.count}</span>
              </button>
            ))}
          </div>
          {uniqueUsers.length > 1 && (
            <Select value={filterUser} onValueChange={(val) => setFilterUser(val || "all")}>
              <SelectTrigger className="w-[160px] cursor-pointer">
                <User className="h-4 w-4 mr-1 text-muted-foreground" />
                <SelectValue placeholder="Пользователь" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="cursor-pointer">Все пользователи</SelectItem>
                {uniqueUsers.map((u) => (
                  <SelectItem key={u} value={u} className="cursor-pointer">
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </GlassCard>

      {/* Error */}
      {error && (
        <GlassCard className="border-red-200 bg-red-50/70 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-600">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-xs cursor-pointer">
              Закрыть
            </button>
          </div>
        </GlassCard>
      )}

      {/* Content */}
      {loading ? (
        <GlassCard className="p-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
            <span className="ml-2 text-sm text-muted-foreground">Загрузка баз данных...</span>
          </div>
        </GlassCard>
      ) : filtered.length === 0 ? (
        <GlassCard className="p-16">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-teal-100 flex items-center justify-center">
              <Database className="w-8 h-8 text-teal-600" />
            </div>
            <h2 className="text-xl font-semibold text-[#134E4A]">
              {databases.length === 0 ? "Нет баз данных" : "Ничего не найдено"}
            </h2>
            <p className="text-muted-foreground text-center">
              {databases.length === 0
                ? "Создайте первую базу данных для начала работы."
                : "Попробуйте изменить параметры поиска."}
            </p>
          </div>
        </GlassCard>
      ) : (
        <div className="grid gap-4">
          {filtered.map((db) => {
            const key = `${db.user}-${db.name}`;
            const isMySQL = db.TYPE.toLowerCase() === "mysql";
            const isSuspended = db.SUSPENDED === "yes";
            const isActionLoading = actionLoading[key];

            return (
              <GlassCard
                key={key}
                className={`p-5 transition-all hover:shadow-md ${
                  isSuspended ? "opacity-60 border-red-200" : ""
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Left: Icon + Info */}
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                        isMySQL ? "bg-blue-100" : "bg-violet-100"
                      }`}
                    >
                      <Database className={`w-6 h-6 ${isMySQL ? "text-blue-600" : "text-violet-600"}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-[#134E4A] truncate">{db.name}</h3>
                        <Badge
                          className={
                            isMySQL
                              ? "bg-blue-100 text-blue-700 border-blue-200"
                              : "bg-violet-100 text-violet-700 border-violet-200"
                          }
                        >
                          {isMySQL ? "MySQL" : "PostgreSQL"}
                        </Badge>
                        {isSuspended && (
                          <Badge className="bg-red-100 text-red-700 border-red-200">
                            <Ban className="w-3 h-3 mr-1" />
                            Приостановлена
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          {db.user}
                        </span>
                        <span className="flex items-center gap-1">
                          <Key className="w-3.5 h-3.5" />
                          {db.DBUSER}
                        </span>
                        <span className="flex items-center gap-1">
                          <HardDrive className="w-3.5 h-3.5" />
                          {db.U_DISK} MB
                        </span>
                        <span>{db.CHARSET}</span>
                        {db.DATE && (
                          <span className="text-xs text-slate-400">
                            {db.DATE}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="cursor-pointer h-8 px-2"
                      title="Копировать имя БД"
                      onClick={() => copyToClipboard(db.name)}
                    >
                      <Copy className="h-4 w-4 text-slate-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="cursor-pointer h-8 px-2"
                      title="Сменить пароль"
                      onClick={() => {
                        setPasswordTarget(db);
                        setNewPassword("");
                        setShowPassword(false);
                        setPasswordDialogOpen(true);
                      }}
                    >
                      <Key className="h-4 w-4 text-amber-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="cursor-pointer h-8 px-2"
                      title={isSuspended ? "Возобновить" : "Приостановить"}
                      disabled={isActionLoading}
                      onClick={() => handleToggleSuspend(db)}
                    >
                      {isActionLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                      ) : isSuspended ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Ban className="h-4 w-4 text-orange-500" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="cursor-pointer h-8 px-2"
                      title="Удалить"
                      onClick={() => {
                        setDeleteTarget(db);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Add Database Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Создать базу данных</DialogTitle>
            <DialogDescription>
              Новая база данных будет создана на сервере.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Пользователь</Label>
              <Select
                value={addForm.user}
                onValueChange={(val) => setAddForm((f) => ({ ...f, user: val || "" }))}
              >
                <SelectTrigger className="w-full cursor-pointer">
                  <SelectValue placeholder="Выберите пользователя" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.username} value={u.username} className="cursor-pointer">
                      {u.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Имя базы данных</Label>
              <Input
                placeholder="my_database"
                value={addForm.db_name}
                onChange={(e) => setAddForm((f) => ({ ...f, db_name: e.target.value }))}
              />
              {addForm.user && addForm.db_name && (
                <p className="text-xs text-muted-foreground">
                  Полное имя: <span className="font-mono text-teal-600">{addForm.user}_{addForm.db_name}</span>
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label>Пользователь БД</Label>
              <Input
                placeholder="db_user"
                value={addForm.db_user}
                onChange={(e) => setAddForm((f) => ({ ...f, db_user: e.target.value }))}
              />
              {addForm.user && addForm.db_user && (
                <p className="text-xs text-muted-foreground">
                  Полное имя: <span className="font-mono text-teal-600">{addForm.user}_{addForm.db_user}</span>
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label>Пароль</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Пароль базы данных"
                    value={addForm.db_password}
                    onChange={(e) => setAddForm((f) => ({ ...f, db_password: e.target.value }))}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer shrink-0"
                  onClick={() => {
                    const pwd = generatePassword();
                    setAddForm((f) => ({ ...f, db_password: pwd }));
                    setShowPassword(true);
                  }}
                >
                  Генерировать
                </Button>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Тип</Label>
              <Select
                value={addForm.type}
                onValueChange={(val) => setAddForm((f) => ({ ...f, type: val || "mysql" }))}
              >
                <SelectTrigger className="w-full cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mysql" className="cursor-pointer">MySQL</SelectItem>
                  <SelectItem value="pgsql" className="cursor-pointer">PostgreSQL</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Отмена
            </DialogClose>
            <Button
              className="bg-teal-600 text-white hover:bg-teal-700 cursor-pointer"
              onClick={handleAddDatabase}
              disabled={addLoading}
            >
              {addLoading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Сменить пароль</DialogTitle>
            <DialogDescription>
              Установить новый пароль для базы <strong>{passwordTarget?.name}</strong>
              {" "}(пользователь: {passwordTarget?.DBUSER})
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Новый пароль</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Новый пароль"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer shrink-0"
                  onClick={() => {
                    setNewPassword(generatePassword());
                    setShowPassword(true);
                  }}
                >
                  Генерировать
                </Button>
              </div>
              {newPassword && showPassword && (
                <button
                  className="flex items-center gap-1 text-xs text-teal-600 hover:underline cursor-pointer w-fit"
                  onClick={() => copyToClipboard(newPassword)}
                >
                  <Copy className="h-3 w-3" />
                  Скопировать пароль
                </button>
              )}
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Отмена
            </DialogClose>
            <Button
              className="bg-amber-600 text-white hover:bg-amber-700 cursor-pointer"
              onClick={handleChangePassword}
              disabled={passwordLoading || !newPassword}
            >
              {passwordLoading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Сменить пароль
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить базу данных</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите удалить базу данных{" "}
              <strong className="text-red-600">{deleteTarget?.name}</strong>?
              Это действие необратимо — все данные будут удалены.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Отмена
            </DialogClose>
            <Button
              variant="destructive"
              className="cursor-pointer"
              onClick={handleDeleteDatabase}
              disabled={deleteLoading}
            >
              {deleteLoading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
