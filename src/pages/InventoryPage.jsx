import {useCallback, useEffect, useRef, useState} from "react";
import {Card, CardContent} from "@/components/ui/Card";
import {Button} from "@/components/ui/Button";
import {Input} from "@/components/ui/Input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/Dialog";
import {ConfirmDialog} from "@/components/ui/ConfirmDialog";
import {cn} from "@/lib/utils";
import {useAuth} from "@/contexts/AuthContext";
import {inventoryService} from "@/services/api";
import {
  Boxes,
  Plus,
  Search,
  Edit2,
  Trash2,
  Package,
  AlertTriangle,
  DollarSign,
  ImagePlus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  MapPin,
} from "lucide-react";

const CATEGORIES = [
  {value: "SONIDO_AUDIO", label: "Sonido y Audio"},
  {value: "INSTRUMENTOS", label: "Instrumentos Musicales"},
  {value: "MOBILIARIO", label: "Mobiliario"},
  {value: "COCINA", label: "Cocina"},
  {value: "LIMPIEZA", label: "Limpieza"},
  {value: "OFICINA", label: "Oficina"},
  {value: "DECORACION", label: "Decoración"},
  {value: "ELECTRONICA", label: "Electrónica"},
  {value: "NINOS", label: "Niños / Escuela Dominical"},
  {value: "OTRO", label: "Otro"},
];
const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label]));

const CONDITIONS = [
  {value: "BUENO", label: "Bueno", classes: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"},
  {value: "REGULAR", label: "Regular", classes: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"},
  {value: "MALO", label: "Malo", classes: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30"},
  {value: "DANADO", label: "Dañado", classes: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30"},
];
const CONDITION_MAP = Object.fromEntries(CONDITIONS.map((c) => [c.value, c]));

const $m = (n) => new Intl.NumberFormat("es", {style: "currency", currency: "USD", minimumFractionDigits: 2}).format(n ?? 0);
const fmtDate = (d) => (d ? new Date(d.slice(0, 10) + "T12:00:00").toLocaleDateString("es", {day: "2-digit", month: "short", year: "numeric"}) : "—");

const emptyForm = () => ({
  name: "",
  category: "OTRO",
  quantity: "1",
  unit: "unidad",
  location: "",
  condition: "BUENO",
  minStock: "",
  acquisitionDate: "",
  value: "",
  notes: "",
});

function Pager({pagination, onChange}) {
  const {limit, offset, total} = pagination;
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border">
      <p className="text-sm text-muted-foreground">
        Página {currentPage} de {totalPages} · {total} en total
      </p>
      <div className="flex gap-2">
        <Button
          onClick={() => onChange(Math.max(0, offset - limit))}
          disabled={currentPage === 1}
          variant="outline"
          size="sm"
          className="bg-secondary border-border text-foreground hover:bg-accent"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button
          onClick={() => onChange(offset + limit)}
          disabled={currentPage === totalPages}
          variant="outline"
          size="sm"
          className="bg-secondary border-border text-foreground hover:bg-accent"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function PhotoUploader({preview, onChange, onRemove}) {
  const ref = useRef();
  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return alert("Solo imágenes.");
    if (file.size > 2 * 1024 * 1024) return alert("Máximo 2MB.");
    const reader = new FileReader();
    reader.onload = (ev) => onChange(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  };
  return (
    <div className="flex items-center gap-4">
      <div
        onClick={() => ref.current?.click()}
        className="w-16 h-16 rounded-xl overflow-hidden bg-muted border-2 border-dashed border-border hover:border-indigo-500 cursor-pointer flex items-center justify-center transition-colors shrink-0"
      >
        {preview ? (
          <img src={preview} alt="preview" className="w-full h-full object-cover" />
        ) : (
          <ImagePlus className="w-6 h-6 text-muted-foreground" />
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="text-xs text-indigo-700 dark:text-indigo-400 hover:underline font-medium text-left"
        >
          {preview ? "Cambiar foto" : "Subir foto (opcional)"}
        </button>
        {preview && (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-red-700 dark:text-red-400 hover:underline font-medium text-left"
          >
            Quitar foto
          </button>
        )}
        <p className="text-xs text-muted-foreground">PNG, JPG — máx. 2MB</p>
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

function ItemModal({open, onClose, item, onSaved}) {
  const [form, setForm] = useState(emptyForm());
  const [photo, setPhoto] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    if (item) {
      setForm({
        name: item.name || "",
        category: item.category || "OTRO",
        quantity: String(item.quantity ?? 1),
        unit: item.unit || "unidad",
        location: item.location || "",
        condition: item.condition || "BUENO",
        minStock: item.min_stock != null ? String(item.min_stock) : "",
        acquisitionDate: item.acquisition_date ? item.acquisition_date.slice(0, 10) : "",
        value: item.value != null ? String(item.value) : "",
        notes: item.notes || "",
      });
      setPhoto(item.photo_url || null);
    } else {
      setForm(emptyForm());
      setPhoto(null);
    }
    setError("");
  }, [open, item]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setError("El nombre es obligatorio.");
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category,
        quantity: form.quantity === "" ? 0 : Number(form.quantity),
        unit: form.unit.trim() || "unidad",
        location: form.location.trim() || null,
        condition: form.condition,
        minStock: form.minStock === "" ? null : Number(form.minStock),
        acquisitionDate: form.acquisitionDate || null,
        value: form.value === "" ? null : Number(form.value),
        notes: form.notes.trim() || null,
      };
      let saved;
      if (item) {
        const r = await inventoryService.update(item.id, payload);
        saved = r.item;
      } else {
        const r = await inventoryService.create(payload);
        saved = r.item;
      }
      const originalPhoto = item?.photo_url || null;
      if (photo !== originalPhoto) {
        if (photo) {
          const pr = await inventoryService.uploadPhoto(saved.id, photo);
          saved = {...saved, photo_url: pr.photoUrl};
        } else {
          await inventoryService.deletePhoto(saved.id);
          saved = {...saved, photo_url: null};
        }
      }
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo guardar el ítem.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg" onClose={onClose}>
        <DialogHeader>
          <DialogTitle>{item ? "Editar ítem" : "Nuevo ítem"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <PhotoUploader preview={photo} onChange={setPhoto} onRemove={() => setPhoto(null)} />

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Nombre *</label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({...f, name: e.target.value}))}
              placeholder="Ej: Micrófono inalámbrico"
              className="bg-background border-border text-foreground"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Categoría</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({...f, category: e.target.value}))}
                className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Estado</label>
              <select
                value={form.condition}
                onChange={(e) => setForm((f) => ({...f, condition: e.target.value}))}
                className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {CONDITIONS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Cantidad</label>
              <Input
                type="number" min="0" step="1"
                value={form.quantity}
                onChange={(e) => setForm((f) => ({...f, quantity: e.target.value}))}
                className="bg-background border-border text-foreground"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Unidad</label>
              <Input
                value={form.unit}
                onChange={(e) => setForm((f) => ({...f, unit: e.target.value}))}
                placeholder="unidad, caja…"
                className="bg-background border-border text-foreground"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Alerta stock</label>
              <Input
                type="number" min="0" step="1"
                value={form.minStock}
                onChange={(e) => setForm((f) => ({...f, minStock: e.target.value}))}
                placeholder="Opcional"
                className="bg-background border-border text-foreground"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Ubicación</label>
            <Input
              value={form.location}
              onChange={(e) => setForm((f) => ({...f, location: e.target.value}))}
              placeholder="Ej: Bodega, Salón de niños…"
              className="bg-background border-border text-foreground"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Fecha de adquisición</label>
              <Input
                type="date"
                value={form.acquisitionDate}
                onChange={(e) => setForm((f) => ({...f, acquisitionDate: e.target.value}))}
                className="bg-background border-border text-foreground"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Valor estimado</label>
              <Input
                type="number" min="0" step="0.01"
                value={form.value}
                onChange={(e) => setForm((f) => ({...f, value: e.target.value}))}
                placeholder="Opcional"
                className="bg-background border-border text-foreground"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Notas</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({...f, notes: e.target.value}))}
              rows={2}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving} className="border-border text-muted-foreground hover:text-foreground">
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {saving ? "Guardando…" : item ? "Guardar cambios" : "Crear ítem"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function InventoryPage() {
  const {user} = useAuth();
  const canEdit = ["ADMIN", "PASTOR", "LIDER"].includes(user?.role);
  const canDelete = ["ADMIN", "PASTOR"].includes(user?.role);

  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({limit: 20, offset: 0, total: 0});
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = {limit: pagination.limit, offset: pagination.offset};
      if (search) params.search = search;
      if (category) params.category = category;
      if (condition) params.condition = condition;
      if (lowStockOnly) params.lowStock = "true";
      const r = await inventoryService.getAll(params);
      setItems(r.items || []);
      setPagination((p) => ({...p, total: r.total ?? 0}));
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, pagination.offset, search, category, condition, lowStockOnly]);

  const loadStats = useCallback(async () => {
    try {
      const r = await inventoryService.getStats();
      setStats(r);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => loadItems(), 300);
    return () => clearTimeout(t);
  }, [loadItems]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    setPagination((p) => (p.offset === 0 ? p : {...p, offset: 0}));
  }, [search, category, condition, lowStockOnly]);

  const handleSaved = () => {
    loadItems();
    loadStats();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await inventoryService.delete(deleteTarget.id);
      await loadItems();
      await loadStats();
    } catch (err) {
      alert(err.response?.data?.error || "No se pudo eliminar el ítem.");
    } finally {
      setDeleteTarget(null);
    }
  };

  const hasFilters = search || category || condition || lowStockOnly;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-border bg-gradient-to-br from-card via-card to-indigo-500/5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 p-5 md:p-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30 shrink-0">
                <Boxes size={19} />
              </div>
              <h1 className="text-2xl md:text-[1.75rem] font-bold tracking-tight text-foreground">Inventario</h1>
            </div>
            <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
              Equipo, mobiliario y suministros de tu iglesia en un solo lugar.
            </p>
            <div className="flex flex-wrap gap-2 mt-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-2.5 py-1.5">
                <Package size={12} /> {stats?.totalItems ?? "…"} ítems · {stats?.totalUnits ?? "…"} unidades
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-2.5 py-1.5">
                <DollarSign size={12} /> {stats ? $m(stats.totalValue) : "…"} en valor estimado
              </span>
              {stats?.lowStockCount > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 font-semibold text-amber-700 dark:text-amber-400">
                  <AlertTriangle size={12} /> {stats.lowStockCount} con stock bajo
                </span>
              )}
              {stats?.poorConditionCount > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 font-semibold text-red-700 dark:text-red-400">
                  <AlertTriangle size={12} /> {stats.poorConditionCount} en mal estado
                </span>
              )}
            </div>
          </div>

          {canEdit && (
            <Button
              onClick={() => { setEditItem(null); setModalOpen(true); }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" /> Nuevo ítem
            </Button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, ubicación o notas…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-indigo-500"
          />
        </div>
        <div className="relative">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-10 px-3 pr-8 bg-card border border-border text-foreground rounded-md text-sm focus:outline-none focus:border-indigo-500 appearance-none"
          >
            <option value="">Todas las categorías</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="h-10 px-3 pr-8 bg-card border border-border text-foreground rounded-md text-sm focus:outline-none focus:border-indigo-500 appearance-none"
          >
            <option value="">Todos los estados</option>
            {CONDITIONS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
        <button
          onClick={() => setLowStockOnly((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 px-3 h-10 rounded-md text-sm font-medium border transition-colors shrink-0",
            lowStockOnly
              ? "bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-400"
              : "border-border text-muted-foreground hover:text-foreground",
          )}
        >
          <AlertTriangle className="w-3.5 h-3.5" /> Stock bajo
        </button>
        {hasFilters && (
          <Button
            variant="outline"
            onClick={() => { setSearch(""); setCategory(""); setCondition(""); setLowStockOnly(false); }}
            className="border-border text-muted-foreground hover:text-foreground shrink-0"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Tabla */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Boxes className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-lg font-medium">
                {hasFilters ? "Sin resultados para este filtro" : "Aún no hay ítems en el inventario"}
              </p>
              {canEdit && !hasFilters && (
                <Button
                  onClick={() => { setEditItem(null); setModalOpen(true); }}
                  className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                >
                  <Plus className="w-4 h-4" /> Agregar el primero
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left">
                    {["", "Nombre", "Categoría", "Cantidad", "Ubicación", "Estado", "Valor", ""].map((h, i) => (
                      <th key={i} className={cn("px-4 py-3 text-muted-foreground text-xs font-semibold uppercase tracking-wider", i === 7 && "text-center")}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((it) => {
                    const isLow = it.min_stock != null && it.quantity <= it.min_stock;
                    const cond = CONDITION_MAP[it.condition];
                    return (
                      <tr key={it.id} className="hover:bg-muted/50 transition-colors">
                        <td className="pl-4 py-3">
                          {it.photo_url ? (
                            <img src={it.photo_url} alt={it.name} className="w-9 h-9 rounded-lg object-cover" />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                              <Package className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-foreground font-medium">{it.name}</p>
                          {it.notes && <p className="text-xs text-muted-foreground truncate max-w-xs">{it.notes}</p>}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{CATEGORY_LABEL[it.category] || it.category}</td>
                        <td className="px-4 py-3">
                          <span className={cn("text-sm font-medium", isLow ? "text-amber-700 dark:text-amber-400" : "text-foreground")}>
                            {it.quantity} {it.unit}
                          </span>
                          {isLow && (
                            <span className="ml-1.5 inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400">
                              <AlertTriangle className="w-3 h-3" /> bajo
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {it.location ? (
                            <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> {it.location}</span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium border", cond?.classes)}>
                            {cond?.label || it.condition}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">
                          {it.value != null ? $m(it.value) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            {canEdit && (
                              <button
                                onClick={() => { setEditItem(it); setModalOpen(true); }}
                                className="w-7 h-7 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-400 flex items-center justify-center"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => setDeleteTarget(it)}
                                className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-400 flex items-center justify-center"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <Pager pagination={pagination} onChange={(offset) => setPagination((p) => ({...p, offset}))} />
        </CardContent>
      </Card>

      <ItemModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditItem(null); }}
        item={editItem}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="¿Eliminar este ítem?"
        description={`"${deleteTarget?.name}" se eliminará del inventario. Esta acción no se puede deshacer.`}
        confirmLabel="Sí, eliminar"
        confirmingLabel="Eliminando…"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
