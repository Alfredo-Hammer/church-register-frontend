import {useEffect, useMemo, useState} from "react";
import {membersService, visitorsService} from "@/services/api";
import {cn} from "@/lib/utils";
import {
  Cake,
  ChevronLeft,
  ChevronRight,
  PartyPopper,
  Phone,
  Mail,
  Users,
  UserPlus,
  CalendarHeart,
} from "lucide-react";

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const AVATAR_COLORS = [
  "from-blue-500 to-blue-700",
  "from-violet-500 to-purple-700",
  "from-emerald-500 to-green-700",
  "from-rose-500 to-pink-700",
  "from-amber-500 to-orange-700",
  "from-cyan-500 to-teal-700",
];
function avatarColor(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

// El backend manda ISO con hora en UTC (ej. "1990-03-15T05:00:00.000Z") —
// se reconstruye a mediodía local para que el día no se corra por huso
// horario, mismo truco que ya usa reportPrint.js/MemberDetailPage.
function localDate(isoDate) {
  return new Date(isoDate.slice(0, 10) + "T12:00:00");
}

const TODAY = new Date();
const CURRENT_YEAR = TODAY.getFullYear();

function BirthdayCard({person}) {
  const isMember = person.kind === "member";
  const d = localDate(person.birth_date);
  const day = d.getDate();
  const turningAge = CURRENT_YEAR - d.getFullYear();
  const isToday = day === TODAY.getDate() && d.getMonth() === TODAY.getMonth();
  const initials = `${person.first_name?.[0] ?? ""}${person.last_name?.[0] ?? ""}`.toUpperCase();
  const grad = avatarColor(`${person.first_name}${person.last_name}`);

  return (
    <div
      className={cn(
        "flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200",
        isToday
          ? "bg-gradient-to-r from-amber-500/10 to-rose-500/10 border-amber-500/40 shadow-sm"
          : "bg-card border-border hover:border-pink-500/30 hover:shadow-md hover:shadow-pink-500/5",
      )}
    >
      <div
        className={cn(
          "flex flex-col items-center justify-center w-12 h-12 rounded-xl shrink-0 font-bold",
          isToday
            ? "bg-gradient-to-br from-amber-400 to-rose-500 text-white shadow-md shadow-amber-500/30"
            : "bg-muted/60 border border-border text-foreground",
        )}
      >
        <span className="text-lg leading-none">{day}</span>
      </div>

      {isMember && person.photo_url ? (
        <img
          src={person.photo_url}
          alt={person.first_name}
          className="w-12 h-12 rounded-full object-cover shrink-0 ring-2 ring-background shadow"
        />
      ) : (
        <div
          className={`w-12 h-12 rounded-full shrink-0 flex items-center justify-center bg-gradient-to-br ${grad} text-white font-bold text-sm shadow ring-2 ring-background`}
        >
          {initials}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-foreground font-semibold text-sm truncate">
            {person.first_name} {person.last_name}
          </p>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${
              isMember
                ? "bg-blue-500/15 text-blue-700 dark:text-blue-400"
                : "bg-amber-500/15 text-amber-800 dark:text-amber-400"
            }`}
          >
            {isMember ? <Users className="w-3 h-3" /> : <UserPlus className="w-3 h-3" />}
            {isMember ? "Miembro" : "Visitante"}
          </span>
          {isToday && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500 text-white shrink-0">
              <PartyPopper className="w-3 h-3" /> Hoy
            </span>
          )}
        </div>
        <p className="text-muted-foreground text-xs mt-0.5">
          Cumple {turningAge} años
        </p>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {person.phone && (
          <a
            href={`tel:${person.phone}`}
            title={person.phone}
            className="w-8 h-8 rounded-lg bg-muted hover:bg-accent text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
          >
            <Phone className="w-3.5 h-3.5" />
          </a>
        )}
        {person.email && (
          <a
            href={`mailto:${person.email}`}
            title={person.email}
            className="w-8 h-8 rounded-lg bg-muted hover:bg-accent text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
          >
            <Mail className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

export default function BirthdaysPage() {
  const [month, setMonth] = useState(TODAY.getMonth() + 1);
  const [members, setMembers] = useState([]);
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | member | visitor

  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      try {
        const [m, v] = await Promise.all([
          membersService.getBirthdays(month),
          visitorsService.getBirthdays(month),
        ]);
        if (!ignore) {
          setMembers(m.birthdays || []);
          setVisitors(v.birthdays || []);
        }
      } catch {
        if (!ignore) {
          setMembers([]);
          setVisitors([]);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [month]);

  const combined = useMemo(() => {
    const tagged = [
      ...members.map((m) => ({...m, kind: "member"})),
      ...visitors.map((v) => ({...v, kind: "visitor"})),
    ];
    tagged.sort((a, b) => {
      const da = localDate(a.birth_date).getDate();
      const db = localDate(b.birth_date).getDate();
      if (da !== db) return da - db;
      return a.first_name.localeCompare(b.first_name);
    });
    return tagged;
  }, [members, visitors]);

  const filtered = combined.filter((p) => filter === "all" || p.kind === filter);
  const todayBirthdays = filtered.filter((p) => {
    const d = localDate(p.birth_date);
    return d.getDate() === TODAY.getDate() && d.getMonth() === TODAY.getMonth();
  });
  const isCurrentMonth = month === TODAY.getMonth() + 1;

  const goMonth = (delta) => {
    setMonth((m) => ((m - 1 + delta + 12) % 12) + 1);
  };

  const restOfMonth = filtered.filter((p) => !(isCurrentMonth && todayBirthdays.includes(p)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-border bg-gradient-to-br from-card via-card to-pink-500/5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 p-5 md:p-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-500/30 shrink-0">
                <Cake size={19} />
              </div>
              <h1 className="text-2xl md:text-[1.75rem] font-bold tracking-tight text-foreground">
                Cumpleaños
              </h1>
            </div>
            <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
              Celebra a los miembros y visitantes de tu iglesia cada mes.
            </p>
            <div className="flex flex-wrap gap-2 mt-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-2.5 py-1.5">
                <CalendarHeart size={12} />
                {loading
                  ? "Cargando…"
                  : `${filtered.length} cumpleaño${filtered.length !== 1 ? "s" : ""} en ${MONTH_NAMES[month - 1]}`}
              </span>
              {isCurrentMonth && todayBirthdays.length > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 font-semibold text-amber-700 dark:text-amber-400">
                  <PartyPopper size={12} /> {todayBirthdays.length} hoy
                </span>
              )}
            </div>
          </div>

          {/* Navegador de mes */}
          <div className="flex items-center gap-1 bg-background/80 border border-border rounded-xl p-1 shrink-0">
            <button
              onClick={() => goMonth(-1)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-foreground w-28 text-center">
              {MONTH_NAMES[month - 1]}
            </span>
            <button
              onClick={() => goMonth(1)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            {!isCurrentMonth && (
              <button
                onClick={() => setMonth(TODAY.getMonth() + 1)}
                className="ml-1 px-2.5 h-8 rounded-lg text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                Hoy
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filtro */}
      <div className="flex flex-wrap gap-1.5 rounded-2xl border border-border bg-muted/50 p-1.5 shadow-inner w-fit">
        {[
          {id: "all", label: "Todos", icon: CalendarHeart},
          {id: "member", label: "Miembros", icon: Users},
          {id: "visitor", label: "Visitantes", icon: UserPlus},
        ].map((f) => {
          const Icon = f.icon;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200",
                filter === f.id
                  ? "bg-background text-foreground shadow-sm border border-border/80 ring-1 ring-pink-500/15"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/70",
              )}
            >
              <Icon className="w-4 h-4" /> {f.label}
            </button>
          );
        })}
      </div>

      {/* Destacado de hoy */}
      {isCurrentMonth && todayBirthdays.length > 0 && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/15 via-rose-500/10 to-pink-500/15 border border-amber-500/30 p-5 md:p-6">
          <PartyPopper className="absolute -right-4 -top-4 w-28 h-28 text-amber-500/10 rotate-12 pointer-events-none" />
          <div className="relative flex items-center gap-2.5 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-rose-500 text-white shadow-md shadow-amber-500/30 shrink-0">
              <PartyPopper className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-foreground">
              ¡Hoy cumple{todayBirthdays.length === 1 ? "" : "n"} años!
            </h2>
          </div>
          <div className="relative grid grid-cols-1 md:grid-cols-2 gap-3">
            {todayBirthdays.map((p) => (
              <BirthdayCard key={`${p.kind}-${p.id}`} person={p} />
            ))}
          </div>
        </div>
      )}

      {/* Lista del mes */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-card border border-border rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-card border border-border rounded-2xl">
          <Cake className="w-10 h-10 mb-3 opacity-20" />
          <p className="text-sm font-medium">Sin cumpleaños registrados en {MONTH_NAMES[month - 1]}.</p>
        </div>
      ) : restOfMonth.length > 0 ? (
        <div className="space-y-3">
          {isCurrentMonth && todayBirthdays.length > 0 && (
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">
              Resto del mes
            </p>
          )}
          {restOfMonth.map((p) => (
            <BirthdayCard key={`${p.kind}-${p.id}`} person={p} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
