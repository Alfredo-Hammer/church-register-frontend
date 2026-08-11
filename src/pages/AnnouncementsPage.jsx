import {useState, useEffect, useCallback} from "react";
import {useAuth} from "@/contexts/AuthContext";
import {announcementsService} from "@/services/api";
import {Button} from "@/components/ui/Button";
import {Input} from "@/components/ui/Input";
import {Megaphone, Plus, Trash2, X, AlertCircle, Clock, CalendarClock} from "lucide-react";

const CAN_DELETE = ["ADMIN", "PASTOR"];
const CAN_CREATE = ["ADMIN", "PASTOR", "LIDER"];

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("es", {day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"});

// ── Modal de creación ────────────────────────────────────────────────────────

function AnnouncementFormModal({onClose, onSaved}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!title.trim() || !body.trim()) {
      setError("Título y mensaje son obligatorios.");
      return;
    }
    setSaving(true);
    try {
      await announcementsService.create({
        title: title.trim(),
        body: body.trim(),
        expiresAt: expiresAt || null,
      });
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.error || "Error al publicar. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center">
              <Megaphone className="h-4 w-4 text-sky-700 dark:text-sky-400" />
            </div>
            <h2 className="font-semibold text-foreground text-lg">Nuevo aviso</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Título <span className="text-red-700 dark:text-red-400">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Cambio de horario este domingo"
              maxLength={200}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Mensaje <span className="text-red-700 dark:text-red-400">*</span>
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Detalle del aviso…"
              rows={4}
              className="w-full bg-background border border-border text-foreground text-sm rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-muted-foreground"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Vence el (opcional)
            </label>
            <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            <p className="text-xs text-muted-foreground mt-1">
              Después de esa fecha deja de mostrarse, sin necesidad de borrarlo.
            </p>
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? "Publicando…" : "Publicar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Confirmación de borrado ──────────────────────────────────────────────────

function ConfirmDialog({message, onConfirm, onCancel}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm shadow-2xl">
        <p className="text-foreground text-sm mb-5">{message}</p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>
            Cancelar
          </Button>
          <button
            className="flex-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2 transition-colors"
            onClick={onConfirm}
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tarjeta de aviso ──────────────────────────────────────────────────────────

function AnnouncementCard({item, canDelete, onDelete}) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl border border-border bg-muted/50">
      <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
        <Megaphone className="h-4 w-4 text-sky-700 dark:text-sky-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-semibold text-foreground">{item.title}</p>
          {canDelete && (
            <button
              onClick={() => onDelete(item)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-red-700 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
              title="Eliminar aviso"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1.5 whitespace-pre-wrap">{item.body}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {formatDate(item.created_at)}
          </span>
          {item.created_by_name && <span>· {item.created_by_name}</span>}
          {item.expires_at && (
            <span className="flex items-center gap-1">
              <CalendarClock className="h-3 w-3" /> vence {formatDate(item.expires_at)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function AnnouncementsPage() {
  const {user} = useAuth();
  const canCreate = CAN_CREATE.includes(user?.role);
  const canDelete = CAN_DELETE.includes(user?.role);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await announcementsService.getAll();
      setItems(data.announcements || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await announcementsService.delete(confirmDelete.id);
      setConfirmDelete(null);
      load();
    } catch {
      /* silencioso */
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center">
            <Megaphone className="h-5 w-5 text-sky-700 dark:text-sky-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Avisos y Anuncios</h1>
            <p className="text-sm text-muted-foreground">
              {loading ? "Cargando…" : `${items.length} aviso${items.length !== 1 ? "s" : ""} activo${items.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>

        {canCreate && (
          <Button onClick={() => setShowModal(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> Nuevo aviso
          </Button>
        )}
      </div>

      <p className="text-sm text-muted-foreground -mt-2">
        Se muestran en el dashboard de miembro de la app móvil y en el home de todo el equipo.
      </p>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-card border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-card border border-border rounded-xl">
          <Megaphone className="h-8 w-8 mb-2 opacity-30" />
          <p className="text-sm">Todavía no hay avisos publicados.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <AnnouncementCard key={item.id} item={item} canDelete={canDelete} onDelete={setConfirmDelete} />
          ))}
        </div>
      )}

      {showModal && (
        <AnnouncementFormModal
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            load();
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          message={`¿Eliminar el aviso "${confirmDelete.title}"? Esta acción no se puede deshacer.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
