import {useEffect, useRef, useState} from "react";
import {Button} from "@/components/ui/Button";
import {Input} from "@/components/ui/Input";
import {internalRegulationsService, settingsService} from "@/services/api";
import {useAuth} from "@/contexts/AuthContext";
import {buildInternalRegulations} from "@/utils/reportPrint";
import {
  Scale,
  Pencil,
  Printer,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Save,
  X,
  Loader2,
  AlertCircle,
  MessageSquareWarning,
  Table2,
  Upload,
  FileText,
  RefreshCw,
} from "lucide-react";

const MAX_PDF_BYTES = 8 * 1024 * 1024;

function dataURItoBlob(dataURI) {
  const [meta, base64] = dataURI.split(",");
  const mime = meta.match(/:(.*?);/)?.[1] || "application/pdf";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], {type: mime});
}

function formatDateTime(d) {
  if (!d) return "";
  return new Date(d).toLocaleString("es-ES", {day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"});
}

// ── Visor de PDF (estilo libro: visor nativo del navegador, página por página) ─
function PdfViewer({filename, uploadedAt, canEdit, onReplace, onDelete}) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loadingPdf, setLoadingPdf] = useState(true);
  const [pdfError, setPdfError] = useState("");

  useEffect(() => {
    let url;
    setLoadingPdf(true);
    setPdfError("");
    internalRegulationsService
      .getPdf()
      .then((r) => {
        url = URL.createObjectURL(dataURItoBlob(r.pdfData));
        setBlobUrl(url);
      })
      .catch(() => setPdfError("No se pudo cargar el PDF."))
      .finally(() => setLoadingPdf(false));
    return () => { if (url) URL.revokeObjectURL(url); };
  }, []);

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{filename}</p>
            {uploadedAt && <p className="text-xs text-muted-foreground">Subido el {formatDateTime(uploadedAt)}</p>}
          </div>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={onReplace} className="gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Reemplazar
            </Button>
            <Button variant="outline" size="sm" onClick={onDelete} className="gap-1.5 text-red-700 dark:text-red-400">
              <Trash2 className="w-3.5 h-3.5" /> Quitar
            </Button>
          </div>
        )}
      </div>
      {loadingPdf ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : pdfError ? (
        <div className="flex items-center gap-2 p-4 text-red-700 dark:text-red-300 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" /> {pdfError}
        </div>
      ) : (
        <iframe src={blobUrl} title={filename} className="w-full border-0" style={{height: "80vh"}} />
      )}
    </div>
  );
}

// ── Estructuras en blanco ────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10);

const emptyItem = () => ({id: uid(), label: "", title: "", body: ""});
const emptySection = () => ({id: uid(), heading: "", intro: "", items: [emptyItem()], callout: null, table: null});
const emptyDoc = () => ({
  title: "Reglamento Interno",
  subtitle: "",
  preamble: "",
  sections: [emptySection()],
  signatories: ["Pastor Principal / Encargado"],
  effective_date: "",
});

// ── Vista de lectura ──────────────────────────────────────────────────────────
function RegulationsView({doc}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 space-y-6">
      <div className="text-center border-b border-border pb-5">
        <h2 className="text-xl font-bold text-foreground">{doc.title}</h2>
        {doc.subtitle && <p className="text-sm text-muted-foreground italic mt-1">{doc.subtitle}</p>}
      </div>

      {doc.preamble && (
        <div className="bg-muted/50 border-l-4 border-indigo-500 rounded-r-lg px-4 py-3 text-sm text-muted-foreground italic whitespace-pre-line">
          {doc.preamble}
        </div>
      )}

      {(doc.sections || []).map((s) => (
        <div key={s.id} className="space-y-3">
          {s.heading && (
            <h3 className="text-xs font-bold uppercase tracking-wide text-white bg-indigo-700 dark:bg-indigo-800 rounded-md px-3 py-2">
              {s.heading}
            </h3>
          )}
          {s.intro && <p className="text-sm text-foreground whitespace-pre-line">{s.intro}</p>}

          {(s.items || []).filter((it) => it.body || it.title).map((it) => (
            <div key={it.id} className="flex gap-2 text-sm">
              {it.label && <span className="font-bold text-indigo-700 dark:text-indigo-400 shrink-0">{it.label}.</span>}
              <span className="text-foreground">
                {it.title && <strong>{it.title}: </strong>}
                {it.body}
              </span>
            </div>
          ))}

          {s.callout?.body && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
              {s.callout.title && <strong>{s.callout.title}: </strong>}
              {s.callout.body}
            </div>
          )}

          {s.table?.rows?.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-indigo-700 dark:bg-indigo-800">
                    {(s.table.columns || []).map((c, i) => (
                      <th key={i} className="text-left text-white text-xs uppercase tracking-wide px-3 py-2">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {s.table.rows.map((row, ri) => (
                    <tr key={ri}>
                      {row.map((cell, ci) => (
                        <td key={ci} className="px-3 py-2 text-foreground align-top">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}

      {doc.effective_date && (
        <p className="text-center text-xs text-muted-foreground">
          Vigente desde el{" "}
          {new Date(doc.effective_date.slice(0, 10) + "T12:00:00").toLocaleDateString("es-ES", {day: "numeric", month: "long", year: "numeric"})}
        </p>
      )}

      {(doc.signatories || []).length > 0 && (
        <div className="flex flex-wrap justify-center gap-10 pt-4">
          {doc.signatories.map((label, i) => (
            <div key={i} className="text-center w-52">
              <div className="border-t border-foreground/40 pt-2 text-xs text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Editor de un inciso (item) ────────────────────────────────────────────────
function ItemEditor({item, onChange, onRemove}) {
  return (
    <div className="flex gap-2 items-start bg-background border border-border rounded-lg p-2.5">
      <Input
        value={item.label}
        onChange={(e) => onChange({...item, label: e.target.value})}
        placeholder="1.1"
        className="w-16 shrink-0 bg-card border-border text-foreground text-sm"
      />
      <div className="flex-1 space-y-1.5 min-w-0">
        <Input
          value={item.title}
          onChange={(e) => onChange({...item, title: e.target.value})}
          placeholder="Título del inciso (opcional)"
          className="bg-card border-border text-foreground text-sm"
        />
        <textarea
          value={item.body}
          onChange={(e) => onChange({...item, body: e.target.value})}
          placeholder="Texto del inciso…"
          rows={2}
          className="w-full bg-card border border-border rounded-md px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <button type="button" onClick={onRemove} className="p-1.5 text-red-700 dark:text-red-400 hover:bg-red-500/10 rounded-md shrink-0">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Editor de una sección completa ────────────────────────────────────────────
function SectionEditor({section, onChange, onRemove, onMoveUp, onMoveDown, isFirst, isLast}) {
  const updateItem = (idx, item) => {
    const items = [...section.items];
    items[idx] = item;
    onChange({...section, items});
  };
  const addItem = () => onChange({...section, items: [...(section.items || []), emptyItem()]});
  const removeItem = (idx) => onChange({...section, items: section.items.filter((_, i) => i !== idx)});

  const toggleCallout = () =>
    onChange({...section, callout: section.callout ? null : {title: "", body: ""}});
  const toggleTable = () =>
    onChange({...section, table: section.table ? null : {columns: ["Columna 1", "Columna 2"], rows: [["", ""]]}});

  const updateTableCell = (ri, ci, value) => {
    const rows = section.table.rows.map((row, r) => (r === ri ? row.map((c, cc) => (cc === ci ? value : c)) : row));
    onChange({...section, table: {...section.table, rows}});
  };
  const updateTableColumn = (ci, value) => {
    const columns = section.table.columns.map((c, i) => (i === ci ? value : c));
    onChange({...section, table: {...section.table, columns}});
  };
  const addTableRow = () =>
    onChange({...section, table: {...section.table, rows: [...section.table.rows, section.table.columns.map(() => "")]}});
  const removeTableRow = (ri) =>
    onChange({...section, table: {...section.table, rows: section.table.rows.filter((_, i) => i !== ri)}});
  const addTableColumn = () =>
    onChange({
      ...section,
      table: {
        columns: [...section.table.columns, `Columna ${section.table.columns.length + 1}`],
        rows: section.table.rows.map((row) => [...row, ""]),
      },
    });
  const removeTableColumn = (ci) =>
    onChange({
      ...section,
      table: {
        columns: section.table.columns.filter((_, i) => i !== ci),
        rows: section.table.rows.map((row) => row.filter((_, i) => i !== ci)),
      },
    });

  return (
    <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-start gap-2">
        <Input
          value={section.heading}
          onChange={(e) => onChange({...section, heading: e.target.value})}
          placeholder="SECCIÓN I: TÍTULO DE LA SECCIÓN"
          className="flex-1 bg-card border-border text-foreground font-semibold"
        />
        <div className="flex items-center gap-1 shrink-0">
          <button type="button" onClick={onMoveUp} disabled={isFirst} className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-30 rounded-md hover:bg-accent">
            <ChevronUp className="w-4 h-4" />
          </button>
          <button type="button" onClick={onMoveDown} disabled={isLast} className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-30 rounded-md hover:bg-accent">
            <ChevronDown className="w-4 h-4" />
          </button>
          <button type="button" onClick={onRemove} className="p-2 text-red-700 dark:text-red-400 hover:bg-red-500/10 rounded-md">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <textarea
        value={section.intro}
        onChange={(e) => onChange({...section, intro: e.target.value})}
        placeholder="Introducción de la sección (opcional)"
        rows={2}
        className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />

      <div className="space-y-2">
        {(section.items || []).map((item, idx) => (
          <ItemEditor key={item.id} item={item} onChange={(it) => updateItem(idx, it)} onRemove={() => removeItem(idx)} />
        ))}
        <button type="button" onClick={addItem} className="text-xs text-indigo-700 dark:text-indigo-400 hover:underline flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> Agregar inciso
        </button>
      </div>

      {/* Caja destacada */}
      {section.callout ? (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <MessageSquareWarning className="w-3.5 h-3.5" /> Caja destacada
            </span>
            <button type="button" onClick={toggleCallout} className="text-xs text-red-700 dark:text-red-400 hover:underline">Quitar</button>
          </div>
          <Input
            value={section.callout.title}
            onChange={(e) => onChange({...section, callout: {...section.callout, title: e.target.value}})}
            placeholder="Título (opcional)"
            className="bg-card border-border text-foreground text-sm"
          />
          <textarea
            value={section.callout.body}
            onChange={(e) => onChange({...section, callout: {...section.callout, body: e.target.value}})}
            placeholder="Texto destacado…"
            rows={2}
            className="w-full bg-card border border-border rounded-md px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      ) : (
        <button type="button" onClick={toggleCallout} className="text-xs text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> Agregar caja destacada
        </button>
      )}

      {/* Tabla */}
      {section.table ? (
        <div className="bg-card border border-border rounded-lg p-3 space-y-2 overflow-x-auto">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Table2 className="w-3.5 h-3.5" /> Tabla
            </span>
            <button type="button" onClick={toggleTable} className="text-xs text-red-700 dark:text-red-400 hover:underline">Quitar</button>
          </div>
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr>
                {section.table.columns.map((col, ci) => (
                  <th key={ci} className="p-1">
                    <div className="flex items-center gap-1">
                      <Input
                        value={col}
                        onChange={(e) => updateTableColumn(ci, e.target.value)}
                        className="bg-background border-border text-foreground text-xs font-semibold h-8"
                      />
                      {section.table.columns.length > 1 && (
                        <button type="button" onClick={() => removeTableColumn(ci)} className="text-red-700 dark:text-red-400 shrink-0">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.table.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="p-1">
                      <textarea
                        value={cell}
                        onChange={(e) => updateTableCell(ri, ci, e.target.value)}
                        rows={2}
                        className="w-full bg-background border border-border rounded-md px-2 py-1 text-xs text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>
                  ))}
                  <td className="p-1">
                    <button type="button" onClick={() => removeTableRow(ri)} className="text-red-700 dark:text-red-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-3">
            <button type="button" onClick={addTableRow} className="text-xs text-indigo-700 dark:text-indigo-400 hover:underline flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Fila
            </button>
            <button type="button" onClick={addTableColumn} className="text-xs text-indigo-700 dark:text-indigo-400 hover:underline flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Columna
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={toggleTable} className="text-xs text-foreground hover:underline flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> Agregar tabla
        </button>
      )}
    </div>
  );
}

// ── Editor completo del documento ─────────────────────────────────────────────
function RegulationsEditor({doc, onChange}) {
  const updateSection = (idx, section) => {
    const sections = [...doc.sections];
    sections[idx] = section;
    onChange({...doc, sections});
  };
  const addSection = () => onChange({...doc, sections: [...(doc.sections || []), emptySection()]});
  const removeSection = (idx) => onChange({...doc, sections: doc.sections.filter((_, i) => i !== idx)});
  const moveSection = (idx, dir) => {
    const sections = [...doc.sections];
    const target = idx + dir;
    if (target < 0 || target >= sections.length) return;
    [sections[idx], sections[target]] = [sections[target], sections[idx]];
    onChange({...doc, sections});
  };

  const updateSignatory = (idx, value) => {
    const signatories = [...doc.signatories];
    signatories[idx] = value;
    onChange({...doc, signatories});
  };
  const addSignatory = () => onChange({...doc, signatories: [...(doc.signatories || []), ""]});
  const removeSignatory = (idx) => onChange({...doc, signatories: doc.signatories.filter((_, i) => i !== idx)});

  return (
    <div className="space-y-5">
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Título *</label>
            <Input value={doc.title} onChange={(e) => onChange({...doc, title: e.target.value})} className="bg-background border-border text-foreground" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Subtítulo</label>
            <Input value={doc.subtitle} onChange={(e) => onChange({...doc, subtitle: e.target.value})} placeholder="Manual de Liderazgo y Normas de Convivencia" className="bg-background border-border text-foreground" />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Preámbulo</label>
          <textarea
            value={doc.preamble}
            onChange={(e) => onChange({...doc, preamble: e.target.value})}
            placeholder="Fundamento espiritual, lema o introducción…"
            rows={3}
            className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div className="w-full sm:w-56">
          <label className="text-xs font-medium text-muted-foreground block mb-1">Vigente desde</label>
          <Input type="date" value={doc.effective_date || ""} onChange={(e) => onChange({...doc, effective_date: e.target.value})} className="bg-background border-border text-foreground" />
        </div>
      </div>

      {(doc.sections || []).map((s, idx) => (
        <SectionEditor
          key={s.id}
          section={s}
          onChange={(sec) => updateSection(idx, sec)}
          onRemove={() => removeSection(idx)}
          onMoveUp={() => moveSection(idx, -1)}
          onMoveDown={() => moveSection(idx, 1)}
          isFirst={idx === 0}
          isLast={idx === doc.sections.length - 1}
        />
      ))}
      <Button type="button" variant="outline" onClick={addSection} className="gap-2">
        <Plus className="w-4 h-4" /> Agregar sección
      </Button>

      <div className="bg-card border border-border rounded-xl p-4 space-y-2">
        <label className="text-xs font-medium text-muted-foreground block">Firmas</label>
        {(doc.signatories || []).map((label, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <Input value={label} onChange={(e) => updateSignatory(idx, e.target.value)} placeholder="Pastor Principal / Encargado" className="bg-background border-border text-foreground" />
            <button type="button" onClick={() => removeSignatory(idx)} className="p-2 text-red-700 dark:text-red-400 hover:bg-red-500/10 rounded-md shrink-0">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button type="button" onClick={addSignatory} className="text-xs text-indigo-700 dark:text-indigo-400 hover:underline flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> Agregar firma
        </button>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function InternalRegulationsPage() {
  const {user} = useAuth();
  const canEdit = ["ADMIN", "PASTOR"].includes(user?.role);

  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [church, setChurch] = useState({});
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    settingsService.getChurch().then((r) => setChurch(r.church || r || {})).catch(() => {});
  }, []);

  const load = () => {
    setLoading(true);
    internalRegulationsService
      .get()
      .then((r) => setDoc(r.regulations))
      .catch(() => setError("No se pudieron cargar las normas internas."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const startCreate = () => { setDraft(emptyDoc()); setEditing(true); };
  const startEdit = () => {
    setDraft({
      title: doc.title,
      subtitle: doc.subtitle || "",
      preamble: doc.preamble || "",
      sections: (doc.sections || []).map((s) => ({...s, id: s.id || uid()})),
      signatories: doc.signatories || [],
      effective_date: doc.effective_date ? doc.effective_date.slice(0, 10) : "",
    });
    setEditing(true);
  };

  const handleSave = async () => {
    if (!draft.title?.trim()) return setError("El título es obligatorio.");
    setSaving(true);
    setError("");
    try {
      const r = await internalRegulationsService.save({
        title: draft.title.trim(),
        subtitle: draft.subtitle?.trim() || null,
        preamble: draft.preamble?.trim() || null,
        sections: draft.sections,
        signatories: (draft.signatories || []).filter((s) => s.trim()),
        effectiveDate: draft.effective_date || null,
      });
      setDoc(r.regulations);
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.error || "No se pudieron guardar las normas internas.");
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    const html = buildInternalRegulations(doc, {
      name: church.name,
      logoUrl: church.logoUrl,
    });
    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
  };

  const triggerFileSelect = () => fileInputRef.current?.click();

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf") return setError("Solo se permiten archivos PDF.");
    if (file.size > MAX_PDF_BYTES) return setError("El archivo es demasiado grande (máx. 8MB).");

    setError("");
    const reader = new FileReader();
    reader.onload = async (ev) => {
      setUploadingPdf(true);
      try {
        const r = await internalRegulationsService.uploadPdf(ev.target.result, file.name);
        setDoc(r.regulations);
      } catch (err) {
        setError(err.response?.data?.error || "No se pudo subir el PDF.");
      } finally {
        setUploadingPdf(false);
      }
    };
    reader.onerror = () => setError("No se pudo leer el archivo.");
    reader.readAsDataURL(file);
  };

  const handleDeletePdf = async () => {
    if (!confirm("¿Quitar el PDF cargado? Se volverá al editor de secciones.")) return;
    setError("");
    try {
      const r = await internalRegulationsService.deletePdf();
      setDoc(r.regulations);
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo quitar el PDF.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-xl flex items-center justify-center shadow-lg">
            <Scale className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Normas Internas</h1>
            <p className="text-sm text-muted-foreground">Reglamento interno y manual de liderazgo de tu iglesia</p>
          </div>
        </div>
        {doc && !editing && (
          <div className="flex items-center gap-2 flex-wrap">
            {doc.mode === "pdf" ? (
              canEdit && (
                <Button variant="outline" onClick={startEdit} className="gap-2">
                  <Pencil className="w-4 h-4" /> Usar editor de secciones
                </Button>
              )
            ) : (
              <>
                <Button variant="outline" onClick={handlePrint} className="gap-2">
                  <Printer className="w-4 h-4" /> Imprimir / PDF
                </Button>
                {canEdit && (
                  <>
                    <Button variant="outline" onClick={triggerFileSelect} disabled={uploadingPdf} className="gap-2">
                      <Upload className="w-4 h-4" /> {uploadingPdf ? "Subiendo…" : "Subir PDF"}
                    </Button>
                    <Button onClick={startEdit} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                      <Pencil className="w-4 h-4" /> Editar
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="application/pdf" onChange={handleFileSelect} className="hidden" />
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 dark:bg-red-900/40 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {editing ? (
        <>
          <RegulationsEditor doc={draft} onChange={setDraft} />
          <div className="flex justify-end gap-3 sticky bottom-4 bg-background/95 backdrop-blur border border-border rounded-xl p-3">
            <Button variant="outline" onClick={() => { setEditing(false); setError(""); }} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
              <Save className="w-4 h-4" /> {saving ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </>
      ) : doc && doc.mode === "pdf" && doc.has_pdf ? (
        <PdfViewer
          filename={doc.pdf_filename}
          uploadedAt={doc.pdf_uploaded_at}
          canEdit={canEdit}
          onReplace={triggerFileSelect}
          onDelete={handleDeletePdf}
        />
      ) : doc ? (
        <RegulationsView doc={doc} />
      ) : (
        <div className="bg-card border border-border rounded-2xl p-14 text-center">
          <Scale className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground mb-4">Tu iglesia aún no tiene normas internas registradas.</p>
          {canEdit ? (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button onClick={startCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                <Plus className="w-4 h-4" /> Crear con editor de secciones
              </Button>
              <Button variant="outline" onClick={triggerFileSelect} disabled={uploadingPdf} className="gap-2">
                <Upload className="w-4 h-4" /> {uploadingPdf ? "Subiendo…" : "Subir PDF"}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Pide a un administrador o pastor que las redacte.</p>
          )}
        </div>
      )}
    </div>
  );
}
