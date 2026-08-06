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
  FileText,
  Plus,
  Search,
  Trash2,
  Printer,
  X,
  User,
  BookOpen,
  Star,
  ArrowRightLeft,
  Handshake,
  Globe,
  ChevronDown,
  Filter,
} from "lucide-react";
import {lettersService, membersService, settingsService} from "@/services/api";
import {buildReferenceLetter} from "@/utils/reportPrint";

// ── Constantes ────────────────────────────────────────────────────────────
const LETTER_TYPES = [
  {
    value: "MEMBRESIA",
    label: "Carta de Membresía",
    description: "Certifica que la persona es miembro activo de la iglesia",
    icon: BookOpen,
    color: "text-blue-700 dark:text-blue-400",
    bg: "bg-blue-400/10 border-blue-400/20",
  },
  {
    value: "BUENA_CONDUCTA",
    label: "Carta de Buena Conducta",
    description: "Acredita la conducta íntegra y cristiana del miembro",
    icon: Star,
    color: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-400/10 border-amber-400/20",
  },
  {
    value: "RECOMENDACION",
    label: "Carta de Recomendación",
    description: "Recomendación pastoral para cargos o gestiones",
    icon: Handshake,
    color: "text-green-700 dark:text-green-400",
    bg: "bg-green-400/10 border-green-400/20",
  },
  {
    value: "TRANSFERENCIA",
    label: "Carta de Transferencia",
    description: "Para transferir membresía a otra congregación",
    icon: ArrowRightLeft,
    color: "text-purple-700 dark:text-purple-400",
    bg: "bg-purple-400/10 border-purple-400/20",
  },
  {
    value: "PRESENTACION",
    label: "Carta de Presentación",
    description: "Presenta al miembro ante otra congregación",
    icon: User,
    color: "text-cyan-700 dark:text-cyan-400",
    bg: "bg-cyan-400/10 border-cyan-400/20",
  },
  {
    value: "VISA",
    label: "Carta para Visa / Trámites",
    description: "Respaldo para gestiones ante autoridades",
    icon: Globe,
    color: "text-rose-700 dark:text-rose-400",
    bg: "bg-rose-400/10 border-rose-400/20",
  },
];

const TYPE_MAP = Object.fromEntries(LETTER_TYPES.map((t) => [t.value, t]));

const fmtDate = (d) => {
  if (!d) return "—";
  const parts = d.split("T")[0].split("-");
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const today = () => new Date().toISOString().split("T")[0];

const emptyForm = () => ({
  memberId: "",
  letterType: "MEMBRESIA",
  recipient: "A quien corresponda",
  purpose: "",
  customBody: "",
  issuedBy: "",
  issuedAt: today(),
  validUntil: "",
  destinationChurch: "",
});

// ── Componente principal ──────────────────────────────────────────────────
export default function LettersPage() {
  const [letters, setLetters] = useState([]);
  const [stats, setStats] = useState(null);
  const [members, setMembers] = useState([]);
  const [church, setChurch] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtros
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  // Miembro buscado en form
  const [memberSearch, setMemberSearch] = useState("");
  const [memberSuggestions, setMemberSuggestions] = useState([]);
  const [memberSelected, setMemberSelected] = useState(null);

  // ── Carga inicial ────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (filterType) params.letterType = filterType;

      const [lettersRes, statsRes, churchRes] = await Promise.all([
        lettersService.getAll(params),
        lettersService.getStats(),
        settingsService.getChurch().catch(() => ({})),
      ]);
      setLetters(lettersRes.letters || []);
      setStats(statsRes);
      setChurch(churchRes.church || churchRes || {});
    } catch (e) {
      setError("No se pudieron cargar las cartas. Verifica la conexión.");
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Cargar miembros para el select
  useEffect(() => {
    membersService
      .getAll({status: "ACTIVO", limit: 200})
      .then((r) => setMembers(r.members || []))
      .catch(() => {});
  }, []);

  // Pre-fill issuedBy con nombre del pastor si está en settings
  useEffect(() => {
    if (church.pastor_name && !form.issuedBy) {
      setForm((f) => ({...f, issuedBy: church.pastor_name}));
    }
  }, [church]);

  // ── Búsqueda de miembros dentro del form ─────────────────────────────
  useEffect(() => {
    if (memberSearch.length < 2) {
      setMemberSuggestions([]);
      return;
    }
    const q = memberSearch.toLowerCase();
    setMemberSuggestions(
      members
        .filter((m) =>
          `${m.first_name} ${m.last_name}`.toLowerCase().includes(q),
        )
        .slice(0, 8),
    );
  }, [memberSearch, members]);

  // ── Filtro por búsqueda en tabla ─────────────────────────────────────
  const displayed = letters.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      `${l.first_name} ${l.last_name}`.toLowerCase().includes(q) ||
      (TYPE_MAP[l.letter_type]?.label || "").toLowerCase().includes(q)
    );
  });

  // ── Modal helpers ────────────────────────────────────────────────────
  const openCreate = () => {
    setForm(emptyForm());
    setMemberSearch("");
    setMemberSelected(null);
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setFormError(null);
  };

  const selectMember = (m) => {
    setMemberSelected(m);
    setForm((f) => ({...f, memberId: m.id}));
    setMemberSearch(`${m.first_name} ${m.last_name}`);
    setMemberSuggestions([]);
  };

  const handleField = (e) => {
    const {name, value} = e.target;
    setForm((f) => ({...f, [name]: value}));
  };

  // ── Guardar ──────────────────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    setFormError(null);
    if (!form.memberId) return setFormError("Selecciona un miembro.");
    if (!form.issuedBy.trim())
      return setFormError("Ingresa el nombre del firmante.");

    setSaving(true);
    try {
      await lettersService.create(form);
      closeModal();
      fetchData();
    } catch (err) {
      setFormError(err.response?.data?.error || "Error al guardar la carta.");
    } finally {
      setSaving(false);
    }
  };

  // ── Eliminar ─────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar esta carta permanentemente?")) return;
    try {
      await lettersService.delete(id);
      fetchData();
    } catch {
      alert("No se pudo eliminar la carta.");
    }
  };

  // ── Imprimir / PDF ───────────────────────────────────────────────────
  const handlePrint = async (letter) => {
    let fullLetter = letter;
    // Si no tenemos todos los datos, los pedimos al backend
    if (!letter.church_name) {
      fullLetter = await lettersService.getById(letter.id);
    }
    const html = buildReferenceLetter(fullLetter, {
      name: fullLetter.church_name || church.name || "Iglesia Cristiana",
      address: fullLetter.church_address || church.address || "",
      phone: fullLetter.church_phone || church.phone || "",
      logoUrl: church.logoUrl || null,
    });
    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
  };

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-700 dark:text-indigo-400" />
            Cartas de Referencia
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Emite cartas pastorales oficiales para los miembros
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Nueva carta
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {LETTER_TYPES.map((t) => {
            const count =
              stats.byType?.find((b) => b.letter_type === t.value)?.count || 0;
            const Icon = t.icon;
            return (
              <button
                key={t.value}
                onClick={() =>
                  setFilterType((prev) => (prev === t.value ? "" : t.value))
                }
                className={`rounded-lg border p-3 text-left transition-all ${t.bg} ${
                  filterType === t.value
                    ? "ring-2 ring-white/20 scale-[1.02]"
                    : "hover:scale-[1.01]"
                }`}
              >
                <Icon className={`w-5 h-5 ${t.color} mb-1.5`} />
                <div className="text-xl font-bold text-foreground">{count}</div>
                <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                  {t.label.replace("Carta de ", "").replace("Carta para ", "")}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por miembro o tipo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border text-foreground w-full"
          />
        </div>
        {filterType && (
          <Button
            variant="outline"
            onClick={() => setFilterType("")}
            className="border-border text-muted-foreground hover:bg-accent flex items-center gap-1.5"
          >
            <Filter className="w-3.5 h-3.5" />
            {TYPE_MAP[filterType]?.label}
            <X className="w-3.5 h-3.5 ml-1" />
          </Button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg p-4 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Tabla */}
      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Cargando cartas…</div>
      ) : displayed.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-16 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No hay cartas registradas</p>
            <p className="text-muted-foreground text-sm mt-1">
              Haz clic en "Nueva carta" para emitir la primera
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Miembro
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                    Tipo
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                    Dirigida a
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                    Firmada por
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {displayed.map((l) => {
                  const typeInfo = TYPE_MAP[l.letter_type];
                  const Icon = typeInfo?.icon || FileText;
                  return (
                    <tr
                      key={l.id}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center shrink-0">
                            <span className="text-xs font-semibold text-muted-foreground">
                              {l.first_name?.[0]}
                              {l.last_name?.[0]}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {l.first_name} {l.last_name}
                            </p>
                            {/* Tipo visible en mobile */}
                            <p className="text-xs text-muted-foreground sm:hidden">
                              {typeInfo?.label}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
                            typeInfo?.bg || "bg-muted/50 border-border"
                          } ${typeInfo?.color || "text-muted-foreground"}`}
                        >
                          <Icon className="w-3 h-3" />
                          {typeInfo?.label || l.letter_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell max-w-[160px] truncate">
                        {l.recipient || "A quien corresponda"}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground hidden lg:table-cell">
                        {l.issued_by}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                        {fmtDate(l.issued_at)}
                        {l.valid_until && (
                          <p className="text-xs text-muted-foreground">
                            Vence: {fmtDate(l.valid_until)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => handlePrint(l)}
                            className="p-1.5 rounded text-muted-foreground hover:text-indigo-700 dark:text-indigo-400 hover:bg-indigo-400/10 transition-colors"
                            title="Ver / Imprimir carta"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(l.id)}
                            className="p-1.5 rounded text-muted-foreground hover:text-red-700 dark:text-red-400 hover:bg-red-400/10 transition-colors"
                            title="Eliminar carta"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {letters.length > 0 && (
            <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">
              {displayed.length} carta{displayed.length !== 1 ? "s" : ""}
              {filterType || search ? " (filtradas)" : " en total"}
            </div>
          )}
        </Card>
      )}

      {/* ── Modal nueva carta ─────────────────────────────────────────────── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent onClose={closeModal} className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <FileText className="w-5 h-5 text-indigo-700 dark:text-indigo-400" />
              Nueva carta de referencia
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-5 mt-2">
            {/* Tipo de carta */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Tipo de carta *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {LETTER_TYPES.map((t) => {
                  const Icon = t.icon;
                  const active = form.letterType === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() =>
                        setForm((f) => ({...f, letterType: t.value}))
                      }
                      className={`flex items-start gap-2 rounded-lg border p-2.5 text-left transition-all text-sm ${
                        active
                          ? `${t.bg} ${t.color} border-current ring-1 ring-current/30`
                          : "bg-muted/50 border-border text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 mt-0.5 ${active ? t.color : ""}`}
                      />
                      <span className="leading-tight font-medium">
                        {t.label
                          .replace("Carta de ", "")
                          .replace("Carta para ", "")}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Miembro */}
            <div className="relative">
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                Miembro *
              </label>
              <Input
                placeholder="Buscar miembro…"
                value={memberSearch}
                onChange={(e) => {
                  setMemberSearch(e.target.value);
                  setMemberSelected(null);
                  setForm((f) => ({...f, memberId: ""}));
                }}
                className="bg-background border-border text-foreground w-full"
                autoComplete="off"
              />
              {memberSuggestions.length > 0 && (
                <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-xl overflow-hidden max-h-52 overflow-y-auto">
                  {memberSuggestions.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => selectMember(m)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-accent transition-colors text-left"
                    >
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <span className="text-xs font-semibold text-foreground">
                          {m.first_name?.[0]}
                          {m.last_name?.[0]}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-foreground font-medium">
                          {m.first_name} {m.last_name}
                        </p>
                        {m.phone && (
                          <p className="text-xs text-muted-foreground">{m.phone}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fila 2 cols */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                  Dirigida a
                </label>
                <Input
                  name="recipient"
                  value={form.recipient}
                  onChange={handleField}
                  placeholder="A quien corresponda"
                  className="bg-background border-border text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                  Firmada por (Pastor) *
                </label>
                <Input
                  name="issuedBy"
                  value={form.issuedBy}
                  onChange={handleField}
                  placeholder="Nombre del pastor"
                  className="bg-background border-border text-foreground"
                  required
                />
              </div>
            </div>

            {/* Fechas */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                  Fecha de emisión *
                </label>
                <Input
                  name="issuedAt"
                  type="date"
                  value={form.issuedAt}
                  onChange={handleField}
                  className="bg-background border-border text-foreground"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                  Válida hasta{" "}
                  <span className="text-muted-foreground font-normal">(opcional)</span>
                </label>
                <Input
                  name="validUntil"
                  type="date"
                  value={form.validUntil}
                  onChange={handleField}
                  className="bg-background border-border text-foreground"
                />
              </div>
            </div>

            {/* Iglesia destino (solo TRANSFERENCIA) */}
            {form.letterType === "TRANSFERENCIA" && (
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                  Iglesia de destino
                </label>
                <Input
                  name="destinationChurch"
                  value={form.destinationChurch}
                  onChange={handleField}
                  placeholder="Nombre de la congregación receptora"
                  className="bg-background border-border text-foreground"
                />
              </div>
            )}

            {/* Propósito */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                Propósito / motivo{" "}
                <span className="text-muted-foreground font-normal">(opcional)</span>
              </label>
              <Input
                name="purpose"
                value={form.purpose}
                onChange={handleField}
                placeholder="Ej: Para aplicar a empleo, gestión de visa, etc."
                className="bg-background border-border text-foreground"
              />
            </div>

            {/* Texto adicional */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                Texto adicional{" "}
                <span className="text-muted-foreground font-normal">(opcional)</span>
              </label>
              <textarea
                name="customBody"
                value={form.customBody}
                onChange={handleField}
                rows={3}
                placeholder="Párrafo extra que se incluirá en el cuerpo de la carta…"
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 resize-none"
              />
            </div>

            {formError && (
              <p className="text-red-700 dark:text-red-400 text-sm bg-red-500/10 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded px-3 py-2">
                {formError}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={closeModal}
                className="border-border text-muted-foreground hover:bg-accent"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                {saving ? "Guardando…" : "Crear carta"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
