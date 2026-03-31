import PrintHeader from "./PrintHeader";
import PrintFooter from "./PrintFooter";
import PrintPage from "./PrintPage";

// ── helpers ───────────────────────────────────────────────────────────────────
const AVATAR_BG = [
  ["#3b5bdb", "#1c3cb5"], // azul
  ["#6741d9", "#4c2daa"], // violeta
  ["#0ca678", "#087556"], // esmeralda
  ["#e03131", "#b52020"], // rojo
  ["#e8590c", "#bb4700"], // naranja
  ["#0891b2", "#0a6e87"], // cian
];
function avatarGradient(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  const [from, to] = AVATAR_BG[Math.abs(h) % AVATAR_BG.length];
  return `linear-gradient(135deg, ${from}, ${to})`;
}

const fmtDate = (d) => {
  if (!d) return "—";
  return new Date(d.slice(0, 10) + "T12:00:00").toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const calcAge = (d) => {
  if (!d) return null;
  const birth = new Date(d.slice(0, 10) + "T12:00:00");
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

const STATUS_CFG = {
  ACTIVO: {bg: "#d1fae5", color: "#065f46", border: "#6ee7b7", label: "Activo"},
  INACTIVO: {
    bg: "#fee2e2",
    color: "#991b1b",
    border: "#fca5a5",
    label: "Inactivo",
  },
  VISITANTE: {
    bg: "#fef3c7",
    color: "#92400e",
    border: "#fcd34d",
    label: "Visitante",
  },
};

const AGE_GROUP_CFG = {
  NIÑO: {bg: "#ccfbf1", color: "#0f766e", border: "#5eead4", label: "Niño"},
  JOVEN: {bg: "#ede9fe", color: "#5b21b6", border: "#c4b5fd", label: "Joven"},
};

// ── sub-components ────────────────────────────────────────────────────────────

function DataField({label, value, accent}) {
  if (!value || value === "—") return null;
  return (
    <div style={{marginBottom: 10}}>
      <p
        style={{
          fontSize: 9,
          fontWeight: 600,
          color: accent || "#6b7280",
          textTransform: "uppercase",
          letterSpacing: 0.8,
          margin: 0,
          fontFamily: "Arial, sans-serif",
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: 12,
          color: "#111827",
          margin: "2px 0 0",
          fontFamily: "Arial, sans-serif",
          lineHeight: 1.4,
        }}
      >
        {value}
      </p>
    </div>
  );
}

function SectionTitle({children, color}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginBottom: 10,
        marginTop: 2,
      }}
    >
      <div
        style={{
          width: 3,
          height: 14,
          borderRadius: 2,
          background: color || "#4f46e5",
          flexShrink: 0,
        }}
      />
      <p
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: color || "#4f46e5",
          textTransform: "uppercase",
          letterSpacing: 1,
          margin: 0,
          fontFamily: "Arial, sans-serif",
        }}
      >
        {children}
      </p>
    </div>
  );
}

function Divider() {
  return <div style={{height: 1, background: "#e5e7eb", margin: "14px 0"}} />;
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function MemberPrintCard({member, groups = [], church}) {
  const initials =
    `${member.first_name?.[0] ?? ""}${member.last_name?.[0] ?? ""}`.toUpperCase();
  const grad = avatarGradient(`${member.first_name}${member.last_name}`);
  const age = calcAge(member.birth_date);
  const statusCfg = STATUS_CFG[member.status] ?? STATUS_CFG.ACTIVO;
  const ageGrpCfg = AGE_GROUP_CFG[member.age_group];
  const isChild = member.age_group === "NIÑO";
  const isYouth = member.age_group === "JOVEN";
  const guardianName = member.guardian_id
    ? `${member.guardian_first_name || ""} ${member.guardian_last_name || ""}`.trim()
    : member.guardian_name || null;

  return (
    <PrintPage>
      <PrintHeader
        church={church}
        documentTitle="Ficha de Miembro"
        documentMeta={`${member.first_name} ${member.last_name}`}
      />

      {/* ── Perfil principal ────────────────────────────────────────────── */}
      <div style={{padding: "20px 28px 0"}}>
        <div style={{display: "flex", alignItems: "flex-start", gap: 20}}>
          {/* Avatar o foto */}
          <div style={{flexShrink: 0}}>
            {member.photo_url ? (
              <img
                src={member.photo_url}
                alt={member.first_name}
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: 12,
                  objectFit: "cover",
                  border: "3px solid #e5e7eb",
                  boxShadow: "0 2px 8px rgba(0,0,0,.1)",
                }}
              />
            ) : (
              <div
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: 12,
                  background: grad,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 8px rgba(0,0,0,.18)",
                  border: "3px solid rgba(255,255,255,.3)",
                }}
              >
                <span
                  style={{
                    fontSize: 30,
                    fontWeight: 700,
                    color: "#fff",
                    fontFamily: "Arial, sans-serif",
                    lineHeight: 1,
                  }}
                >
                  {initials}
                </span>
              </div>
            )}
          </div>

          {/* Nombre + badges + ID */}
          <div style={{flex: 1}}>
            <h2
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "#111827",
                margin: "0 0 6px",
                fontFamily: "Arial, sans-serif",
                lineHeight: 1.2,
              }}
            >
              {member.first_name} {member.last_name}
            </h2>

            {/* Badges de estado y grupo de edad */}
            <div
              style={{
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "3px 10px",
                  borderRadius: 20,
                  fontSize: 10,
                  fontWeight: 700,
                  background: statusCfg.bg,
                  color: statusCfg.color,
                  border: `1px solid ${statusCfg.border}`,
                  fontFamily: "Arial, sans-serif",
                }}
              >
                {statusCfg.label}
              </span>
              {ageGrpCfg && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "3px 10px",
                    borderRadius: 20,
                    fontSize: 10,
                    fontWeight: 700,
                    background: ageGrpCfg.bg,
                    color: ageGrpCfg.color,
                    border: `1px solid ${ageGrpCfg.border}`,
                    fontFamily: "Arial, sans-serif",
                  }}
                >
                  {ageGrpCfg.label}
                </span>
              )}
              {member.gender && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "3px 10px",
                    borderRadius: 20,
                    fontSize: 10,
                    fontWeight: 600,
                    background: "#f3f4f6",
                    color: "#374151",
                    border: "1px solid #d1d5db",
                    fontFamily: "Arial, sans-serif",
                  }}
                >
                  {member.gender === "MASCULINO" ? "Masculino" : "Femenino"}
                </span>
              )}
            </div>

            {/* Fecha de ingreso */}
            <p
              style={{
                fontSize: 10,
                color: "#9ca3af",
                margin: 0,
                fontFamily: "Arial, sans-serif",
              }}
            >
              Miembro desde {fmtDate(member.created_at)}
            </p>
          </div>
        </div>
      </div>

      <Divider />

      {/* ── Grid de secciones ───────────────────────────────────────────── */}
      <div
        style={{
          padding: "0 28px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0 32px",
        }}
      >
        {/* Columna izquierda — Información personal */}
        <div>
          <SectionTitle color="#4f46e5">Información Personal</SectionTitle>
          <DataField
            label="Fecha de nacimiento"
            value={
              member.birth_date
                ? `${fmtDate(member.birth_date)}${age !== null ? ` · ${age} años` : ""}`
                : null
            }
          />
          <DataField
            label="Género"
            value={
              member.gender === "MASCULINO"
                ? "Masculino"
                : member.gender === "FEMENINO"
                  ? "Femenino"
                  : member.gender || null
            }
          />
        </div>

        {/* Columna derecha — Datos de contacto */}
        <div>
          <SectionTitle color="#059669">Contacto</SectionTitle>
          <DataField label="Teléfono" value={member.phone || null} />
          <DataField label="Email" value={member.email || null} />
          <DataField label="Dirección" value={member.address || null} />
        </div>
      </div>

      {/* ── Sección niños / jóvenes ──────────────────────────────────────── */}
      {(isChild || isYouth) && (
        <>
          <Divider />
          <div style={{padding: "0 28px"}}>
            <SectionTitle color={isChild ? "#0f766e" : "#5b21b6"}>
              {isChild ? "Información del Niño" : "Información del Joven"}
            </SectionTitle>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0 32px",
              }}
            >
              <div>
                {guardianName && (
                  <DataField label="Padre / Tutor" value={guardianName} />
                )}
                {isChild && member.grade && (
                  <DataField label="Grado escolar" value={member.grade} />
                )}
              </div>
              <div>
                {member.emergency_contact && (
                  <DataField
                    label="Contacto de emergencia"
                    value={member.emergency_contact}
                  />
                )}
                {member.allergies && (
                  <div style={{marginBottom: 10}}>
                    <p
                      style={{
                        fontSize: 9,
                        fontWeight: 600,
                        color: "#dc2626",
                        textTransform: "uppercase",
                        letterSpacing: 0.8,
                        margin: 0,
                        fontFamily: "Arial, sans-serif",
                      }}
                    >
                      Alergias / Condiciones médicas
                    </p>
                    <p
                      style={{
                        fontSize: 12,
                        color: "#b91c1c",
                        margin: "2px 0 0",
                        fontFamily: "Arial, sans-serif",
                        lineHeight: 1.4,
                        fontWeight: 500,
                      }}
                    >
                      {member.allergies}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Grupos / Ministerios ─────────────────────────────────────────── */}
      {groups.length > 0 && (
        <>
          <Divider />
          <div style={{padding: "0 28px"}}>
            <SectionTitle color="#d97706">Grupos y Ministerios</SectionTitle>
            <div style={{display: "flex", flexWrap: "wrap", gap: 6}}>
              {groups.map((g) => (
                <span
                  key={g.id}
                  style={{
                    display: "inline-block",
                    padding: "4px 12px",
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 600,
                    background: "#fffbeb",
                    color: "#92400e",
                    border: "1px solid #fde68a",
                    fontFamily: "Arial, sans-serif",
                  }}
                >
                  {g.name}
                </span>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Palabras del Pastor / Líder ──────────────────────────────────── */}
      {member.pastor_notes && (
        <>
          <Divider />
          <div style={{padding: "0 28px"}}>
            <SectionTitle color="#4f46e5">
              Palabras del Pastor / Líder
            </SectionTitle>
            <div
              style={{
                background: "#f5f3ff",
                border: "1px solid #c4b5fd",
                borderRadius: 8,
                padding: "10px 14px",
              }}
            >
              <p
                style={{
                  fontSize: 12,
                  color: "#374151",
                  lineHeight: 1.65,
                  margin: 0,
                  fontStyle: "italic",
                  fontFamily: "Arial, sans-serif",
                }}
              >
                &ldquo;{member.pastor_notes}&rdquo;
              </p>
            </div>
          </div>
        </>
      )}

      {/* ── Spacer para empujar el footer abajo ─────────────────────────── */}
      <div style={{flex: 1, minHeight: 20}} />

      <PrintFooter church={church} generatedLabel="Ficha de Miembro" />
    </PrintPage>
  );
}
