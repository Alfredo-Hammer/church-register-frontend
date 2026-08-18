import React, {useState, useEffect, useCallback} from "react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/Card";
import {Button} from "@/components/ui/Button";
import {Input} from "@/components/ui/Input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import {
  UsersRound,
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  AlertCircle,
  CheckCircle,
  X,
  Crown,
  CalendarDays,
  Wallet,
  ChevronRight,
  ArrowUpCircle,
  ArrowDownCircle,
  TrendingUp,
  MapPin,
  UserPlus,
  UserMinus,
  BadgeCheck,
  ArrowLeft,
  Printer,
} from "lucide-react";
import {groupsService, membersService, settingsService} from "@/services/api";
import {buildGroupMembersPDF} from "@/utils/reportPrint";
import {cn} from "@/lib/utils";

// helpers

const GROUP_POSITIONS = [
  "Presidente/a",
  "Vicepresidente/a",
  "Secretario/a",
  "Tesorero/a",
  "Director/a de Alabanza",
  "Director/a de Oración",
  "Coordinador/a de Jóvenes",
  "Coordinador/a de Niños",
  "Vocal",
  "Pastor/a Consejero/a",
  "Otro",
];

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("es", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleDateString("es", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const fmtCurrency = (n) =>
  new Intl.NumberFormat("es", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n ?? 0);

const AVATAR_COLORS = [
  "from-cyan-500 to-blue-600",
  "from-violet-500 to-purple-600",
  "from-emerald-500 to-green-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
];
function avatarColor(name) {
  if (!name) return AVATAR_COLORS[0];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function MemberAvatar({name = "", photo, size = "sm"}) {
  const sz = size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";
  if (photo)
    return (
      <img
        src={photo}
        alt={name}
        className={`${sz} rounded-full object-cover shrink-0`}
      />
    );
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <div
      className={`${sz} rounded-full bg-gradient-to-br ${avatarColor(name)} flex items-center justify-center font-semibold text-white shrink-0`}
    >
      {initials}
    </div>
  );
}

// GroupDetailPage

function GroupDetailPage({group, onBack, onEdit, onDelete, onGroupUpdated}) {
  const [activeTab, setActiveTab] = useState("members");

  const [groupMembers, setGroupMembers] = useState([]);
  const [availableMembers, setAvailableMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState("");
  const [memberSearch, setMemberSearch] = useState("");

  const [leaders, setLeaders] = useState([]);
  const [leaderForm, setLeaderForm] = useState({memberId: "", position: ""});

  const [activities, setActivities] = useState([]);
  const [activityForm, setActivityForm] = useState({
    title: "",
    description: "",
    activityDate: "",
    location: "",
  });

  const [finances, setFinances] = useState({
    transactions: [],
    summary: {totalIncome: 0, totalExpense: 0, balance: 0},
  });
  const [txForm, setTxForm] = useState({
    type: "INGRESO",
    description: "",
    amount: "",
    date: "",
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [church, setChurch] = useState({});

  useEffect(() => {
    settingsService
      .getChurch()
      .then((r) => setChurch(r.church || r || {}))
      .catch(() => {});
  }, []);

  const handlePrintMembers = () => {
    const html = buildGroupMembersPDF(group, groupMembers, church);
    const win = window.open("", "_blank", "width=960,height=720");
    win.document.write(html);
    win.document.close();
  };

  // Todo el detalle (miembros, líderes, actividades, finanzas) se carga de
  // una sola vez al entrar al grupo, no por pestaña: el header muestra
  // estadísticas en vivo (líderes, actividades, balance) sin importar cuál
  // pestaña esté activa, y cambiar de pestaña es solo un cambio visual.
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [gd, am, ld, ad, fd] = await Promise.all([
        groupsService.getById(group.id),
        membersService.getAll({limit: 1000}),
        groupsService.getLeaders(group.id),
        groupsService.getActivities(group.id),
        groupsService.getFinances(group.id),
      ]);
      setGroupMembers(gd.members ?? []);
      setAvailableMembers(am.members ?? []);
      setLeaders(ld.leaders ?? []);
      setActivities(ad.activities ?? []);
      setFinances(fd);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [group.id]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const reloadMembers = async () => {
    const gd = await groupsService.getById(group.id);
    setGroupMembers(gd.members ?? []);
  };
  const reloadLeaders = async () => {
    const ld = await groupsService.getLeaders(group.id);
    setLeaders(ld.leaders ?? []);
  };
  const reloadActivities = async () => {
    const ad = await groupsService.getActivities(group.id);
    setActivities(ad.activities ?? []);
  };
  const reloadFinances = async () => {
    const fd = await groupsService.getFinances(group.id);
    setFinances(fd);
  };

  const handleAddMember = async () => {
    if (!selectedMember) return;
    setSaving(true);
    try {
      await groupsService.addMember(group.id, selectedMember);
      setSelectedMember("");
      await reloadMembers();
      onGroupUpdated();
    } catch (e) {
      alert(e.response?.data?.error ?? "Error al agregar miembro");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm("¿Remover este miembro del grupo?")) return;
    setSaving(true);
    try {
      await groupsService.removeMember(group.id, memberId);
      await reloadMembers();
      onGroupUpdated();
    } catch (e) {
      alert(e.response?.data?.error ?? "Error");
    } finally {
      setSaving(false);
    }
  };

  const handleAddLeader = async () => {
    if (!leaderForm.memberId || !leaderForm.position) return;
    setSaving(true);
    try {
      await groupsService.addLeader(group.id, {
        memberId: leaderForm.memberId,
        position: leaderForm.position,
      });
      setLeaderForm({memberId: "", position: ""});
      await reloadLeaders();
    } catch (e) {
      alert(e.response?.data?.error ?? "Error al asignar líder");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveLeader = async (leaderId) => {
    if (!window.confirm("¿Remover este líder del grupo?")) return;
    setSaving(true);
    try {
      await groupsService.removeLeader(group.id, leaderId);
      await reloadLeaders();
    } catch (e) {
      alert(e.response?.data?.error ?? "Error");
    } finally {
      setSaving(false);
    }
  };

  const handleAddActivity = async () => {
    if (!activityForm.title || !activityForm.activityDate) return;
    setSaving(true);
    try {
      await groupsService.addActivity(group.id, activityForm);
      setActivityForm({
        title: "",
        description: "",
        activityDate: "",
        location: "",
      });
      await reloadActivities();
    } catch (e) {
      alert(e.response?.data?.error ?? "Error al crear actividad");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteActivity = async (id) => {
    if (!window.confirm("¿Eliminar esta actividad?")) return;
    setSaving(true);
    try {
      await groupsService.deleteActivity(group.id, id);
      await reloadActivities();
    } catch (e) {
      alert(e.response?.data?.error ?? "Error");
    } finally {
      setSaving(false);
    }
  };

  const handleAddTx = async () => {
    if (!txForm.description || !txForm.amount || !txForm.date) return;
    setSaving(true);
    try {
      await groupsService.addTransaction(group.id, txForm);
      setTxForm({type: "INGRESO", description: "", amount: "", date: ""});
      await reloadFinances();
    } catch (e) {
      alert(e.response?.data?.error ?? "Error al registrar transacción");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTx = async (id) => {
    if (!window.confirm("¿Eliminar esta transacción?")) return;
    setSaving(true);
    try {
      await groupsService.deleteTransaction(group.id, id);
      await reloadFinances();
    } catch (e) {
      alert(e.response?.data?.error ?? "Error");
    } finally {
      setSaving(false);
    }
  };

  const TABS = [
    {id: "members", label: "Miembros", icon: Users},
    {id: "leaders", label: "Líderes", icon: Crown},
    {id: "activities", label: "Actividades", icon: CalendarDays},
    {id: "finances", label: "Finanzas", icon: Wallet},
  ];

  const filteredAvailable = availableMembers.filter(
    (m) =>
      !groupMembers.some((gm) => gm.id === m.id) &&
      (m.first_name + " " + m.last_name)
        .toLowerCase()
        .includes(memberSearch.toLowerCase()),
  );

  const balance = finances.summary?.balance ?? 0;

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a Grupos
      </button>

      <div className="rounded-3xl border border-border bg-gradient-to-br from-card via-card to-cyan-500/5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 p-5 md:p-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30 shrink-0">
                <UsersRound size={19} />
              </div>
              <h1 className="text-2xl md:text-[1.75rem] font-bold tracking-tight text-foreground truncate">
                {group.name}
              </h1>
            </div>
            {group.description && (
              <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                {group.description}
              </p>
            )}
            <div className="flex flex-wrap gap-2 mt-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-2.5 py-1.5">
                <Users size={12} /> {groupMembers.length} miembro{groupMembers.length === 1 ? "" : "s"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-2.5 py-1.5">
                <Crown size={12} /> {leaders.length} líder{leaders.length === 1 ? "" : "es"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-2.5 py-1.5">
                <CalendarDays size={12} /> {activities.length} actividad{activities.length === 1 ? "" : "es"}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 font-semibold",
                  balance >= 0
                    ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-400"
                    : "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400",
                )}
              >
                <Wallet size={12} /> {fmtCurrency(balance)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              onClick={handlePrintMembers}
              disabled={groupMembers.length === 0}
              className="border-border text-muted-foreground hover:bg-accent h-8 text-xs px-3 gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" /> PDF
            </Button>
            <Button
              onClick={() => onEdit(group)}
              variant="outline"
              className="border-border text-muted-foreground hover:bg-accent h-8 text-xs px-3 gap-1.5"
            >
              <Edit className="w-3.5 h-3.5" /> Editar
            </Button>
            <Button
              onClick={() => onDelete(group)}
              variant="outline"
              className="border-red-800/60 text-red-700 dark:text-red-400 hover:bg-red-500/10 dark:bg-red-900/20 h-8 text-xs px-3 gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Eliminar
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 rounded-2xl border border-border bg-muted/50 p-1.5 shadow-inner">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200",
                activeTab === t.id
                  ? "bg-background text-foreground shadow-sm border border-border/80 ring-1 ring-cyan-500/15"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/70",
              )}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      <div>
        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && activeTab === "members" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-cyan-700 dark:text-cyan-400" />
                    Agregar miembro
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    placeholder="Buscar miembro..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="bg-muted/50 border-border text-foreground text-sm"
                  />
                  <select
                    value={selectedMember}
                    onChange={(e) => setSelectedMember(e.target.value)}
                    className="w-full h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="">Seleccionar miembro...</option>
                    {filteredAvailable.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.first_name} {m.last_name}
                      </option>
                    ))}
                  </select>
                  <Button
                    onClick={handleAddMember}
                    disabled={!selectedMember || saving}
                    className="w-full bg-cyan-600 hover:bg-cyan-700 text-white text-sm"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Agregar al grupo
                  </Button>
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-2">
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Users className="w-4 h-4 text-cyan-700 dark:text-cyan-400" />
                    Miembros del grupo ({groupMembers.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {groupMembers.length === 0 ? (
                    <div className="text-center py-10">
                      <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-40" />
                      <p className="text-sm text-muted-foreground">
                        No hay miembros en este grupo.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {groupMembers.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between bg-muted/40 border border-transparent hover:border-cyan-500/30 hover:bg-muted/60 rounded-xl px-3 py-2.5 transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <MemberAvatar
                              name={`${m.first_name} ${m.last_name}`}
                              photo={m.photo_url}
                            />
                            <div>
                              <p className="text-sm text-foreground font-medium">
                                {m.first_name} {m.last_name}
                              </p>
                              {m.phone && (
                                <p className="text-xs text-muted-foreground">
                                  {m.phone}
                                </p>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveMember(m.id)}
                            className="p-1.5 text-red-700 dark:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {!loading && activeTab === "leaders" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <BadgeCheck className="w-4 h-4 text-cyan-700 dark:text-cyan-400" />
                    Asignar cargo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <select
                    value={leaderForm.memberId}
                    onChange={(e) =>
                      setLeaderForm((f) => ({...f, memberId: e.target.value}))
                    }
                    className="w-full h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="">Seleccionar miembro...</option>
                    {availableMembers
                      .filter((m) => !leaders.some((l) => l.member_id === m.id))
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.first_name} {m.last_name}
                        </option>
                      ))}
                  </select>
                  <select
                    value={leaderForm.position}
                    onChange={(e) =>
                      setLeaderForm((f) => ({...f, position: e.target.value}))
                    }
                    className="w-full h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="">Seleccionar cargo...</option>
                    {GROUP_POSITIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  <Button
                    onClick={handleAddLeader}
                    disabled={
                      !leaderForm.memberId || !leaderForm.position || saving
                    }
                    className="w-full bg-cyan-600 hover:bg-cyan-700 text-white text-sm"
                  >
                    <BadgeCheck className="w-4 h-4 mr-2" />
                    Asignar
                  </Button>
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-2">
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Crown className="w-4 h-4 text-cyan-700 dark:text-cyan-400" />
                    Directiva ({leaders.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {leaders.length === 0 ? (
                    <div className="text-center py-10">
                      <Crown className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-40" />
                      <p className="text-sm text-muted-foreground">
                        No hay líderes asignados.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {leaders.map((l) => (
                        <div
                          key={l.id}
                          className="flex items-center justify-between bg-muted/40 border border-transparent hover:border-cyan-500/30 hover:bg-muted/60 rounded-xl px-3 py-3 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <MemberAvatar
                              name={`${l.first_name} ${l.last_name}`}
                              photo={l.photo_url}
                            />
                            <div>
                              <p className="text-sm text-foreground font-medium">
                                {l.first_name} {l.last_name}
                              </p>
                              <div className="flex items-center gap-1 mt-0.5">
                                <BadgeCheck className="w-3 h-3 text-cyan-700 dark:text-cyan-400" />
                                <p className="text-xs text-cyan-700 dark:text-cyan-300 font-medium">
                                  {l.position}
                                </p>
                              </div>
                              {l.start_date && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Desde {fmtDate(l.start_date)}
                                </p>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveLeader(l.id)}
                            className="p-1.5 text-red-700 dark:text-red-400 hover:bg-accent rounded-lg transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {!loading && activeTab === "activities" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Plus className="w-4 h-4 text-cyan-700 dark:text-cyan-400" />
                    Nueva actividad
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    placeholder="Título *"
                    value={activityForm.title}
                    onChange={(e) =>
                      setActivityForm((f) => ({...f, title: e.target.value}))
                    }
                    className="bg-background border-border text-foreground text-sm"
                  />
                  <Input
                    type="datetime-local"
                    value={activityForm.activityDate}
                    onChange={(e) =>
                      setActivityForm((f) => ({
                        ...f,
                        activityDate: e.target.value,
                      }))
                    }
                    className="bg-background border-border text-foreground text-sm"
                  />
                  <Input
                    placeholder="Lugar"
                    value={activityForm.location}
                    onChange={(e) =>
                      setActivityForm((f) => ({...f, location: e.target.value}))
                    }
                    className="bg-background border-border text-foreground text-sm"
                  />
                  <textarea
                    placeholder="Descripción"
                    value={activityForm.description}
                    onChange={(e) =>
                      setActivityForm((f) => ({
                        ...f,
                        description: e.target.value,
                      }))
                    }
                    rows={3}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <Button
                    onClick={handleAddActivity}
                    disabled={
                      !activityForm.title ||
                      !activityForm.activityDate ||
                      saving
                    }
                    className="w-full bg-cyan-600 hover:bg-cyan-700 text-white text-sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Guardar actividad
                  </Button>
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-2">
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-cyan-700 dark:text-cyan-400" />
                    Actividades ({activities.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {activities.length === 0 ? (
                    <div className="text-center py-10">
                      <CalendarDays className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-40" />
                      <p className="text-sm text-muted-foreground">
                        No hay actividades registradas.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activities.map((a) => (
                        <div
                          key={a.id}
                          className="bg-muted/50 rounded-xl px-4 py-3 border-l-2 border-cyan-500/50"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground">
                                {a.title}
                              </p>
                              <p className="text-xs text-cyan-700 dark:text-cyan-400 mt-0.5">
                                {fmtDateTime(a.activity_date)}
                              </p>
                              {a.location && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <MapPin className="w-3 h-3" />
                                  {a.location}
                                </p>
                              )}
                              {a.description && (
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                  {a.description}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => handleDeleteActivity(a.id)}
                              className="p-1.5 text-red-700 dark:text-red-400 hover:bg-accent rounded-lg transition-colors shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {!loading && activeTab === "finances" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 dark:from-emerald-900/40 dark:to-emerald-950/40 border-emerald-300 dark:border-emerald-700/50">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-emerald-700 dark:text-emerald-300 text-sm font-medium">Ingresos</p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {fmtCurrency(finances.summary?.totalIncome)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center shrink-0">
                    <ArrowUpCircle className="w-6 h-6 text-emerald-700 dark:text-emerald-400" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 dark:from-red-900/40 dark:to-red-950/40 border-red-300 dark:border-red-700/50">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-red-700 dark:text-red-300 text-sm font-medium">Egresos</p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {fmtCurrency(finances.summary?.totalExpense)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center shrink-0">
                    <ArrowDownCircle className="w-6 h-6 text-red-700 dark:text-red-400" />
                  </div>
                </CardContent>
              </Card>
              <Card
                className={cn(
                  "border",
                  balance >= 0
                    ? "bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 dark:from-cyan-900/40 dark:to-cyan-950/40 border-cyan-300 dark:border-cyan-700/50"
                    : "bg-gradient-to-br from-orange-500/10 to-orange-500/5 dark:from-orange-900/40 dark:to-orange-950/40 border-orange-300 dark:border-orange-700/50",
                )}
              >
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p
                      className={cn(
                        "text-sm font-medium",
                        balance >= 0
                          ? "text-cyan-700 dark:text-cyan-300"
                          : "text-orange-700 dark:text-orange-300",
                      )}
                    >
                      Balance
                    </p>
                    <p className="text-2xl font-bold text-foreground mt-1">{fmtCurrency(balance)}</p>
                  </div>
                  <div
                    className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                      balance >= 0 ? "bg-cyan-500/20" : "bg-orange-500/20",
                    )}
                  >
                    <TrendingUp
                      className={cn(
                        "w-6 h-6",
                        balance >= 0
                          ? "text-cyan-700 dark:text-cyan-400"
                          : "text-orange-700 dark:text-orange-400",
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div>
                <Card className="bg-card border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-cyan-700 dark:text-cyan-400" />
                      Registrar movimiento
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setTxForm((f) => ({...f, type: "INGRESO"}))
                        }
                        className={cn(
                          "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold border transition-colors",
                          txForm.type === "INGRESO"
                            ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
                            : "border-border text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <ArrowUpCircle className="w-3.5 h-3.5" /> Ingreso
                      </button>
                      <button
                        onClick={() =>
                          setTxForm((f) => ({...f, type: "EGRESO"}))
                        }
                        className={cn(
                          "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold border transition-colors",
                          txForm.type === "EGRESO"
                            ? "bg-red-500/20 border-red-500/40 text-red-700 dark:text-red-400"
                            : "border-border text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <ArrowDownCircle className="w-3.5 h-3.5" /> Egreso
                      </button>
                    </div>
                    <Input
                      placeholder="Descripción *"
                      value={txForm.description}
                      onChange={(e) =>
                        setTxForm((f) => ({...f, description: e.target.value}))
                      }
                      className="bg-background border-border text-foreground text-sm"
                    />
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="Monto *"
                      value={txForm.amount}
                      onChange={(e) =>
                        setTxForm((f) => ({...f, amount: e.target.value}))
                      }
                      className="bg-background border-border text-foreground text-sm"
                    />
                    <Input
                      type="date"
                      value={txForm.date}
                      onChange={(e) =>
                        setTxForm((f) => ({...f, date: e.target.value}))
                      }
                      className="bg-background border-border text-foreground text-sm"
                    />
                    <Button
                      onClick={handleAddTx}
                      disabled={
                        !txForm.description ||
                        !txForm.amount ||
                        !txForm.date ||
                        saving
                      }
                      className="w-full bg-cyan-600 hover:bg-cyan-700 text-white text-sm"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Guardar
                    </Button>
                  </CardContent>
                </Card>
              </div>
              <div className="lg:col-span-2">
                <Card className="bg-card border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-cyan-700 dark:text-cyan-400" />
                      Movimientos ({finances.transactions?.length ?? 0})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(finances.transactions?.length ?? 0) === 0 ? (
                      <div className="text-center py-10">
                        <Wallet className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-40" />
                        <p className="text-sm text-muted-foreground">
                          No hay movimientos registrados.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {finances.transactions.map((t) => (
                          <div
                            key={t.id}
                            className="flex items-center justify-between bg-muted/40 border border-transparent hover:border-cyan-500/30 hover:bg-muted/60 rounded-xl px-3 py-2.5 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                                  t.type === "INGRESO" ? "bg-emerald-500/15" : "bg-red-500/15",
                                )}
                              >
                                {t.type === "INGRESO" ? (
                                  <ArrowUpCircle className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                                ) : (
                                  <ArrowDownCircle className="w-4 h-4 text-red-700 dark:text-red-400" />
                                )}
                              </div>
                              <div>
                                <p className="text-sm text-foreground font-medium">
                                  {t.description}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {fmtDate(t.date)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "text-sm font-semibold",
                                  t.type === "INGRESO"
                                    ? "text-emerald-700 dark:text-emerald-400"
                                    : "text-red-700 dark:text-red-400",
                                )}
                              >
                                {t.type === "INGRESO" ? "+" : "-"}
                                {fmtCurrency(t.amount)}
                              </span>
                              <button
                                onClick={() => handleDeleteTx(t.id)}
                                className="p-1 text-red-700 dark:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// GroupsPage

export default function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [detailGroup, setDetailGroup] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentGroup, setCurrentGroup] = useState(null);
  const [formData, setFormData] = useState({name: "", description: ""});
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const data = await groupsService.getAll();
      const fresh = data.groups || [];
      setGroups(fresh);
      return fresh;
    } catch (error) {
      console.error("Error al cargar grupos:", error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setIsEditing(false);
    setCurrentGroup(null);
    setFormData({name: "", description: ""});
    setFormError("");
    setFormSuccess("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (group) => {
    setIsEditing(true);
    setCurrentGroup(group);
    setFormData({name: group.name || "", description: group.description || ""});
    setFormError("");
    setFormSuccess("");
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentGroup(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    try {
      if (isEditing && currentGroup) {
        await groupsService.update(currentGroup.id, {
          name: formData.name,
          description: formData.description || null,
        });
        setFormSuccess("Grupo actualizado exitosamente");
      } else {
        await groupsService.create({
          name: formData.name,
          description: formData.description || null,
        });
        setFormSuccess("Grupo creado exitosamente");
      }
      setTimeout(async () => {
        handleCloseModal();
        const fresh = await fetchGroups();
        if (detailGroup && isEditing && currentGroup) {
          const updated = fresh.find((g) => g.id === currentGroup.id);
          if (updated) setDetailGroup(updated);
        }
      }, 1200);
    } catch (error) {
      setFormError(error.response?.data?.error || "Error al guardar el grupo.");
    }
  };

  const handleDelete = async (group) => {
    if (
      !window.confirm(
        `¿Eliminar el grupo "${group.name}"? Esta acción no se puede deshacer.`,
      )
    )
      return;
    try {
      await groupsService.delete(group.id);
      setDetailGroup(null);
      fetchGroups();
    } catch (error) {
      alert(error.response?.data?.error || "Error al eliminar el grupo.");
    }
  };

  const filteredGroups = groups.filter((g) => {
    const s = searchTerm.toLowerCase();
    return (
      g.name.toLowerCase().includes(s) ||
      (g.description || "").toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      {detailGroup ? (
        <GroupDetailPage
          group={detailGroup}
          onBack={() => setDetailGroup(null)}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          onGroupUpdated={fetchGroups}
        />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Grupos</h1>
              <p className="text-muted-foreground mt-1">
                Administra los grupos y ministerios de la iglesia
              </p>
            </div>
            <Button
              onClick={handleOpenCreate}
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Grupo
            </Button>
          </div>

          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar grupo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-background border-border text-foreground"
                />
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-600 mx-auto" />
              <p className="text-muted-foreground mt-4">Cargando grupos...</p>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="text-center py-12">
              <UsersRound className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">No se encontraron grupos</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredGroups.map((group) => (
                <Card
                  key={group.id}
                  onClick={() => setDetailGroup(group)}
                  className="bg-card border border-border cursor-pointer transition-all duration-200 hover:shadow-cyan-500/10 hover:shadow-lg hover:border-cyan-500/50"
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-foreground flex items-center gap-2 text-base">
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0">
                        <UsersRound className="h-4 w-4 text-cyan-700 dark:text-cyan-400" />
                      </div>
                      <span className="truncate">{group.name}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {group.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {group.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-muted-foreground gap-1.5">
                          <Users className="h-3.5 w-3.5 text-cyan-700 dark:text-cyan-400" />
                          <span className="text-sm">
                            {group.member_count ?? 0} miembro(s)
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-cyan-700 dark:text-cyan-400 font-medium">
                          Ver detalle <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent onClose={handleCloseModal}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar Grupo" : "Nuevo Grupo"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Actualiza la información del grupo"
                : "Crea un nuevo grupo o ministerio"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            {formError && (
              <div className="bg-red-500/10 dark:bg-red-900/20 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span className="text-sm">{formError}</span>
              </div>
            )}
            {formSuccess && (
              <div className="bg-green-500/10 dark:bg-green-900/20 border border-green-300 dark:border-green-800 text-green-700 dark:text-green-300 rounded-lg p-3 flex items-start gap-2">
                <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span className="text-sm">{formSuccess}</span>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Nombre *
              </label>
              <Input
                name="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((f) => ({...f, name: e.target.value}))
                }
                required
                className="bg-background border-border text-foreground"
                placeholder="Ej: Jóvenes, Adoración, Niños"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Descripción
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((f) => ({...f, description: e.target.value}))
                }
                rows={3}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-cyan-600"
                placeholder="Describe el propósito del grupo..."
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                onClick={handleCloseModal}
                variant="outline"
                className="border-border text-muted-foreground hover:bg-accent"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white"
                disabled={!!formSuccess}
              >
                {isEditing ? "Actualizar" : "Crear"} Grupo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
