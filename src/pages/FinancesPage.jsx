import React, {useState, useEffect, useCallback, useRef} from "react";
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
  DollarSign,
  Plus,
  TrendingUp,
  TrendingDown,
  Wallet,
  Edit2,
  Trash2,
  Search,
  Filter,
  Tag,
  Calendar,
  Heart,
  Users,
  ChevronDown,
  AlertCircle,
  Download,
  X,
  BarChart3,
  Printer,
  Landmark,
  PiggyBank,
  ArrowLeftRight,
} from "lucide-react";
import {
  financesService,
  donationsService,
  membersService,
  settingsService,
} from "@/services/api";
import {buildFinancesReport} from "@/utils/reportPrint";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const $m = (v) =>
  "$" +
  Number(v || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtDate = (d) => {
  if (!d) return "—";
  const s = d.split("T")[0].split("-");
  return `${s[2]}/${s[1]}/${s[0]}`;
};

const today = () => new Date().toISOString().split("T")[0];

const exportCSV = (rows, cols, filename) => {
  const header = cols.map((c) => c.label).join(",");
  const body = rows
    .map((r) =>
      cols
        .map((c) => `"${(c.get(r) ?? "").toString().replace(/"/g, '""')}"`)
        .join(","),
    )
    .join("\n");
  const blob = new Blob([header + "\n" + body], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// ─── Donation types ───────────────────────────────────────────────────────────
const DON_TYPES = [
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
const DON_MAP = Object.fromEntries(DON_TYPES.map((t) => [t.value, t]));

// ─── Cuentas ──────────────────────────────────────────────────────────────────
const ACCOUNTS = [
  {
    value: "CHEQUE",
    label: "Cuenta de Cheque",
    shortLabel: "Cheque",
    icon: Landmark,
    cardBg:
      "bg-gradient-to-br from-blue-500/10 to-cyan-500/5 dark:from-blue-900/50 dark:to-cyan-950/50 border-blue-300 dark:border-blue-700/50",
    text: "text-blue-700 dark:text-blue-400",
    bg: "bg-blue-500/20",
    border: "border-blue-300 dark:border-blue-700/50",
  },
  {
    value: "AHORROS",
    label: "Cuenta de Ahorros",
    shortLabel: "Ahorros",
    icon: PiggyBank,
    cardBg:
      "bg-gradient-to-br from-amber-500/10 to-orange-500/5 dark:from-amber-900/50 dark:to-orange-950/50 border-amber-300 dark:border-amber-700/50",
    text: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-500/20",
    border: "border-amber-300 dark:border-amber-700/50",
  },
];
const ACCOUNT_MAP = Object.fromEntries(ACCOUNTS.map((a) => [a.value, a]));

// ─── Monthly SVG Chart ────────────────────────────────────────────────────────
function MonthlyChart({data}) {
  const [tip, setTip] = useState(null);
  if (!data || data.length === 0)
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        Sin datos suficientes para mostrar la gráfica
      </div>
    );

  const maxVal = Math.max(
    ...data.flatMap((d) => [d.ingresos, d.egresos, d.donaciones]),
    1,
  );
  const H = 160,
    W_BAR = 18,
    GAP = 6,
    GROUP_GAP = 20;
  const groupW = W_BAR * 3 + GAP * 2 + GROUP_GAP;
  const totalW = data.length * groupW;

  return (
    <div className="relative overflow-x-auto">
      <svg width={totalW} height={H + 36} className="min-w-full">
        {data.map((d, i) => {
          const x = i * groupW;
          const hI = (d.ingresos / maxVal) * H;
          const hE = (d.egresos / maxVal) * H;
          const hD = (d.donaciones / maxVal) * H;
          return (
            <g key={d.month}>
              {/* Ingresos */}
              <rect
                x={x}
                y={H - hI}
                width={W_BAR}
                height={hI || 1}
                rx={2}
                fill="#34d399"
                opacity={0.85}
                onMouseEnter={() =>
                  setTip({
                    label: d.label,
                    i: d.ingresos,
                    e: d.egresos,
                    don: d.donaciones,
                    x: x + W_BAR / 2,
                  })
                }
                onMouseLeave={() => setTip(null)}
                className="cursor-pointer hover:opacity-100"
              />
              {/* Egresos */}
              <rect
                x={x + W_BAR + GAP}
                y={H - hE}
                width={W_BAR}
                height={hE || 1}
                rx={2}
                fill="#f87171"
                opacity={0.85}
                onMouseEnter={() =>
                  setTip({
                    label: d.label,
                    i: d.ingresos,
                    e: d.egresos,
                    don: d.donaciones,
                    x: x + W_BAR * 1.5 + GAP,
                  })
                }
                onMouseLeave={() => setTip(null)}
                className="cursor-pointer hover:opacity-100"
              />
              {/* Donaciones */}
              <rect
                x={x + (W_BAR + GAP) * 2}
                y={H - hD}
                width={W_BAR}
                height={hD || 1}
                rx={2}
                fill="#a78bfa"
                opacity={0.85}
                onMouseEnter={() =>
                  setTip({
                    label: d.label,
                    i: d.ingresos,
                    e: d.egresos,
                    don: d.donaciones,
                    x: x + (W_BAR + GAP) * 2 + W_BAR / 2,
                  })
                }
                onMouseLeave={() => setTip(null)}
                className="cursor-pointer hover:opacity-100"
              />
              {/* Label */}
              <text
                x={x + groupW / 2 - GROUP_GAP / 2}
                y={H + 16}
                textAnchor="middle"
                fill="#94a3b8"
                fontSize={10}
              >
                {d.label}
              </text>
            </g>
          );
        })}
        {/* Baseline */}
        <line
          x1={0}
          y1={H}
          x2={totalW}
          y2={H}
          stroke="#334155"
          strokeWidth={1}
        />
        {/* Tooltip */}
        {tip && (
          <g>
            <rect
              x={tip.x - 54}
              y={10}
              width={108}
              height={64}
              rx={6}
              fill="#1e293b"
              stroke="#475569"
              strokeWidth={1}
            />
            <text
              x={tip.x}
              y={26}
              textAnchor="middle"
              fill="#e2e8f0"
              fontSize={10}
              fontWeight="600"
            >
              {tip.label}
            </text>
            <text
              x={tip.x}
              y={40}
              textAnchor="middle"
              fill="#34d399"
              fontSize={9}
            >
              Ingresos: {$m(tip.i)}
            </text>
            <text
              x={tip.x}
              y={52}
              textAnchor="middle"
              fill="#f87171"
              fontSize={9}
            >
              Egresos: {$m(tip.e)}
            </text>
            <text
              x={tip.x}
              y={64}
              textAnchor="middle"
              fill="#a78bfa"
              fontSize={9}
            >
              Donaciones: {$m(tip.don)}
            </text>
          </g>
        )}
      </svg>
      {/* Legend */}
      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-emerald-400 inline-block" />
          Ingresos
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-red-400 inline-block" />
          Egresos
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-violet-400 inline-block" />
          Donaciones
        </span>
      </div>
    </div>
  );
}

// ─── Category Modal ───────────────────────────────────────────────────────────
function CategoryModal({open, onClose, category, onSaved}) {
  const [form, setForm] = useState({name: "", type: "INGRESO"});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (open) {
      setForm(
        category
          ? {name: category.name, type: category.type}
          : {name: "", type: "INGRESO"},
      );
      setErr("");
    }
  }, [open, category]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setErr("El nombre es obligatorio.");
    setSaving(true);
    setErr("");
    try {
      if (category) await financesService.updateCategory(category.id, form);
      else await financesService.createCategory(form);
      onSaved();
      onClose();
    } catch (e) {
      setErr(e?.response?.data?.error || "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border max-w-md w-full">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-3">
            <span className="w-9 h-9 rounded-lg bg-emerald-600/30 flex items-center justify-center">
              <Tag className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            </span>
            {category ? "Editar Categoría" : "Nueva Categoría"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="text-muted-foreground text-sm font-medium block mb-1.5">
              Nombre *
            </label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({...f, name: e.target.value}))}
              placeholder="Ej: Diezmos, Ofrendas, Servicios..."
              required
              className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-muted-foreground text-sm font-medium block mb-2">
              Tipo *
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  v: "INGRESO",
                  l: "Ingreso",
                  icon: TrendingUp,
                  cls: "text-emerald-700 dark:text-emerald-300 border-emerald-500 bg-emerald-600/20",
                },
                {
                  v: "EGRESO",
                  l: "Egreso",
                  icon: TrendingDown,
                  cls: "text-red-700 dark:text-red-300 border-red-500 bg-red-600/20",
                },
              ].map(({v, l, icon: Icon, cls}) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setForm((f) => ({...f, type: v}))}
                  className={`py-3 px-4 rounded-lg border-2 transition font-medium flex flex-col items-center gap-1 text-sm
                    ${form.type === v ? cls : "bg-muted/50 border-border text-muted-foreground hover:border-muted-foreground/40"}`}
                >
                  <Icon className="w-5 h-5" />
                  {l}
                </button>
              ))}
            </div>
          </div>
          {err && (
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {err}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white min-w-[120px]"
            >
              {saving
                ? "Guardando..."
                : category
                  ? "Guardar cambios"
                  : "Crear categoría"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Transaction Modal ────────────────────────────────────────────────────────
function TransactionModal({
  open,
  onClose,
  transaction,
  categories,
  defaultAccount,
  onSaved,
}) {
  const [form, setForm] = useState({
    categoryId: "",
    amount: "",
    date: today(),
    description: "",
    memberId: "",
    account: "CHEQUE",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [members, setMembers] = useState([]);
  const [memberSearch, setMemberSearch] = useState("");

  useEffect(() => {
    if (open) {
      setForm(
        transaction
          ? {
              categoryId: transaction.category_id,
              amount: transaction.amount,
              date: transaction.date.split("T")[0],
              description: transaction.description || "",
              memberId: transaction.member_id || "",
              account: transaction.account || "CHEQUE",
            }
          : {
              categoryId: "",
              amount: "",
              date: today(),
              description: "",
              memberId: "",
              account: defaultAccount || "CHEQUE",
            },
      );
      setErr("");
      setMemberSearch("");
    }
  }, [open, transaction, defaultAccount]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(
      async () => {
        const params = {status: "ACTIVO", limit: 20};
        if (memberSearch.trim()) params.search = memberSearch.trim();
        try {
          const r = await membersService.getAll(params);
          setMembers(r.members || []);
        } catch {}
      },
      memberSearch ? 250 : 0,
    );
    return () => clearTimeout(t);
  }, [memberSearch, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.categoryId) return setErr("Seleccione una categoría.");
    if (!form.amount || parseFloat(form.amount) <= 0)
      return setErr("El monto debe ser mayor a 0.");
    setSaving(true);
    setErr("");
    try {
      const payload = {
        categoryId: form.categoryId,
        amount: parseFloat(form.amount),
        date: form.date,
        description: form.description || undefined,
        memberId: form.memberId || undefined,
        account: form.account,
      };
      if (transaction)
        await financesService.updateTransaction(transaction.id, payload);
      else await financesService.createTransaction(payload);
      onSaved();
      onClose();
    } catch (e) {
      setErr(e?.response?.data?.error || "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const selCat = categories.find((c) => c.id === form.categoryId);
  const ingresosCats = categories.filter((c) => c.type === "INGRESO");
  const egresosCats = categories.filter((c) => c.type === "EGRESO");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border max-w-2xl w-full">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-3 text-xl">
            <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-600 to-green-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-white" />
            </span>
            {transaction ? "Editar Transacción" : "Nueva Transacción"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Categoría */}
            <div className="sm:col-span-2">
              <label className="text-muted-foreground text-sm font-medium block mb-1.5">
                Categoría *
              </label>
              <div className="relative">
                <select
                  value={form.categoryId}
                  onChange={(e) =>
                    setForm((f) => ({...f, categoryId: e.target.value}))
                  }
                  required
                  className="w-full px-3 py-2 pr-8 bg-background border border-border text-foreground rounded-md text-sm focus:outline-none focus:border-emerald-500 appearance-none"
                >
                  <option value="">— Seleccione una categoría —</option>
                  {ingresosCats.length > 0 && (
                    <optgroup label="Ingresos">
                      {ingresosCats.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {egresosCats.length > 0 && (
                    <optgroup label="Egresos">
                      {egresosCats.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
              {selCat && (
                <p
                  className={`mt-1 text-xs font-medium ${selCat.type === "INGRESO" ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}
                >
                  {selCat.type === "INGRESO" ? "↑ Ingreso" : "↓ Egreso"}
                </p>
              )}
            </div>
            {/* Monto */}
            <div>
              <label className="text-muted-foreground text-sm font-medium block mb-1.5">
                Monto *
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
                  className="pl-7 bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-emerald-500"
                />
              </div>
            </div>
            {/* Fecha */}
            <div>
              <label className="text-muted-foreground text-sm font-medium block mb-1.5">
                Fecha *
              </label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({...f, date: e.target.value}))}
                required
                className="bg-background border-border text-foreground focus:border-emerald-500"
              />
            </div>
            {/* Cuenta */}
            <div className="sm:col-span-2">
              <label className="text-muted-foreground text-sm font-medium block mb-1.5">
                Cuenta *
              </label>
              <div className="grid grid-cols-2 gap-3">
                {ACCOUNTS.map((a) => (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => setForm((f) => ({...f, account: a.value}))}
                    className={`py-2.5 px-3 rounded-lg border-2 transition font-medium flex items-center justify-center gap-2 text-sm
                      ${
                        form.account === a.value
                          ? `${a.text} ${a.border} ${a.bg}`
                          : "bg-muted/50 border-border text-muted-foreground hover:border-muted-foreground/40"
                      }`}
                  >
                    <a.icon className="w-4 h-4" />
                    {a.shortLabel}
                  </button>
                ))}
              </div>
            </div>
            {/* Miembro */}
            <div className="sm:col-span-2">
              <label className="text-muted-foreground text-sm font-medium block mb-1.5">
                Miembro{" "}
                <span className="text-muted-foreground font-normal">(opcional)</span>
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar miembro..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="pl-8 bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-emerald-500"
                  />
                </div>
                {form.memberId && (
                  <button
                    type="button"
                    onClick={() => {
                      setForm((f) => ({...f, memberId: ""}));
                      setMemberSearch("");
                    }}
                    className="px-2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {memberSearch && (
                <div className="mt-1 bg-background border border-border rounded-lg overflow-hidden max-h-36 overflow-y-auto">
                  {members.length === 0 ? (
                    <p className="px-3 py-2 text-muted-foreground text-sm">
                      Sin resultados
                    </p>
                  ) : (
                    members.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setForm((f) => ({...f, memberId: m.id}));
                          setMemberSearch(`${m.first_name} ${m.last_name}`);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${form.memberId === m.id ? "bg-background text-emerald-700 dark:text-emerald-400" : "text-foreground"}`}
                      >
                        {m.first_name} {m.last_name}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {/* Descripción */}
            <div className="sm:col-span-2">
              <label className="text-muted-foreground text-sm font-medium block mb-1.5">
                Descripción{" "}
                <span className="text-muted-foreground font-normal">(opcional)</span>
              </label>
              <textarea
                rows={2}
                placeholder="Notas o detalles..."
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({...f, description: e.target.value}))
                }
                className="w-full px-3 py-2 bg-background border border-border text-foreground placeholder:text-muted-foreground rounded-md text-sm focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>
          </div>
          {err && (
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {err}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white min-w-[120px]"
            >
              {saving
                ? "Guardando..."
                : transaction
                  ? "Guardar cambios"
                  : "Registrar transacción"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Transfer Modal ───────────────────────────────────────────────────────────
function TransferModal({open, onClose, defaultFromAccount, onSaved}) {
  const [form, setForm] = useState({
    fromAccount: "CHEQUE",
    toAccount: "AHORROS",
    amount: "",
    date: today(),
    description: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (open) {
      const from = defaultFromAccount || "CHEQUE";
      const to = ACCOUNTS.find((a) => a.value !== from)?.value || "AHORROS";
      setForm({
        fromAccount: from,
        toAccount: to,
        amount: "",
        date: today(),
        description: "",
      });
      setErr("");
    }
  }, [open, defaultFromAccount]);

  const swapAccounts = () =>
    setForm((f) => ({...f, fromAccount: f.toAccount, toAccount: f.fromAccount}));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0)
      return setErr("El monto debe ser mayor a 0.");
    if (form.fromAccount === form.toAccount)
      return setErr("La cuenta de origen y destino deben ser distintas.");
    setSaving(true);
    setErr("");
    try {
      await financesService.createTransfer({
        fromAccount: form.fromAccount,
        toAccount: form.toAccount,
        amount: parseFloat(form.amount),
        date: form.date,
        description: form.description || undefined,
      });
      onSaved();
      onClose();
    } catch (e) {
      setErr(e?.response?.data?.error || "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border max-w-md w-full">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-3">
            <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <ArrowLeftRight className="w-4 h-4 text-white" />
            </span>
            Nueva Transferencia
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="text-muted-foreground text-sm font-medium block mb-1.5">
                Desde
              </label>
              <div className="relative">
                <select
                  value={form.fromAccount}
                  onChange={(e) =>
                    setForm((f) => ({...f, fromAccount: e.target.value}))
                  }
                  className="w-full px-3 py-2 pr-8 bg-background border border-border text-foreground rounded-md text-sm focus:outline-none focus:border-violet-500 appearance-none"
                >
                  {ACCOUNTS.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <button
              type="button"
              onClick={swapAccounts}
              className="p-2 mb-0.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="Invertir cuentas"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
            <div className="flex-1">
              <label className="text-muted-foreground text-sm font-medium block mb-1.5">
                Hacia
              </label>
              <div className="relative">
                <select
                  value={form.toAccount}
                  onChange={(e) =>
                    setForm((f) => ({...f, toAccount: e.target.value}))
                  }
                  className="w-full px-3 py-2 pr-8 bg-background border border-border text-foreground rounded-md text-sm focus:outline-none focus:border-violet-500 appearance-none"
                >
                  {ACCOUNTS.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>
          {form.fromAccount === form.toAccount && (
            <p className="text-amber-700 dark:text-amber-400 text-xs -mt-2">
              Elegí dos cuentas distintas.
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-muted-foreground text-sm font-medium block mb-1.5">
                Monto *
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
                  className="pl-7 bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-violet-500"
                />
              </div>
            </div>
            <div>
              <label className="text-muted-foreground text-sm font-medium block mb-1.5">
                Fecha *
              </label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({...f, date: e.target.value}))}
                required
                className="bg-background border-border text-foreground focus:border-violet-500"
              />
            </div>
          </div>
          <div>
            <label className="text-muted-foreground text-sm font-medium block mb-1.5">
              Descripción{" "}
              <span className="text-muted-foreground font-normal">(opcional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Motivo de la transferencia..."
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({...f, description: e.target.value}))
              }
              className="w-full px-3 py-2 bg-background border border-border text-foreground placeholder:text-muted-foreground rounded-md text-sm focus:outline-none focus:border-violet-500 resize-none"
            />
          </div>
          {err && (
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {err}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving || form.fromAccount === form.toAccount}
              className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white min-w-[120px]"
            >
              {saving ? "Guardando..." : "Transferir"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Donation Modal ───────────────────────────────────────────────────────────
function DonationModal({open, onClose, donation, onSaved}) {
  const [form, setForm] = useState({
    memberId: "",
    amount: "",
    date: today(),
    type: "DIEZMO",
    description: "",
    isAnonymous: false,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [members, setMembers] = useState([]);
  const [memberSearch, setMemberSearch] = useState("");

  useEffect(() => {
    if (open) {
      setForm(
        donation
          ? {
              memberId: donation.member_id || "",
              amount: donation.amount || "",
              date: donation.date ? donation.date.split("T")[0] : today(),
              type: donation.type || "DIEZMO",
              description: donation.description || "",
              isAnonymous: donation.is_anonymous || false,
            }
          : {
              memberId: "",
              amount: "",
              date: today(),
              type: "DIEZMO",
              description: "",
              isAnonymous: false,
            },
      );
      setErr("");
      setMemberSearch("");
    }
  }, [open, donation]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(
      async () => {
        const params = {limit: 20};
        if (memberSearch.trim()) params.search = memberSearch.trim();
        try {
          const r = await membersService.getAll(params);
          setMembers(r.members || []);
        } catch {}
      },
      memberSearch ? 250 : 0,
    );
    return () => clearTimeout(t);
  }, [memberSearch, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0)
      return setErr("El monto debe ser mayor a 0.");
    if (!form.date) return setErr("La fecha es obligatoria.");
    if (!form.isAnonymous && !form.memberId)
      return setErr("Seleccione un miembro o marque como anónima.");
    setSaving(true);
    setErr("");
    try {
      const payload = {
        memberId: form.isAnonymous ? undefined : form.memberId || undefined,
        amount: parseFloat(form.amount),
        date: form.date,
        type: form.type,
        description: form.description || undefined,
        isAnonymous: form.isAnonymous,
      };
      if (donation) await donationsService.update(donation.id, payload);
      else await donationsService.create(payload);
      onSaved();
      onClose();
    } catch (e) {
      setErr(e?.response?.data?.error || "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border max-w-2xl w-full">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-3 text-xl">
            <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
              <Heart className="w-4 h-4 text-white" />
            </span>
            {donation ? "Editar Donación" : "Nueva Donación"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Tipo */}
          <div>
            <label className="text-muted-foreground text-sm font-medium block mb-2">
              Tipo de donación
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DON_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setForm((f) => ({...f, type: t.value}))}
                  className={`py-2.5 px-3 rounded-xl border text-sm font-medium transition-all
                    ${
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
                <span className="text-muted-foreground text-sm">Donación anónima</span>
              </label>
            </div>
            {!form.isAnonymous && (
              <>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Buscar miembro..."
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      className="pl-8 bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-pink-500"
                    />
                  </div>
                  {form.memberId && (
                    <button
                      type="button"
                      onClick={() => {
                        setForm((f) => ({...f, memberId: ""}));
                        setMemberSearch("");
                      }}
                      className="px-2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {memberSearch && (
                  <div className="mt-1 bg-background border border-border rounded-lg overflow-hidden max-h-36 overflow-y-auto">
                    {members.length === 0 ? (
                      <p className="px-3 py-2 text-muted-foreground text-sm">
                        Sin resultados
                      </p>
                    ) : (
                      members.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setForm((f) => ({...f, memberId: m.id}));
                            setMemberSearch(`${m.first_name} ${m.last_name}`);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${form.memberId === m.id ? "bg-background text-pink-700 dark:text-pink-400" : "text-foreground"}`}
                        >
                          {m.first_name} {m.last_name}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
            {form.isAnonymous && (
              <p className="text-muted-foreground text-sm italic">
                Se registrará como donación anónima.
              </p>
            )}
          </div>
          {/* Monto + Fecha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-muted-foreground text-sm font-medium block mb-1.5">
                Monto *
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
                Fecha *
              </label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({...f, date: e.target.value}))}
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
              rows={2}
              placeholder="Nota opcional..."
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({...f, description: e.target.value}))
              }
              className="w-full px-3 py-2 bg-background border border-border text-foreground placeholder:text-muted-foreground rounded-md text-sm focus:outline-none focus:border-pink-500 resize-none"
            />
          </div>
          {err && (
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {err}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white min-w-[120px]"
            >
              {saving
                ? "Guardando..."
                : donation
                  ? "Guardar cambios"
                  : "Registrar donación"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────
function ConfirmDialog({open, onClose, onConfirm, message}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border max-w-md w-full">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-3">
            <span className="w-9 h-9 rounded-lg bg-red-500/20 flex items-center justify-center">
              <Trash2 className="w-4 h-4 text-red-700 dark:text-red-400" />
            </span>
            Confirmar eliminación
          </DialogTitle>
        </DialogHeader>
        <p className="mt-3 text-muted-foreground text-sm">{message}</p>
        <div className="flex justify-end gap-3 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40"
          >
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Eliminar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Transactions Table (reutilizada por Transacciones y las pestañas de cuenta) ─
function TransactionsTable({transactions, showAccount, onEdit, onDelete}) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p className="text-lg font-medium">No hay transacciones</p>
      </div>
    );
  }
  const headers = [
    "Fecha",
    "Categoría",
    "Tipo",
    ...(showAccount ? ["Cuenta"] : []),
    "Monto",
    "Miembro",
    "Descripción",
    "",
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border text-left">
            {headers.map((h, i) => (
              <th
                key={i}
                className={`px-4 py-3 text-muted-foreground text-xs font-semibold uppercase tracking-wider ${i === headers.length - 1 ? "text-center" : ""}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {transactions.map((t) => (
            <tr key={t.id} className="hover:bg-muted/50 transition-colors">
              <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">
                {fmtDate(t.date)}
              </td>
              <td className="px-4 py-3 text-sm text-foreground">
                {t.category_name}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium border
                  ${t.category_type === "INGRESO" ? "bg-emerald-500/10 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border-emerald-700/50" : "bg-red-500/10 dark:bg-red-900/50 text-red-700 dark:text-red-300 border-red-700/50"}`}
                >
                  {t.category_type}
                </span>
              </td>
              {showAccount && (
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium border ${ACCOUNT_MAP[t.account]?.bg || "bg-muted"} ${ACCOUNT_MAP[t.account]?.text || "text-muted-foreground"} ${ACCOUNT_MAP[t.account]?.border || "border-border"}`}
                  >
                    {ACCOUNT_MAP[t.account]?.shortLabel || t.account}
                  </span>
                </td>
              )}
              <td
                className={`px-4 py-3 text-sm font-semibold whitespace-nowrap ${t.category_type === "INGRESO" ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}
              >
                {t.category_type === "INGRESO" ? "+" : "-"}
                {$m(t.amount)}
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {t.first_name ? (
                  `${t.first_name} ${t.last_name}`
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground max-w-xs truncate">
                {t.description || (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => onEdit(t)}
                    className="w-7 h-7 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-400 hover:text-blue-700 dark:text-blue-300 flex items-center justify-center"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete(t)}
                    className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-400 hover:text-red-700 dark:text-red-300 flex items-center justify-center"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Account Tab (Cheque / Ahorros) ─────────────────────────────────────────────
function AccountTabContent({
  accountInfo,
  balance,
  summary,
  monthly,
  transactions,
  transfers,
  loading,
  onEditTransaction,
  onDeleteTransaction,
  onDeleteTransfer,
}) {
  const Icon = accountInfo.icon;
  const bal = balance?.balance ?? 0;
  return (
    <div className="space-y-4">
      {/* Saldo actual */}
      <Card className={accountInfo.cardBg}>
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <p className={`${accountInfo.text} text-sm font-medium`}>
              Saldo actual — {accountInfo.label}
            </p>
            <p className="text-3xl font-bold text-foreground mt-1">
              {loading ? "…" : $m(bal)}
            </p>
          </div>
          <div
            className={`w-14 h-14 ${accountInfo.bg} rounded-xl flex items-center justify-center`}
          >
            <Icon className={`w-7 h-7 ${accountInfo.text}`} />
          </div>
        </CardContent>
      </Card>

      {/* Resumen del período (últimos 6 meses, igual que Resumen general) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-emerald-700 dark:text-emerald-300 text-xs font-medium">
              Ingresos (período)
            </p>
            <p className="text-xl font-bold text-foreground mt-1">
              {$m(summary?.totalIngresos)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-red-700 dark:text-red-300 text-xs font-medium">
              Egresos (período)
            </p>
            <p className="text-xl font-bold text-foreground mt-1">
              {$m(summary?.totalEgresos)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs font-medium">
              Transferencias (neto)
            </p>
            <p className="text-xl font-bold text-foreground mt-1">
              {$m((balance?.transfersIn || 0) - (balance?.transfersOut || 0))}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-foreground flex items-center gap-2 text-base">
            <BarChart3 className={`w-4 h-4 ${accountInfo.text}`} />
            Actividad — últimos 6 meses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MonthlyChart data={monthly} />
        </CardContent>
      </Card>

      {/* Transferencias recientes */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-foreground flex items-center gap-2 text-base">
            <ArrowLeftRight className="w-4 h-4 text-violet-700 dark:text-violet-400" />
            Transferencias
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {transfers.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">
              Sin transferencias registradas
            </p>
          ) : (
            <div className="divide-y divide-border">
              {transfers.map((tr) => {
                const isIncoming = tr.to_account === accountInfo.value;
                return (
                  <div
                    key={tr.id}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div>
                      <p className="text-foreground text-sm font-medium">
                        {isIncoming
                          ? `Desde ${ACCOUNT_MAP[tr.from_account]?.shortLabel || tr.from_account}`
                          : `Hacia ${ACCOUNT_MAP[tr.to_account]?.shortLabel || tr.to_account}`}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {fmtDate(tr.date)}
                        {tr.description ? ` · ${tr.description}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-sm font-semibold ${isIncoming ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}
                      >
                        {isIncoming ? "+" : "-"}
                        {$m(tr.amount)}
                      </span>
                      <button
                        onClick={() => onDeleteTransfer(tr)}
                        className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-400 flex items-center justify-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transacciones de esta cuenta */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-foreground flex items-center gap-2 text-base">
            <DollarSign className={`w-4 h-4 ${accountInfo.text}`} />
            Transacciones de {accountInfo.shortLabel}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <TransactionsTable
            transactions={transactions}
            showAccount={false}
            onEdit={onEditTransaction}
            onDelete={onDeleteTransaction}
          />
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function FinancesPage() {
  const [tab, setTab] = useState("resumen");

  // Summary
  const [summary, setSummary] = useState({
    totalIngresos: 0,
    totalEgresos: 0,
    balance: 0,
  });
  const [summaryByCategory, setSummaryByCategory] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [donSummary, setDonSummary] = useState(null);
  const [church, setChurch] = useState({});

  useEffect(() => {
    settingsService
      .getChurch()
      .then((r) => setChurch(r.church || r || {}))
      .catch(() => {});
  }, []);

  const handlePrint = () => {
    const data = {summary, byCategory: summaryByCategory};
    const html = buildFinancesReport(
      data,
      {startDate: txFilters.startDate, endDate: txFilters.endDate},
      church,
    );
    const win = window.open("", "_blank", "width=960,height=720");
    win.document.write(html);
    win.document.close();
  };

  // Transactions
  const [transactions, setTransactions] = useState([]);
  const [txFilters, setTxFilters] = useState({
    type: "",
    categoryId: "",
    account: "",
    startDate: "",
    endDate: "",
    search: "",
  });
  const [txModal, setTxModal] = useState(false);
  const [editTx, setEditTx] = useState(null);
  const [delTx, setDelTx] = useState(null);

  // Donations
  const [donations, setDonations] = useState([]);
  const [donFilters, setDonFilters] = useState({
    type: "",
    startDate: "",
    endDate: "",
    search: "",
  });
  const [donModal, setDonModal] = useState(false);
  const [editDon, setEditDon] = useState(null);
  const [delDon, setDelDon] = useState(null);

  // Categories
  const [categories, setCategories] = useState([]);
  const [catSearch, setCatSearch] = useState("");
  const [catTypeFilter, setCatTypeFilter] = useState("");
  const [catModal, setCatModal] = useState(false);
  const [editCat, setEditCat] = useState(null);
  const [delCat, setDelCat] = useState(null);

  // Cuentas (Cheque/Ahorros)
  const [acctBalances, setAcctBalances] = useState({});
  const [acctData, setAcctData] = useState({
    CHEQUE: {summary: null, monthly: [], transactions: [], transfers: []},
    AHORROS: {summary: null, monthly: [], transactions: [], transfers: []},
  });
  const [acctLoading, setAcctLoading] = useState({CHEQUE: false, AHORROS: false});
  const [transferModal, setTransferModal] = useState(false);
  const [delTransfer, setDelTransfer] = useState(null);

  const [loading, setLoading] = useState(true);

  // ─── Load ────────────────────────────────────────────────────────────────
  const loadSummary = useCallback(async () => {
    try {
      const [s, m, ds] = await Promise.all([
        financesService.getSummary(),
        financesService.getMonthly({months: 6}),
        donationsService.getSummary(),
      ]);
      setSummary(s.summary || s);
      setSummaryByCategory(s.byCategory || []);
      setMonthly(m.months || []);
      setDonSummary(ds);
    } catch {}
  }, []);

  const loadTransactions = useCallback(async () => {
    try {
      const params = {limit: 200};
      if (txFilters.type) params.type = txFilters.type;
      if (txFilters.categoryId) params.categoryId = txFilters.categoryId;
      if (txFilters.account) params.account = txFilters.account;
      if (txFilters.startDate) params.startDate = txFilters.startDate;
      if (txFilters.endDate) params.endDate = txFilters.endDate;
      const r = await financesService.getTransactions(params);
      setTransactions(r.transactions || []);
    } catch {}
  }, [
    txFilters.type,
    txFilters.categoryId,
    txFilters.account,
    txFilters.startDate,
    txFilters.endDate,
  ]);

  const loadDonations = useCallback(async () => {
    try {
      const params = {limit: 200};
      if (donFilters.type) params.type = donFilters.type;
      if (donFilters.startDate) params.startDate = donFilters.startDate;
      if (donFilters.endDate) params.endDate = donFilters.endDate;
      const r = await donationsService.getAll(params);
      setDonations(r.donations || []);
    } catch {}
  }, [donFilters.type, donFilters.startDate, donFilters.endDate]);

  const loadCategories = useCallback(async () => {
    try {
      const r = await financesService.getAllCategories();
      setCategories(r.categories || []);
    } catch {}
  }, []);

  const loadAccountBalances = useCallback(async () => {
    try {
      const r = await financesService.getAccountBalances();
      setAcctBalances(r.accounts || {});
    } catch {}
  }, []);

  const loadAccountTab = useCallback(async (account) => {
    setAcctLoading((prev) => ({...prev, [account]: true}));
    try {
      const [balancesRes, s, m, txRes, trRes] = await Promise.all([
        financesService.getAccountBalances(),
        financesService.getSummary({account}),
        financesService.getMonthly({months: 6, account}),
        financesService.getTransactions({account, limit: 200}),
        financesService.getTransfers({account, limit: 50}),
      ]);
      setAcctBalances(balancesRes.accounts || {});
      setAcctData((prev) => ({
        ...prev,
        [account]: {
          summary: s.summary || s,
          monthly: m.months || [],
          transactions: txRes.transactions || [],
          transfers: trRes.transfers || [],
        },
      }));
    } catch {}
    setAcctLoading((prev) => ({...prev, [account]: false}));
  }, []);

  useEffect(() => {
    Promise.all([
      loadSummary(),
      loadTransactions(),
      loadDonations(),
      loadCategories(),
      loadAccountBalances(),
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);
  useEffect(() => {
    loadDonations();
  }, [loadDonations]);
  useEffect(() => {
    if (tab === "cheque") loadAccountTab("CHEQUE");
    else if (tab === "ahorros") loadAccountTab("AHORROS");
  }, [tab]);

  // ─── Filtered lists ──────────────────────────────────────────────────────
  const filteredTx = transactions.filter((t) => {
    if (txFilters.search) {
      const s = txFilters.search.toLowerCase();
      if (
        !(t.description && t.description.toLowerCase().includes(s)) &&
        !t.category_name.toLowerCase().includes(s) &&
        !(t.first_name && t.first_name.toLowerCase().includes(s)) &&
        !(t.last_name && t.last_name.toLowerCase().includes(s))
      )
        return false;
    }
    return true;
  });

  const filteredDon = donations.filter((d) => {
    if (!donFilters.search) return true;
    const s = donFilters.search.toLowerCase();
    const name = d.is_anonymous
      ? "anónimo"
      : `${d.first_name || ""} ${d.last_name || ""}`.toLowerCase();
    return name.includes(s) || (d.description || "").toLowerCase().includes(s);
  });

  const filteredCats = categories.filter((c) => {
    if (catTypeFilter && c.type !== catTypeFilter) return false;
    if (catSearch && !c.name.toLowerCase().includes(catSearch.toLowerCase()))
      return false;
    return true;
  });

  // ─── Delete handlers ─────────────────────────────────────────────────────
  const handleDelTx = async () => {
    if (!delTx) return;
    try {
      await financesService.deleteTransaction(delTx.id);
    } catch {}
    setDelTx(null);
    await Promise.all([loadTransactions(), loadSummary(), loadAccountBalances()]);
    if (tab === "cheque") loadAccountTab("CHEQUE");
    else if (tab === "ahorros") loadAccountTab("AHORROS");
  };

  const handleDelTransfer = async () => {
    if (!delTransfer) return;
    try {
      await financesService.deleteTransfer(delTransfer.id);
    } catch {}
    setDelTransfer(null);
    if (tab === "cheque") loadAccountTab("CHEQUE");
    else if (tab === "ahorros") loadAccountTab("AHORROS");
    else loadAccountBalances();
  };

  const handleDelDon = async () => {
    if (!delDon) return;
    try {
      await donationsService.delete(delDon.id);
    } catch {}
    setDelDon(null);
    await Promise.all([loadDonations(), loadSummary()]);
  };

  const handleDelCat = async () => {
    if (!delCat) return;
    try {
      await financesService.deleteCategory(delCat.id);
    } catch {}
    setDelCat(null);
    await loadCategories();
  };

  // ─── CSV Export ──────────────────────────────────────────────────────────
  const exportTxCSV = () =>
    exportCSV(
      filteredTx,
      [
        {label: "Fecha", get: (r) => fmtDate(r.date)},
        {label: "Categoría", get: (r) => r.category_name},
        {label: "Tipo", get: (r) => r.category_type},
        {label: "Monto", get: (r) => r.amount},
        {
          label: "Miembro",
          get: (r) => (r.first_name ? `${r.first_name} ${r.last_name}` : ""),
        },
        {label: "Descripción", get: (r) => r.description || ""},
      ],
      "transacciones.csv",
    );

  const exportDonCSV = () =>
    exportCSV(
      filteredDon,
      [
        {label: "Fecha", get: (r) => fmtDate(r.date)},
        {
          label: "Donante",
          get: (r) =>
            r.is_anonymous
              ? "Anónimo"
              : `${r.first_name || ""} ${r.last_name || ""}`,
        },
        {label: "Tipo", get: (r) => r.type},
        {label: "Monto", get: (r) => r.amount},
        {label: "Descripción", get: (r) => r.description || ""},
      ],
      "donaciones.csv",
    );

  // ─── Summary helpers ─────────────────────────────────────────────────────
  const getTypeSummary = (type) =>
    donSummary?.byType?.find((b) => b.type === type) || {total: 0, count: 0};

  const donTotal = donSummary?.summary?.total || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ─── Tabs config ─────────────────────────────────────────────────────────
  const TABS = [
    {id: "resumen", label: "Resumen"},
    {id: "cheque", label: "Cuenta de Cheque"},
    {id: "ahorros", label: "Cuenta de Ahorros"},
    {id: "transactions", label: "Transacciones"},
    {id: "donations", label: "Diezmos y Ofrendas"},
    {id: "categories", label: "Categorías"},
  ];
  const activeAccount = tab === "cheque" ? "CHEQUE" : tab === "ahorros" ? "AHORROS" : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </span>
            Finanzas
          </h1>
          <p className="text-muted-foreground mt-1">
            Control financiero, donaciones y categorías
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handlePrint}
            className="border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40 gap-2"
          >
            <Printer className="w-4 h-4" /> PDF
          </Button>
          {(tab === "transactions" || activeAccount) && (
            <Button
              onClick={() => {
                setEditTx(null);
                setTxModal(true);
              }}
              className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva Transacción
            </Button>
          )}
          {activeAccount && (
            <Button
              onClick={() => setTransferModal(true)}
              className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white"
            >
              <ArrowLeftRight className="w-4 h-4 mr-2" />
              Nueva Transferencia
            </Button>
          )}
          {tab === "donations" && (
            <Button
              onClick={() => {
                setEditDon(null);
                setDonModal(true);
              }}
              className="bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Registrar Donación
            </Button>
          )}
          {tab === "categories" && (
            <Button
              onClick={() => {
                setEditCat(null);
                setCatModal(true);
              }}
              className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva Categoría
            </Button>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 dark:from-emerald-900/50 dark:to-emerald-950/50 border-emerald-300 dark:border-emerald-700/50">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-emerald-700 dark:text-emerald-300 text-sm font-medium">
                Total Ingresos
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {$m(summary.totalIngresos)}
              </p>
            </div>
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-emerald-700 dark:text-emerald-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 dark:from-red-900/50 dark:to-red-950/50 border-red-300 dark:border-red-700/50">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-red-700 dark:text-red-300 text-sm font-medium">Total Egresos</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {$m(summary.totalEgresos)}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-red-700 dark:text-red-400" />
            </div>
          </CardContent>
        </Card>
        <Card
          className={`bg-gradient-to-br ${summary.balance >= 0 ? "from-green-500/10 to-green-500/5 dark:from-green-900/50 dark:to-green-950/50 border-green-300 dark:border-green-700/50" : "from-orange-500/10 to-orange-500/5 dark:from-orange-900/50 dark:to-orange-950/50 border-orange-300 dark:border-orange-700/50"}`}
        >
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p
                className={`text-sm font-medium ${summary.balance >= 0 ? "text-green-700 dark:text-green-300" : "text-orange-700 dark:text-orange-300"}`}
              >
                Balance
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {$m(summary.balance)}
              </p>
            </div>
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${summary.balance >= 0 ? "bg-green-500/20" : "bg-orange-500/20"}`}
            >
              <Wallet
                className={`w-6 h-6 ${summary.balance >= 0 ? "text-green-700 dark:text-green-400" : "text-orange-700 dark:text-orange-400"}`}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-pink-500/20 to-rose-600/10 border-pink-500/30">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-pink-700 dark:text-pink-300 text-sm font-medium">Donaciones</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {$m(donTotal)}
              </p>
              <p className="text-pink-700 dark:text-pink-400 text-xs mt-1">
                {donSummary?.summary?.count || 0} registros
              </p>
            </div>
            <div className="w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center">
              <Heart className="w-6 h-6 text-pink-700 dark:text-pink-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px
              ${tab === t.id ? "text-emerald-700 dark:text-emerald-400 border-emerald-400" : "text-muted-foreground border-transparent hover:text-foreground"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: RESUMEN ─────────────────────────────────────────────────────── */}
      {tab === "resumen" && (
        <div className="space-y-6">
          {/* Monthly chart */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-foreground flex items-center gap-2 text-base">
                <BarChart3 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                Actividad financiera — últimos 6 meses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MonthlyChart data={monthly} />
            </CardContent>
          </Card>

          {/* Donation type breakdown */}
          {donSummary?.byType && donSummary.byType.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-foreground flex items-center gap-2 text-base">
                  <Heart className="w-4 h-4 text-pink-700 dark:text-pink-400" />
                  Desglose de donaciones
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {DON_TYPES.map((dt) => {
                  const ts = getTypeSummary(dt.value);
                  const pct = donTotal > 0 ? (ts.total / donTotal) * 100 : 0;
                  return (
                    <div key={dt.value}>
                      <div className="flex justify-between text-sm mb-1">
                        <span
                          className={`font-medium ${dt.color.split(" ")[1]}`}
                        >
                          {dt.label}
                        </span>
                        <span className="text-muted-foreground">
                          {$m(ts.total)}{" "}
                          <span className="text-muted-foreground">({ts.count})</span>
                        </span>
                      </div>
                      <div className="h-2 bg-background rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-pink-500 to-violet-500 transition-all"
                          style={{width: `${pct}%`}}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Top donors */}
          {donSummary?.topDonors && donSummary.topDonors.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-foreground flex items-center gap-2 text-base">
                  <Users className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                  Top donantes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {donSummary.topDonors.slice(0, 5).map((d, i) => (
                  <div
                    key={d.member_id || i}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-background text-xs font-bold text-muted-foreground flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className="text-foreground text-sm">
                        {d.first_name} {d.last_name}
                      </span>
                    </div>
                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold text-sm">
                      {$m(d.total)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── TAB: CUENTA DE CHEQUE / AHORROS ──────────────────────────────────── */}
      {activeAccount && (
        <AccountTabContent
          accountInfo={ACCOUNT_MAP[activeAccount]}
          balance={acctBalances[activeAccount]}
          summary={acctData[activeAccount].summary}
          monthly={acctData[activeAccount].monthly}
          transactions={acctData[activeAccount].transactions}
          transfers={acctData[activeAccount].transfers}
          loading={acctLoading[activeAccount]}
          onEditTransaction={(t) => {
            setEditTx(t);
            setTxModal(true);
          }}
          onDeleteTransaction={setDelTx}
          onDeleteTransfer={setDelTransfer}
        />
      )}

      {/* ── TAB: TRANSACCIONES ───────────────────────────────────────────────── */}
      {tab === "transactions" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por descripción, categoría o miembro..."
                value={txFilters.search}
                onChange={(e) =>
                  setTxFilters((f) => ({...f, search: e.target.value}))
                }
                className="pl-10 bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-emerald-500"
              />
            </div>
            <div className="relative">
              <select
                value={txFilters.type}
                onChange={(e) =>
                  setTxFilters((f) => ({...f, type: e.target.value}))
                }
                className="px-3 py-2 pr-8 bg-card border border-border text-foreground rounded-md text-sm focus:outline-none focus:border-emerald-500 appearance-none"
              >
                <option value="">Todos los tipos</option>
                <option value="INGRESO">Ingresos</option>
                <option value="EGRESO">Egresos</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={txFilters.categoryId}
                onChange={(e) =>
                  setTxFilters((f) => ({...f, categoryId: e.target.value}))
                }
                className="px-3 py-2 pr-8 bg-card border border-border text-foreground rounded-md text-sm focus:outline-none focus:border-emerald-500 appearance-none"
              >
                <option value="">Todas las categorías</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.type})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={txFilters.account}
                onChange={(e) =>
                  setTxFilters((f) => ({...f, account: e.target.value}))
                }
                className="px-3 py-2 pr-8 bg-card border border-border text-foreground rounded-md text-sm focus:outline-none focus:border-emerald-500 appearance-none"
              >
                <option value="">Todas las cuentas</option>
                {ACCOUNTS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <Input
                type="date"
                value={txFilters.startDate}
                onChange={(e) =>
                  setTxFilters((f) => ({...f, startDate: e.target.value}))
                }
                className="bg-card border-border text-foreground w-36 text-sm"
                title="Desde"
              />
              <span className="text-muted-foreground text-sm">—</span>
              <Input
                type="date"
                value={txFilters.endDate}
                onChange={(e) =>
                  setTxFilters((f) => ({...f, endDate: e.target.value}))
                }
                className="bg-card border-border text-foreground w-36 text-sm"
                title="Hasta"
              />
            </div>
            {(txFilters.type ||
              txFilters.categoryId ||
              txFilters.account ||
              txFilters.startDate ||
              txFilters.endDate ||
              txFilters.search) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setTxFilters({
                    type: "",
                    categoryId: "",
                    account: "",
                    startDate: "",
                    endDate: "",
                    search: "",
                  })
                }
                className="border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
            <div className="ml-auto flex items-center gap-3">
              {/* Totals */}
              <span className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                +
                {$m(
                  filteredTx
                    .filter((t) => t.category_type === "INGRESO")
                    .reduce((s, t) => s + Number(t.amount), 0),
                )}
              </span>
              <span className="text-sm text-red-700 dark:text-red-400 font-medium">
                -
                {$m(
                  filteredTx
                    .filter((t) => t.category_type === "EGRESO")
                    .reduce((s, t) => s + Number(t.amount), 0),
                )}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={exportTxCSV}
                className="border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40 gap-2"
              >
                <Download className="w-4 h-4" />
                CSV
              </Button>
            </div>
          </div>

          <Card className="bg-card border-border">
            <CardContent className="p-0">
              <TransactionsTable
                transactions={filteredTx}
                showAccount
                onEdit={(t) => {
                  setEditTx(t);
                  setTxModal(true);
                }}
                onDelete={setDelTx}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── TAB: DONACIONES ──────────────────────────────────────────────────── */}
      {tab === "donations" && (
        <div className="space-y-4">
          {/* Type summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {DON_TYPES.map((dt) => {
              const ts = getTypeSummary(dt.value);
              return (
                <Card
                  key={dt.value}
                  className={`border ${dt.color.split(" ")[2]} bg-muted/50`}
                >
                  <CardContent className="p-4">
                    <p
                      className={`text-sm font-medium ${dt.color.split(" ")[1]}`}
                    >
                      {dt.label}
                    </p>
                    <p className="text-xl font-bold text-foreground mt-1">
                      {$m(ts.total)}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {ts.count} registros
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Filters */}
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o descripción..."
                value={donFilters.search}
                onChange={(e) =>
                  setDonFilters((f) => ({...f, search: e.target.value}))
                }
                className="pl-10 bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-pink-500"
              />
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <select
                  value={donFilters.type}
                  onChange={(e) =>
                    setDonFilters((f) => ({...f, type: e.target.value}))
                  }
                  className="pl-8 pr-8 py-2 bg-card border border-border text-foreground rounded-md text-sm focus:outline-none focus:border-pink-500 appearance-none"
                >
                  <option value="">Todos los tipos</option>
                  {DON_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              </div>
              <Input
                type="date"
                value={donFilters.startDate}
                onChange={(e) =>
                  setDonFilters((f) => ({...f, startDate: e.target.value}))
                }
                className="bg-card border-border text-foreground w-36 text-sm"
                title="Desde"
              />
              <Input
                type="date"
                value={donFilters.endDate}
                onChange={(e) =>
                  setDonFilters((f) => ({...f, endDate: e.target.value}))
                }
                className="bg-card border-border text-foreground w-36 text-sm"
                title="Hasta"
              />
              {(donFilters.type ||
                donFilters.startDate ||
                donFilters.endDate ||
                donFilters.search) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDonFilters({
                      type: "",
                      startDate: "",
                      endDate: "",
                      search: "",
                    })
                  }
                  className="border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={exportDonCSV}
                className="border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40 gap-2"
              >
                <Download className="w-4 h-4" />
                CSV
              </Button>
            </div>
          </div>

          <Card className="bg-card border-border">
            <CardContent className="p-0">
              {filteredDon.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Heart className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="text-lg font-medium">
                    No hay donaciones registradas
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border text-left">
                        {[
                          "Donante",
                          "Tipo",
                          "Monto",
                          "Fecha",
                          "Descripción",
                          "",
                        ].map((h, i) => (
                          <th
                            key={i}
                            className={`px-4 py-3 text-muted-foreground text-xs font-semibold uppercase tracking-wider ${i === 5 ? "text-center" : ""}`}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredDon.map((d) => {
                        const typeInfo = DON_MAP[d.type] || {
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
                              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                                {$m(d.amount)}
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
                                  onClick={() => {
                                    setEditDon(d);
                                    setDonModal(true);
                                  }}
                                  className="w-7 h-7 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-400 hover:text-blue-700 dark:text-blue-300 flex items-center justify-center"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setDelDon(d)}
                                  className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-400 hover:text-red-700 dark:text-red-300 flex items-center justify-center"
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
        </div>
      )}

      {/* ── TAB: CATEGORÍAS ──────────────────────────────────────────────────── */}
      {tab === "categories" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar categoría..."
                value={catSearch}
                onChange={(e) => setCatSearch(e.target.value)}
                className="pl-10 bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-emerald-500"
              />
            </div>
            <div className="relative">
              <select
                value={catTypeFilter}
                onChange={(e) => setCatTypeFilter(e.target.value)}
                className="px-3 py-2 pr-8 bg-card border border-border text-foreground rounded-md text-sm focus:outline-none focus:border-emerald-500 appearance-none"
              >
                <option value="">Todos los tipos</option>
                <option value="INGRESO">Ingresos</option>
                <option value="EGRESO">Egresos</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                type: "INGRESO",
                label: "Ingresos",
                icon: TrendingUp,
                color: "text-emerald-700 dark:text-emerald-400",
              },
              {
                type: "EGRESO",
                label: "Egresos",
                icon: TrendingDown,
                color: "text-red-700 dark:text-red-400",
              },
            ].map(({type, label, icon: Icon, color}) => {
              const cats = filteredCats.filter((c) => c.type === type);
              return (
                <Card key={type} className="bg-card border-border">
                  <CardHeader className="pb-3">
                    <CardTitle
                      className={`${color} flex items-center gap-2 text-base`}
                    >
                      <Icon className="w-5 h-5" />
                      Categorías de {label}
                      <span className="ml-auto text-muted-foreground text-sm font-normal">
                        {cats.length}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1.5">
                    {cats.length === 0 ? (
                      <p className="text-muted-foreground text-sm text-center py-4">
                        Sin categorías
                      </p>
                    ) : (
                      cats.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center justify-between p-2.5 bg-muted/50 rounded-lg hover:bg-accent transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Tag className={`w-3.5 h-3.5 ${color}`} />
                            <span className="text-foreground text-sm">{c.name}</span>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                setEditCat(c);
                                setCatModal(true);
                              }}
                              className="w-7 h-7 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-400 hover:text-blue-700 dark:text-blue-300 flex items-center justify-center"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDelCat(c)}
                              className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-400 hover:text-red-700 dark:text-red-300 flex items-center justify-center"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────────────────────── */}
      <TransactionModal
        open={txModal}
        onClose={() => {
          setTxModal(false);
          setEditTx(null);
        }}
        transaction={editTx}
        categories={categories}
        defaultAccount={activeAccount}
        onSaved={async () => {
          await Promise.all([loadTransactions(), loadSummary(), loadAccountBalances()]);
          if (activeAccount) loadAccountTab(activeAccount);
        }}
      />
      <TransferModal
        open={transferModal}
        onClose={() => setTransferModal(false)}
        defaultFromAccount={activeAccount}
        onSaved={() => {
          if (activeAccount) loadAccountTab(activeAccount);
          else loadAccountBalances();
        }}
      />
      <DonationModal
        open={donModal}
        onClose={() => {
          setDonModal(false);
          setEditDon(null);
        }}
        donation={editDon}
        onSaved={async () => {
          await Promise.all([loadDonations(), loadSummary()]);
        }}
      />
      <CategoryModal
        open={catModal}
        onClose={() => {
          setCatModal(false);
          setEditCat(null);
        }}
        category={editCat}
        onSaved={loadCategories}
      />
      <ConfirmDialog
        open={!!delTx}
        onClose={() => setDelTx(null)}
        onConfirm={handleDelTx}
        message={`¿Eliminar esta transacción de ${$m(delTx?.amount)}? Esta acción no se puede deshacer.`}
      />
      <ConfirmDialog
        open={!!delTransfer}
        onClose={() => setDelTransfer(null)}
        onConfirm={handleDelTransfer}
        message={`¿Eliminar esta transferencia de ${$m(delTransfer?.amount)}? Esta acción no se puede deshacer.`}
      />
      <ConfirmDialog
        open={!!delDon}
        onClose={() => setDelDon(null)}
        onConfirm={handleDelDon}
        message={`¿Eliminar esta donación de ${$m(delDon?.amount)}? Esta acción no se puede deshacer.`}
      />
      <ConfirmDialog
        open={!!delCat}
        onClose={() => setDelCat(null)}
        onConfirm={handleDelCat}
        message={`¿Eliminar la categoría "${delCat?.name}"? Las transacciones asociadas perderán su categoría.`}
      />
    </div>
  );
}
