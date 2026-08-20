import {useCallback, useEffect, useState} from "react";
import {useParams, useNavigate} from "react-router-dom";
import {Button} from "@/components/ui/Button";
import {ConfirmDialog} from "@/components/ui/ConfirmDialog";
import {cn} from "@/lib/utils";
import {useAuth} from "@/contexts/AuthContext";
import {inventoryService, settingsService} from "@/services/api";
import {buildInventoryReport} from "@/utils/reportPrint";
import {
  CONDITION_MAP,
  $m,
  fmtDate,
  ItemModal,
} from "@/pages/InventoryShared";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Printer,
  Package,
  Boxes,
  MapPin,
  Calendar,
  DollarSign,
  AlertTriangle,
  StickyNote,
  Tag,
  Layers,
} from "lucide-react";

function Field({icon: Icon, label, value, valueClass}) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
        <Icon size={12} /> {label}
      </p>
      <p className={cn("text-base font-semibold text-foreground mt-1", valueClass)}>{value}</p>
    </div>
  );
}

export default function InventoryDetailPage() {
  const {id} = useParams();
  const navigate = useNavigate();
  const {user} = useAuth();
  const canEdit = ["ADMIN", "PASTOR", "LIDER"].includes(user?.role);
  const canDelete = ["ADMIN", "PASTOR"].includes(user?.role);

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [church, setChurch] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await inventoryService.getById(id);
      setItem(r.item);
    } catch {
      setError("No se pudo cargar este ítem.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    settingsService.getChurch().then((r) => setChurch(r.church || r || {})).catch(() => {});
  }, []);

  const handleDelete = async () => {
    try {
      await inventoryService.delete(id);
      navigate("/dashboard/inventory");
    } catch (err) {
      alert(err.response?.data?.error || "No se pudo eliminar el ítem.");
      setDeleteOpen(false);
    }
  };

  const handlePrint = () => {
    const html = buildInventoryReport([item], church, {title: item.name});
    const win = window.open("", "_blank", "width=960,height=720");
    win.document.write(html);
    win.document.close();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate("/dashboard/inventory")}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a Inventario
        </button>
        <div className="text-center py-16 text-muted-foreground bg-card border border-border rounded-2xl">
          <Package className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p>{error || "Ítem no encontrado."}</p>
        </div>
      </div>
    );
  }

  const isLow = item.min_stock != null && item.quantity <= item.min_stock;
  const cond = CONDITION_MAP[item.condition];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => navigate("/dashboard/inventory")}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a Inventario
        </button>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePrint} className="border-border text-muted-foreground hover:bg-accent gap-2">
            <Printer className="w-4 h-4" /> PDF
          </Button>
          {canEdit && (
            <Button onClick={() => setModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
              <Pencil className="w-4 h-4" /> Editar
            </Button>
          )}
          {canDelete && (
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(true)}
              className="border-red-800/60 text-red-700 dark:text-red-400 hover:bg-red-500/10 dark:bg-red-900/20 gap-2"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card shadow-[0_18px_45px_rgba(15,23,42,0.08)] overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-5">
          {/* Imagen grande — el panel ocupa toda la altura de la fila del
              grid (que la marca la columna de datos, a su derecha) en vez de
              forzarse a un cuadrado propio; object-contain solo evita el
              recorte, ya no deja tanto espacio muerto porque la caja que
              rellena es la real, no una impuesta. min-h-* es el respaldo en
              móvil, donde al ser una sola columna no hay fila que igualar. */}
          <div className="md:col-span-2 min-h-[320px] md:min-h-0 bg-gradient-to-br from-indigo-500/10 via-card to-violet-500/10 p-6 flex items-center justify-center border-b md:border-b-0 md:border-r border-border">
            {item.photo_url ? (
              <img
                src={item.photo_url}
                alt={item.name}
                className="w-full h-full object-contain rounded-2xl shadow-lg ring-1 ring-border bg-background/40"
              />
            ) : (
              <div className="w-full h-full rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg">
                <Boxes className="w-20 h-20 text-white/90" />
              </div>
            )}
          </div>

          {/* Datos */}
          <div className="md:col-span-3 p-6 md:p-8 flex flex-col">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{item.name}</h1>
                {item.code && (
                  <p className="text-xs font-mono text-muted-foreground mt-1">{item.code}</p>
                )}
              </div>
              <span className={cn("px-3 py-1.5 rounded-full text-xs font-semibold border shrink-0", cond?.classes)}>
                {cond?.label || item.condition}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground">
                <Tag size={12} /> {item.category_name || "Sin categoría"}
              </span>
              {isLow && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
                  <AlertTriangle size={12} /> Stock bajo
                </span>
              )}
            </div>

            <div className="h-px bg-border my-6" />

            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
              <Field
                icon={Layers}
                label="Cantidad"
                value={`${item.quantity} ${item.unit}`}
                valueClass={isLow ? "text-amber-700 dark:text-amber-400" : undefined}
              />
              <Field icon={MapPin} label="Ubicación" value={item.location || "—"} />
              <Field icon={DollarSign} label="Valor por unidad" value={item.value != null ? $m(item.value) : "—"} />
              <Field
                icon={DollarSign}
                label="Valor total"
                value={item.value != null ? $m(item.value * item.quantity) : "—"}
              />
              <Field icon={Calendar} label="Fecha de adquisición" value={fmtDate(item.acquisition_date)} />
              <Field
                icon={AlertTriangle}
                label="Alerta de stock mínimo"
                value={item.min_stock != null ? `${item.min_stock} ${item.unit}` : "No aplica"}
              />
            </div>

            {item.notes && (
              <>
                <div className="h-px bg-border my-6" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-2">
                    <StickyNote size={12} /> Notas
                  </p>
                  <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{item.notes}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <ItemModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        item={item}
        onSaved={(saved) => { setItem(saved); }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="¿Eliminar este ítem?"
        description={`"${item.name}" se eliminará del inventario. Esta acción no se puede deshacer.`}
        confirmLabel="Sí, eliminar"
        confirmingLabel="Eliminando…"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
