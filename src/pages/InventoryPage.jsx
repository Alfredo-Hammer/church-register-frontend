import {useCallback, useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import {Card, CardContent} from "@/components/ui/Card";
import {Button} from "@/components/ui/Button";
import {Input} from "@/components/ui/Input";
import {ConfirmDialog} from "@/components/ui/ConfirmDialog";
import {cn} from "@/lib/utils";
import {useAuth} from "@/contexts/AuthContext";
import {inventoryService, settingsService} from "@/services/api";
import {buildInventoryReport} from "@/utils/reportPrint";
import {
  CONDITIONS,
  CONDITION_MAP,
  $m,
  Pager,
  ItemModal,
} from "@/pages/InventoryShared";
import {
  Boxes,
  Plus,
  Search,
  Edit2,
  Trash2,
  Package,
  AlertTriangle,
  DollarSign,
  ChevronDown,
  X,
  MapPin,
  Printer,
} from "lucide-react";

export default function InventoryPage() {
  const {user} = useAuth();
  const navigate = useNavigate();
  const canEdit = ["ADMIN", "PASTOR", "LIDER"].includes(user?.role);
  const canDelete = ["ADMIN", "PASTOR"].includes(user?.role);

  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({limit: 20, offset: 0, total: 0});
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [condition, setCondition] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [church, setChurch] = useState({});
  const [categories, setCategories] = useState([]);
  const [exporting, setExporting] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    settingsService.getChurch().then((r) => setChurch(r.church || r || {})).catch(() => {});
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const r = await inventoryService.getCategories();
      setCategories(r.categories || []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  const queryFilters = () => {
    const params = {};
    if (search) params.search = search;
    if (categoryId) params.categoryId = categoryId;
    if (condition) params.condition = condition;
    if (lowStockOnly) params.lowStock = "true";
    return params;
  };

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = {...queryFilters(), limit: pagination.limit, offset: pagination.offset};
      const r = await inventoryService.getAll(params);
      setItems(r.items || []);
      setPagination((p) => ({...p, total: r.total ?? 0}));
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, pagination.offset, search, categoryId, condition, lowStockOnly]);

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
  }, [search, categoryId, condition, lowStockOnly]);

  const handleSaved = () => {
    loadItems();
    loadStats();
    loadCategories();
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

  // Exporta TODO lo que cumple el filtro actual (no solo la página visible)
  // — mismo enfoque que el CSV de Finanzas, para que el PDF no quede corto
  // si el inventario tiene más ítems que el tamaño de página.
  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const r = await inventoryService.getAll({...queryFilters(), limit: 2000, offset: 0});
      const html = buildInventoryReport(r.items || [], church, {
        title: search || categoryId || condition || lowStockOnly ? "Reporte de Inventario (filtrado)" : "Reporte de Inventario",
      });
      const win = window.open("", "_blank", "width=960,height=720");
      win.document.write(html);
      win.document.close();
    } catch {
      /* ignore */
    } finally {
      setExporting(false);
    }
  };

  const hasFilters = search || categoryId || condition || lowStockOnly;

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

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              onClick={handleExportPDF}
              disabled={exporting}
              className="border-border text-muted-foreground hover:text-foreground gap-2"
            >
              <Printer className="w-4 h-4" /> {exporting ? "Generando…" : "Exportar PDF"}
            </Button>
            {canEdit && (
              <Button
                onClick={() => { setEditItem(null); setModalOpen(true); }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
              >
                <Plus className="w-4 h-4" /> Nuevo ítem
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, código, ubicación o notas…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-indigo-500"
          />
        </div>
        <div className="relative">
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="h-10 px-3 pr-8 bg-card border border-border text-foreground rounded-md text-sm focus:outline-none focus:border-indigo-500 appearance-none"
          >
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
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
            onClick={() => { setSearch(""); setCategoryId(""); setCondition(""); setLowStockOnly(false); }}
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
                      <tr
                        key={it.id}
                        onClick={() => navigate(`/dashboard/inventory/${it.id}`)}
                        className="hover:bg-muted/50 transition-colors cursor-pointer"
                      >
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
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-foreground font-medium">{it.name}</p>
                            {it.code && (
                              <span className="text-[11px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                {it.code}
                              </span>
                            )}
                          </div>
                          {it.notes && <p className="text-xs text-muted-foreground truncate max-w-xs">{it.notes}</p>}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{it.category_name || "Sin categoría"}</td>
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
                                onClick={(e) => { e.stopPropagation(); setEditItem(it); setModalOpen(true); }}
                                className="w-7 h-7 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-400 flex items-center justify-center"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setDeleteTarget(it); }}
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
