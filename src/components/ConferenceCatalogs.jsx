import {useState, useEffect, useCallback} from "react";
import {conferenceService} from "@/services/api";
import {Button} from "@/components/ui/Button";
import {Input} from "@/components/ui/Input";
import {Church, Users, Plus, X, Loader2} from "lucide-react";

// Catálogos por iglesia (no por conferencia): una vez cargados se reutilizan
// en todas las conferencias futuras, por eso estos componentes se manejan
// solos (fetch/create/delete propio) sin depender de un conferenceId.

export function ParticipatingChurchesEditor({className}) {
  const [churches, setChurches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const fetchChurches = useCallback(async () => {
    try {
      const data = await conferenceService.getParticipatingChurches();
      setChurches(data.churches);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchChurches(); }, [fetchChurches]);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    setError("");
    try {
      await conferenceService.createParticipatingChurch(newName.trim());
      await fetchChurches();
      setNewName("");
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo agregar la iglesia.");
    }
    setSaving(false);
  };

  const handleDelete = async (churchId) => {
    setDeletingId(churchId);
    try {
      await conferenceService.deleteParticipatingChurch(churchId);
      await fetchChurches();
    } catch { /* silent */ }
    setDeletingId(null);
  };

  return (
    <div className={className}>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2">
        <Church size={12} /> Iglesias participantes
      </p>
      <p className="text-xs text-muted-foreground mb-2">
        Aparecen como opción en el formulario público de registro. Se comparten entre todas tus conferencias.
      </p>
      {!loading && churches.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {churches.map((c) => (
            <span key={c.id}
              className="group/pc inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-medium bg-background border border-border text-foreground">
              {c.name}
              <button type="button" title="Quitar" onClick={() => handleDelete(c.id)}
                className="p-0.5 rounded opacity-0 group-hover/pc:opacity-100 hover:bg-red-500/20 hover:text-red-700 dark:hover:text-red-400 transition-opacity">
                {deletingId === c.id
                  ? <Loader2 size={10} className="animate-spin" />
                  : <X size={10} />}
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input placeholder="Nombre de la iglesia" value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAdd())}
          className="text-sm" maxLength={200} />
        <Button type="button" size="sm" onClick={handleAdd} disabled={saving || !newName.trim()}
          className="flex items-center gap-1.5 shrink-0">
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          Agregar
        </Button>
      </div>
      {error && <p className="text-xs text-red-700 dark:text-red-400 mt-1.5">{error}</p>}
    </div>
  );
}

export function SpeakersEditor({className}) {
  const [speakers, setSpeakers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const fetchSpeakers = useCallback(async () => {
    try {
      const data = await conferenceService.getSpeakers();
      setSpeakers(data.speakers);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSpeakers(); }, [fetchSpeakers]);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    setError("");
    try {
      await conferenceService.createSpeaker({fullName: newName.trim(), title: newTitle.trim() || undefined});
      await fetchSpeakers();
      setNewName("");
      setNewTitle("");
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo agregar el orador.");
    }
    setSaving(false);
  };

  const handleDelete = async (speakerId) => {
    setDeletingId(speakerId);
    try {
      await conferenceService.deleteSpeaker(speakerId);
      await fetchSpeakers();
    } catch { /* silent */ }
    setDeletingId(null);
  };

  return (
    <div className={className}>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2">
        <Users size={12} /> Oradores
      </p>
      <p className="text-xs text-muted-foreground mb-2">
        Disponibles al asignar expositor en cada sesión del programa. Se comparten entre todas tus conferencias.
      </p>
      {!loading && speakers.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {speakers.map((s) => (
            <span key={s.id}
              className="group/sp inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-medium bg-background border border-border text-foreground">
              {s.full_name}{s.title ? ` · ${s.title}` : ""}
              <button type="button" title="Quitar" onClick={() => handleDelete(s.id)}
                className="p-0.5 rounded opacity-0 group-hover/sp:opacity-100 hover:bg-red-500/20 hover:text-red-700 dark:hover:text-red-400 transition-opacity">
                {deletingId === s.id
                  ? <Loader2 size={10} className="animate-spin" />
                  : <X size={10} />}
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input placeholder="Nombre del orador" value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="text-sm" maxLength={200} />
        <Input placeholder="Título (opcional)" value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAdd())}
          className="text-sm" maxLength={100} />
        <Button type="button" size="sm" onClick={handleAdd} disabled={saving || !newName.trim()}
          className="flex items-center gap-1.5 shrink-0">
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          Agregar
        </Button>
      </div>
      {error && <p className="text-xs text-red-700 dark:text-red-400 mt-1.5">{error}</p>}
    </div>
  );
}
