import React, {useState, useEffect, useCallback} from "react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/Card";
import {Button} from "@/components/ui/Button";
import {Input} from "@/components/ui/Input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import {
  Droplet,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Users,
  CalendarDays,
  MapPin,
  User,
  AlertCircle,
  ChevronDown,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {baptismsService, membersService, settingsService} from "@/services/api";
import {buildBaptismCertificate} from "@/utils/reportPrint";

const fmtDate = (d) => {
  if (!d) return "—";
  const parts = d.split("T")[0].split("-");
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const today = () => new Date().toISOString().split("T")[0];

const emptyForm = () => ({
  memberId: "",
  baptismDate: today(),
  minister: "",
  place: "",
});

export default function BaptismsPage() {
  const [baptisms, setBaptisms] = useState([]);
  const [stats, setStats] = useState(null);
  const [members, setMembers] = useState([]);
  const [churchName, setChurchName] = useState("Iglesia Cristiana");
  const [churchLogo, setChurchLogo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // filtros
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [pagination, setPagination] = useState({total: 0, limit: 20, offset: 0});

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // delete
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // ─── Fetch ────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {limit: pagination.limit, offset: pagination.offset};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (search.trim()) params.search = search.trim();

      const [bRes, sRes] = await Promise.all([
        baptismsService.getAll(params),
        baptismsService.getStats(),
      ]);
      setBaptisms(bRes.baptisms || []);
      setPagination((prev) => ({...prev, total: bRes.total || 0}));
      setStats(sRes);
    } catch {
      setError("Error al cargar los bautismos. Intente de nuevo.");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, search, pagination.offset, pagination.limit]);

  useEffect(() => {
    fetchAll();
  }, [startDate, endDate, pagination.offset]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPagination((prev) => ({...prev, offset: 0}));
      fetchAll();
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    membersService
      .getAll({limit: 500})
      .then((r) => setMembers(r.members || []))
      .catch(() => {});
  }, []);

  // Cargar nombre de la iglesia
  useEffect(() => {
    settingsService
      .getChurch()
      .then((church) => {
        if (church?.name) {
          setChurchName(church.name);
        }
        if (church?.logoUrl) {
          setChurchLogo(church.logoUrl);
        }
      })
      .catch(() => {});
  }, []);

  // Miembros que aún no tienen bautismo registrado
  const baptizedMemberIds = new Set(baptisms.map((b) => b.member_id));
  const availableMembers = members.filter((m) => !baptizedMemberIds.has(m.id));

  // El filtro de búsqueda ya se aplica en el backend (ver fetchAll).
  const filtered = baptisms;
  const totalPages = Math.ceil(pagination.total / pagination.limit);
  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;
  const goPage = (p) =>
    setPagination((prev) => ({...prev, offset: (p - 1) * prev.limit}));

  // ─── Modal ────────────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditItem(null);
    setForm(emptyForm());
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (b) => {
    setEditItem(b);
    setForm({
      memberId: b.member_id,
      baptismDate: b.baptism_date ? b.baptism_date.split("T")[0] : today(),
      minister: b.minister || "",
      place: b.place || "",
    });
    setFormError("");
    setModalOpen(true);
  };

  const handleClose = () => {
    setModalOpen(false);
    setEditItem(null);
    setForm(emptyForm());
    setFormError("");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.memberId && !editItem)
      return setFormError("Seleccione un miembro.");
    if (!form.baptismDate)
      return setFormError("La fecha de bautismo es obligatoria.");

    setSaving(true);
    setFormError("");
    try {
      if (editItem) {
        await baptismsService.update(editItem.id, {
          baptismDate: form.baptismDate,
          minister: form.minister || undefined,
          place: form.place || undefined,
        });
      } else {
        await baptismsService.create({
          memberId: form.memberId,
          baptismDate: form.baptismDate,
          minister: form.minister || undefined,
          place: form.place || undefined,
        });
      }
      handleClose();
      fetchAll();
    } catch (e) {
      setFormError(
        e?.response?.data?.error || "Error al guardar. Intente de nuevo.",
      );
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete ───────────────────────────────────────────────────────────────
  const confirmDelete = (b) => {
    setDeleteTarget(b);
    setDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await baptismsService.delete(deleteTarget.id);
      setDeleteModal(false);
      setDeleteTarget(null);
      fetchAll();
    } catch {
      /* silent */
    }
  };

  // ─── Print Certificate ────────────────────────────────────────────────────
  const handlePrintCertificate = (baptism) => {
    const html = buildBaptismCertificate(baptism, churchName, churchLogo);
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Droplet className="w-5 h-5 text-white" />
            </span>
            Bautismos
          </h1>
          <p className="text-muted-foreground mt-1">
            Registro de bautismos de miembros
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg"
        >
          <Plus className="w-4 h-4 mr-2" />
          Registrar Bautismo
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-cyan-500/20 to-blue-600/10 border-cyan-500/30">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-cyan-700 dark:text-cyan-300 text-sm font-medium">
                Total Bautismos
              </p>
              <p className="text-3xl font-bold text-foreground mt-1">
                {stats?.total || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center">
              <Droplet className="w-6 h-6 text-cyan-700 dark:text-cyan-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/20 to-indigo-600/10 border-blue-500/30">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-blue-700 dark:text-blue-300 text-sm font-medium">
                Este año ({stats?.year || new Date().getFullYear()})
              </p>
              <p className="text-3xl font-bold text-foreground mt-1">
                {stats?.byMonth?.reduce((s, m) => s + parseInt(m.count), 0) ||
                  0}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <CalendarDays className="w-6 h-6 text-blue-700 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-500/20 to-purple-600/10 border-indigo-500/30">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-indigo-700 dark:text-indigo-300 text-sm font-medium">
                Miembros bautizados
              </p>
              <p className="text-3xl font-bold text-foreground mt-1">
                {baptizedMemberIds.size}
              </p>
              <p className="text-indigo-700 dark:text-indigo-400 text-xs mt-1">
                de {members.length} miembros
              </p>
            </div>
            <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-indigo-700 dark:text-indigo-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla */}
      <Card className="bg-card border-border">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, ministro o lugar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-cyan-500"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-background border-border text-foreground w-36 focus:border-cyan-500 text-sm"
                title="Desde"
              />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-background border-border text-foreground w-36 focus:border-cyan-500 text-sm"
                title="Hasta"
              />
              {(startDate || endDate) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                  }}
                  className="border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-16 text-muted-foreground">
              <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Cargando bautismos...
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-2 text-red-700 dark:text-red-400 py-12">
              <AlertCircle className="w-8 h-8" />
              {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Droplet className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-lg font-medium">
                No hay bautismos registrados
              </p>
              <p className="text-sm mt-1">
                Haz clic en "Registrar Bautismo" para comenzar.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-3 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                      Miembro
                    </th>
                    <th className="px-4 py-3 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-4 py-3 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                      Ministro
                    </th>
                    <th className="px-4 py-3 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                      Lugar
                    </th>
                    <th className="px-4 py-3 text-muted-foreground text-xs font-semibold uppercase tracking-wider text-center">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((b) => (
                    <tr
                      key={b.id}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-cyan-700 dark:text-cyan-400" />
                          </div>
                          <div>
                            <p className="text-foreground text-sm font-medium">
                              {b.first_name} {b.last_name}
                            </p>
                            {b.phone && (
                              <p className="text-muted-foreground text-xs">{b.phone}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5 text-cyan-700 dark:text-cyan-300 text-sm">
                          <CalendarDays className="w-3.5 h-3.5" />
                          {fmtDate(b.baptism_date)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-sm">
                        {b.minister || <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-sm">
                        {b.place ? (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            {b.place}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handlePrintCertificate(b)}
                            className="w-7 h-7 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 hover:text-cyan-700 dark:text-cyan-300 flex items-center justify-center transition-colors"
                            title="Imprimir Certificado"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openEdit(b)}
                            className="w-7 h-7 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-400 hover:text-blue-700 dark:text-blue-300 flex items-center justify-center transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => confirmDelete(b)}
                            className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-400 hover:text-red-700 dark:text-red-300 flex items-center justify-center transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    Página {currentPage} de {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => goPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      variant="outline"
                      size="sm"
                      className="bg-secondary border-border text-foreground hover:bg-accent"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => goPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      variant="outline"
                      size="sm"
                      className="bg-secondary border-border text-foreground hover:bg-accent"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Modal CREAR / EDITAR ────────────────────────────────────────────── */}
      <Dialog open={modalOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="bg-card border-border max-w-xl w-full">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-3 text-xl">
              <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <Droplet className="w-4 h-4 text-white" />
              </span>
              {editItem ? "Editar Bautismo" : "Registrar Bautismo"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="mt-4 space-y-4">
            {/* Miembro — solo al crear */}
            {!editItem && (
              <div>
                <label className="text-muted-foreground text-sm font-medium block mb-1.5">
                  Miembro
                </label>
                <div className="relative">
                  <select
                    value={form.memberId}
                    onChange={(e) =>
                      setForm((f) => ({...f, memberId: e.target.value}))
                    }
                    required
                    className="w-full px-3 py-2 pr-8 bg-background border border-border text-foreground rounded-md text-sm focus:outline-none focus:border-cyan-500 appearance-none"
                  >
                    <option value="">— Seleccione un miembro —</option>
                    {availableMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.first_name} {m.last_name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
                {availableMembers.length === 0 && (
                  <p className="text-amber-700 dark:text-amber-400 text-xs mt-1">
                    Todos los miembros ya tienen bautismo registrado.
                  </p>
                )}
              </div>
            )}

            {/* Al editar: mostrar nombre del miembro (solo lectura) */}
            {editItem && (
              <div className="flex items-center gap-3 px-3 py-2.5 bg-muted/50 rounded-lg border border-border">
                <User className="w-4 h-4 text-cyan-700 dark:text-cyan-400 shrink-0" />
                <span className="text-foreground text-sm font-medium">
                  {editItem.first_name} {editItem.last_name}
                </span>
              </div>
            )}

            {/* Fecha */}
            <div>
              <label className="text-muted-foreground text-sm font-medium block mb-1.5">
                Fecha de Bautismo
              </label>
              <Input
                type="date"
                value={form.baptismDate}
                onChange={(e) =>
                  setForm((f) => ({...f, baptismDate: e.target.value}))
                }
                required
                className="bg-background border-border text-foreground focus:border-cyan-500"
              />
            </div>

            {/* Ministro y Lugar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-muted-foreground text-sm font-medium block mb-1.5">
                  Ministro{" "}
                  <span className="text-muted-foreground font-normal">(opcional)</span>
                </label>
                <Input
                  placeholder="Nombre del ministro"
                  value={form.minister}
                  onChange={(e) =>
                    setForm((f) => ({...f, minister: e.target.value}))
                  }
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="text-muted-foreground text-sm font-medium block mb-1.5">
                  Lugar{" "}
                  <span className="text-muted-foreground font-normal">(opcional)</span>
                </label>
                <Input
                  placeholder="Lugar del bautismo"
                  value={form.place}
                  onChange={(e) =>
                    setForm((f) => ({...f, place: e.target.value}))
                  }
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-cyan-500"
                />
              </div>
            </div>

            {formError && (
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {formError}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white min-w-[120px]"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Guardando...
                  </span>
                ) : editItem ? (
                  "Guardar cambios"
                ) : (
                  "Registrar"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Modal CONFIRMAR ELIMINACIÓN ─────────────────────────────────────── */}
      <Dialog
        open={deleteModal}
        onOpenChange={(open) => !open && setDeleteModal(false)}
      >
        <DialogContent className="bg-card border-border max-w-md w-full">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-3">
              <span className="w-9 h-9 rounded-lg bg-red-500/20 flex items-center justify-center">
                <Trash2 className="w-4 h-4 text-red-700 dark:text-red-400" />
              </span>
              Confirmar eliminación
            </DialogTitle>
          </DialogHeader>
          <p className="mt-3 text-muted-foreground text-sm">
            ¿Eliminar el registro de bautismo de{" "}
            <span className="text-foreground font-semibold">
              {deleteTarget?.first_name} {deleteTarget?.last_name}
            </span>
            ? Esta acción no se puede deshacer.
          </p>
          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setDeleteModal(false)}
              className="border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
