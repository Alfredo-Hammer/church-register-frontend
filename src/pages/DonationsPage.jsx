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
  Heart,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  X,
  TrendingUp,
  Users,
  DollarSign,
  ChevronDown,
  AlertCircle,
  Printer,
} from "lucide-react";
import {
  donationsService,
  membersService,
  settingsService,
} from "@/services/api";
import {buildDonationsReport} from "@/utils/reportPrint";

// ─── Tipos de donación ────────────────────────────────────────────────────────
const DONATION_TYPES = [
  {
    value: "DIEZMO",
    label: "Diezmo",
    color: "bg-violet-500/20 text-violet-700 dark:text-violet-300 border-violet-500/40",
  },
  {
    value: "OFRENDA",
    label: "Ofrenda",
    color: "bg-pink-500/20 text-pink-700 dark:text-pink-300 border-pink-500/40",
  },
  {
    value: "ESPECIAL",
    label: "Especial",
    color: "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40",
  },
  {
    value: "MISION",
    label: "Misión",
    color: "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/40",
  },
];

const TYPE_MAP = Object.fromEntries(DONATION_TYPES.map((t) => [t.value, t]));

const fmtMoney = (v) =>
  "$" +
  Number(v || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtDate = (d) => {
  if (!d) return "—";
  const parts = d.split("T")[0].split("-");
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const today = () => new Date().toISOString().split("T")[0];

// ─── Formulario vacío ─────────────────────────────────────────────────────────
const emptyForm = () => ({
  memberId: "",
  amount: "",
  date: today(),
  type: "DIEZMO",
  description: "",
  isAnonymous: false,
});

// ─── Componente principal ─────────────────────────────────────────────────────
export default function DonationsPage() {
  const [donations, setDonations] = useState([]);
  const [summary, setSummary] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // filtros
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // delete confirm
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [church, setChurch] = useState({});
  useEffect(() => {
    settingsService
      .getChurch()
      .then((r) => setChurch(r.church || r || {}))
      .catch(() => {});
  }, []);

  const handlePrint = () => {
    if (!summary) return;
    const html = buildDonationsReport(summary, {startDate, endDate}, church);
    const win = window.open("", "_blank", "width=960,height=720");
    win.document.write(html);
    win.document.close();
  };

  // ─── Data fetch ────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (filterType) params.type = filterType;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      params.limit = 200;

      const [donRes, sumRes] = await Promise.all([
        donationsService.getAll(params),
        donationsService.getSummary(params),
      ]);
      setDonations(donRes.donations || []);
      setSummary(sumRes);
    } catch (e) {
      setError("Error al cargar las donaciones. Intente de nuevo.");
    } finally {
      setLoading(false);
    }
  }, [filterType, startDate, endDate]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    membersService
      .getAll({limit: 500})
      .then((r) => setMembers(r.members || []))
      .catch(() => {});
  }, []);

  // ─── Filtro local (búsqueda por nombre) ────────────────────────────────────
  const filtered = donations.filter((d) => {
    if (!search) return true;
    const name = d.is_anonymous
      ? "anónimo"
      : `${d.first_name || ""} ${d.last_name || ""}`.toLowerCase();
    return (
      name.includes(search.toLowerCase()) ||
      (d.description || "").toLowerCase().includes(search.toLowerCase())
    );
  });

  // ─── Summary helpers ───────────────────────────────────────────────────────
  const getTypeSummary = (type) =>
    summary?.byType?.find((b) => b.type === type) || {total: 0, count: 0};

  // ─── Modal CRUD ────────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditItem(null);
    setForm(emptyForm());
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (donation) => {
    setEditItem(donation);
    setForm({
      memberId: donation.member_id || "",
      amount: donation.amount || "",
      date: donation.date ? donation.date.split("T")[0] : today(),
      type: donation.type || "DIEZMO",
      description: donation.description || "",
      isAnonymous: donation.is_anonymous || false,
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
    if (!form.amount || parseFloat(form.amount) <= 0)
      return setFormError("El monto debe ser mayor a 0.");
    if (!form.date) return setFormError("La fecha es obligatoria.");
    if (!form.isAnonymous && !form.memberId)
      return setFormError("Seleccione un miembro o marque como anónima.");

    setSaving(true);
    setFormError("");
    try {
      const payload = {
        memberId: form.isAnonymous ? undefined : form.memberId || undefined,
        amount: parseFloat(form.amount),
        date: form.date,
        type: form.type,
        description: form.description || undefined,
        isAnonymous: form.isAnonymous,
      };
      if (editItem) {
        await donationsService.update(editItem.id, payload);
      } else {
        await donationsService.create(payload);
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

  // ─── Delete ────────────────────────────────────────────────────────────────
  const confirmDelete = (donation) => {
    setDeleteTarget(donation);
    setDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await donationsService.delete(deleteTarget.id);
      setDeleteModal(false);
      setDeleteTarget(null);
      fetchAll();
    } catch {
      // silent
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </span>
            Diezmos y Ofrendas
          </h1>
          <p className="text-muted-foreground mt-1">
            Registro de contribuciones personales de miembros
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handlePrint}
            disabled={!summary}
            className="border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40 gap-2"
          >
            <Printer className="w-4 h-4" /> PDF
          </Button>
          <Button
            onClick={openCreate}
            className="bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Registrar Contribución
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Total */}
        <Card className="bg-gradient-to-br from-pink-500/20 to-rose-600/10 border-pink-500/30">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-pink-700 dark:text-pink-300 text-sm font-medium">
                  Total Donado
                </p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {fmtMoney(summary?.summary?.total)}
                </p>
                <p className="text-pink-700 dark:text-pink-400 text-xs mt-1">
                  {summary?.summary?.count || 0} donaciones
                </p>
              </div>
              <div className="w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center">
                <Heart className="w-6 h-6 text-pink-700 dark:text-pink-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Diezmos */}
        <Card className="bg-gradient-to-br from-violet-500/20 to-purple-600/10 border-violet-500/30">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-violet-700 dark:text-violet-300 text-sm font-medium">Diezmos</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {fmtMoney(getTypeSummary("DIEZMO").total)}
                </p>
                <p className="text-violet-700 dark:text-violet-400 text-xs mt-1">
                  {getTypeSummary("DIEZMO").count} registros
                </p>
              </div>
              <div className="w-12 h-12 bg-violet-500/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-violet-700 dark:text-violet-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ofrendas */}
        <Card className="bg-gradient-to-br from-amber-500/20 to-orange-600/10 border-amber-500/30">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-700 dark:text-amber-300 text-sm font-medium">Ofrendas</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {fmtMoney(getTypeSummary("OFRENDA").total)}
                </p>
                <p className="text-amber-700 dark:text-amber-400 text-xs mt-1">
                  {getTypeSummary("OFRENDA").count} registros
                </p>
              </div>
              <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-amber-700 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Donantes únicos */}
        <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-600/10 border-blue-500/30">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-700 dark:text-blue-300 text-sm font-medium">
                  Donantes Únicos
                </p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {summary?.summary?.uniqueDonors || 0}
                </p>
                <p className="text-blue-700 dark:text-blue-400 text-xs mt-1">miembros activos</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-700 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla principal */}
      <Card className="bg-card border-border">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Búsqueda */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o descripción..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-pink-500"
              />
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="pl-8 pr-8 py-2 bg-background border border-border text-foreground rounded-md text-sm focus:outline-none focus:border-pink-500 appearance-none cursor-pointer"
                >
                  <option value="">Todos los tipos</option>
                  {DONATION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              </div>

              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-background border-border text-foreground w-36 focus:border-pink-500 text-sm"
                title="Desde"
              />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-background border-border text-foreground w-36 focus:border-pink-500 text-sm"
                title="Hasta"
              />

              {(filterType || startDate || endDate) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilterType("");
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
              <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Cargando donaciones...
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-700 dark:text-red-400 flex flex-col items-center gap-2">
              <AlertCircle className="w-8 h-8" />
              {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Heart className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-lg font-medium">
                No hay donaciones registradas
              </p>
              <p className="text-sm mt-1">
                Haz clic en "Nueva Donación" para comenzar.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-3 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                      Donante
                    </th>
                    <th className="px-4 py-3 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-4 py-3 text-muted-foreground text-xs font-semibold uppercase tracking-wider text-right">
                      Monto
                    </th>
                    <th className="px-4 py-3 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-4 py-3 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                      Descripción
                    </th>
                    <th className="px-4 py-3 text-muted-foreground text-xs font-semibold uppercase tracking-wider text-center">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((d) => {
                    const typeInfo = TYPE_MAP[d.type] || {
                      label: d.type,
                      color:
                        "bg-muted text-muted-foreground border-border",
                    };
                    return (
                      <tr
                        key={d.id}
                        className="hover:bg-muted/50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          {d.is_anonymous ? (
                            <span className="text-muted-foreground italic text-sm">
                              Anónimo
                            </span>
                          ) : (
                            <div>
                              <p className="text-foreground text-sm font-medium">
                                {d.first_name} {d.last_name}
                              </p>
                              {d.phone && (
                                <p className="text-muted-foreground text-xs">
                                  {d.phone}
                                </p>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium border ${typeInfo.color}`}
                          >
                            {typeInfo.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-green-700 dark:text-green-400 font-semibold">
                            {fmtMoney(d.amount)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-sm whitespace-nowrap">
                          {fmtDate(d.date)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-sm max-w-xs truncate">
                          {d.description || (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openEdit(d)}
                              className="w-7 h-7 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-400 hover:text-blue-700 dark:text-blue-300 flex items-center justify-center transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => confirmDelete(d)}
                              className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-400 hover:text-red-700 dark:text-red-300 flex items-center justify-center transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Modal CREAR / EDITAR ─────────────────────────────────────────────── */}
      <Dialog open={modalOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="bg-card border-border max-w-2xl w-full">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-3 text-xl">
              <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
                <Heart className="w-4 h-4 text-white" />
              </span>
              {editItem ? "Editar Donación" : "Nueva Donación"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="mt-4 space-y-5">
            {/* Tipo de donación */}
            <div>
              <label className="text-muted-foreground text-sm font-medium block mb-2">
                Tipo de donación
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DONATION_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setForm((f) => ({...f, type: t.value}))}
                    className={`py-2.5 px-3 rounded-xl border text-sm font-medium transition-all ${
                      form.type === t.value
                        ? `${t.color} ring-2 ring-offset-1 ring-offset-card ring-pink-500`
                        : "bg-background border-border text-muted-foreground hover:border-muted-foreground/40"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Donante */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-muted-foreground text-sm font-medium">
                  Donante
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.isAnonymous}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        isAnonymous: e.target.checked,
                        memberId: "",
                      }))
                    }
                    className="accent-pink-500"
                  />
                  <span className="text-muted-foreground text-sm">
                    Donación anónima
                  </span>
                </label>
              </div>
              {!form.isAnonymous && (
                <div className="relative">
                  <select
                    value={form.memberId}
                    onChange={(e) =>
                      setForm((f) => ({...f, memberId: e.target.value}))
                    }
                    required={!form.isAnonymous}
                    className="w-full px-3 py-2 pr-8 bg-background border border-border text-foreground rounded-md text-sm focus:outline-none focus:border-pink-500 appearance-none"
                  >
                    <option value="">— Seleccione un miembro —</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.first_name} {m.last_name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              )}
              {form.isAnonymous && (
                <p className="text-muted-foreground text-sm italic px-1">
                  Se registrará como donación anónima.
                </p>
              )}
            </div>

            {/* Monto y Fecha */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-muted-foreground text-sm font-medium block mb-1.5">
                  Monto (RD$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold">
                    $
                  </span>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={(e) =>
                      setForm((f) => ({...f, amount: e.target.value}))
                    }
                    required
                    className="pl-7 bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-pink-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-muted-foreground text-sm font-medium block mb-1.5">
                  Fecha
                </label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) =>
                    setForm((f) => ({...f, date: e.target.value}))
                  }
                  required
                  className="bg-background border-border text-foreground focus:border-pink-500"
                />
              </div>
            </div>

            {/* Descripción */}
            <div>
              <label className="text-muted-foreground text-sm font-medium block mb-1.5">
                Descripción{" "}
                <span className="text-muted-foreground font-normal">(opcional)</span>
              </label>
              <textarea
                placeholder="Ingrese una nota o descripción..."
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({...f, description: e.target.value}))
                }
                rows={2}
                className="w-full px-3 py-2 bg-background border border-border text-foreground placeholder:text-muted-foreground rounded-md text-sm focus:outline-none focus:border-pink-500 resize-none"
              />
            </div>

            {formError && (
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {formError}
              </div>
            )}

            {/* Acciones */}
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
                className="bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white min-w-[120px]"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Guardando...
                  </span>
                ) : editItem ? (
                  "Guardar cambios"
                ) : (
                  "Registrar donación"
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
          <div className="mt-3 text-muted-foreground text-sm">
            ¿Estás seguro de que deseas eliminar esta donación de{" "}
            <span className="text-foreground font-semibold">
              {fmtMoney(deleteTarget?.amount)}
            </span>
            ? Esta acción no se puede deshacer.
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button
              type="button"
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
