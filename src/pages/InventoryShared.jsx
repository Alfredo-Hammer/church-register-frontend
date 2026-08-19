import {useEffect, useRef, useState} from "react";
import {Button} from "@/components/ui/Button";
import {Input} from "@/components/ui/Input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/Dialog";
import {inventoryService} from "@/services/api";
import {AlertTriangle, ImagePlus, ChevronLeft, ChevronRight, X as XIcon, Plus as PlusIcon} from "lucide-react";

// Piezas compartidas entre InventoryPage (listado) e InventoryDetailPage
// (ficha de un ítem) — así el modal de crear/editar y las etiquetas de
// estado no se duplican entre las dos páginas. Las categorías ya NO son
// una lista fija: cada iglesia tiene las suyas (tabla inventory_categories,
// mismo patrón que finance_categories), sembradas con 10 valores de
// partida al registrar la iglesia pero editables/ampliables libremente.

export const CONDITIONS = [
  {value: "BUENO", label: "Bueno", classes: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"},
  {value: "REGULAR", label: "Regular", classes: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"},
  {value: "MALO", label: "Malo", classes: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30"},
  {value: "DANADO", label: "Dañado", classes: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30"},
];
export const CONDITION_MAP = Object.fromEntries(CONDITIONS.map((c) => [c.value, c]));

export const $m = (n) => new Intl.NumberFormat("es", {style: "currency", currency: "USD", minimumFractionDigits: 2}).format(n ?? 0);
export const fmtDate = (d) => (d ? new Date(d.slice(0, 10) + "T12:00:00").toLocaleDateString("es", {day: "2-digit", month: "short", year: "numeric"}) : "—");

const emptyForm = () => ({
  name: "",
  code: "",
  categoryId: "",
  quantity: "1",
  unit: "unidad",
  location: "",
  condition: "BUENO",
  minStock: "",
  acquisitionDate: "",
  value: "",
  notes: "",
});

export function Pager({pagination, onChange}) {
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

export function PhotoUploader({preview, onChange, onRemove}) {
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

export function ItemModal({open, onClose, item, onSaved}) {
  const [form, setForm] = useState(emptyForm());
  const [photo, setPhoto] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState([]);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);

  useEffect(() => {
    if (!open) return;
    inventoryService.getCategories().then((r) => setCategories(r.categories || [])).catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (item) {
      setForm({
        name: item.name || "",
        code: item.code || "",
        categoryId: item.category_id || "",
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
    setAddingCategory(false);
    setNewCategoryName("");
  }, [open, item]);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    setCreatingCategory(true);
    setError("");
    try {
      const r = await inventoryService.createCategory(newCategoryName.trim());
      setCategories((prev) => [...prev, r.category].sort((a, b) => a.name.localeCompare(b.name)));
      setForm((f) => ({...f, categoryId: r.category.id}));
      setAddingCategory(false);
      setNewCategoryName("");
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo crear la categoría.");
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setError("El nombre es obligatorio.");
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim(),
        categoryId: form.categoryId || null,
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

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Nombre *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({...f, name: e.target.value}))}
                placeholder="Ej: Micrófono inalámbrico"
                className="bg-background border-border text-foreground"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Código</label>
              <Input
                value={form.code}
                onChange={(e) => setForm((f) => ({...f, code: e.target.value}))}
                placeholder={item ? "" : "Auto"}
                className="bg-background border-border text-foreground font-mono text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Categoría</label>
              {addingCategory ? (
                <div className="flex items-center gap-1.5">
                  <Input
                    autoFocus
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); handleCreateCategory(); }
                      if (e.key === "Escape") { setAddingCategory(false); setNewCategoryName(""); }
                    }}
                    placeholder="Nombre de la categoría"
                    className="bg-background border-border text-foreground h-10"
                  />
                  <button
                    type="button"
                    onClick={handleCreateCategory}
                    disabled={creatingCategory || !newCategoryName.trim()}
                    className="h-10 px-3 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-50 shrink-0"
                  >
                    {creatingCategory ? "…" : "Crear"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAddingCategory(false); setNewCategoryName(""); }}
                    className="h-10 w-10 rounded-md border border-border text-muted-foreground hover:text-foreground flex items-center justify-center shrink-0"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <select
                    value={form.categoryId}
                    onChange={(e) => setForm((f) => ({...f, categoryId: e.target.value}))}
                    className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Sin categoría</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setAddingCategory(true)}
                    title="Nueva categoría"
                    className="h-10 w-10 rounded-md border border-border text-muted-foreground hover:text-indigo-700 dark:hover:text-indigo-400 hover:border-indigo-500/40 flex items-center justify-center shrink-0 transition-colors"
                  >
                    <PlusIcon className="w-4 h-4" />
                  </button>
                </div>
              )}
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
