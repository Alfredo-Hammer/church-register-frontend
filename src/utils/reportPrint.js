// ───────────────────────────────────────────────────────────────────────────
// reportPrint.js — Generadores de HTML para reportes imprimibles / PDF
// Cada función devuelve un documento HTML completo (string).
// Uso:  const win = window.open('', '_blank'); win.document.write(html); win.document.close();
// ───────────────────────────────────────────────────────────────────────────

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const fmtM = (v) =>
  "$" + Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const nowLabel = () =>
  new Date().toLocaleDateString("es-DO", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

// ── CSS base embebido ──────────────────────────────────────────────────────
const CSS = `
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;color:#1e293b;background:#fff;padding:28px;font-size:13px;line-height:1.5}
  h1{font-size:22px;font-weight:700;color:#0f172a}
  h2{font-size:14px;font-weight:600;color:#0f172a;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #e2e8f0;text-transform:uppercase;letter-spacing:.04em}
  .hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:3px solid #f97316}
  .hdr-l p{color:#64748b;font-size:12px;margin-top:2px}
  .hdr-l .period{color:#ea580c;font-weight:600;font-size:12px;margin-top:4px}
  .hdr-r{text-align:right;color:#64748b;font-size:11px;line-height:1.6}
  .hdr-r strong{color:#0f172a;font-size:13px}
  .metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px}
  .metric{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px}
  .metric-lbl{font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.06em}
  .metric-val{font-size:22px;font-weight:700;color:#0f172a;margin-top:2px}
  .metric-sub{font-size:10px;color:#94a3b8;margin-top:1px}
  .section{margin-bottom:22px}
  .two-col{display:grid;grid-template-columns:1fr 1fr;gap:20px}
  table{width:100%;border-collapse:collapse}
  th{background:#f1f5f9;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#64748b;padding:7px 10px;text-align:left}
  td{padding:7px 10px;border-bottom:1px solid #f1f5f9;color:#334155;font-size:12px}
  tr:last-child td{border-bottom:none}
  .bar-row{display:flex;align-items:center;gap:8px;margin-bottom:7px}
  .bar-lbl{width:110px;font-size:11px;color:#475569;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .bar-wrap{flex:1;height:14px;background:#f1f5f9;border-radius:4px;overflow:hidden}
  .bar{height:100%;border-radius:4px}
  .bar-val{width:90px;text-align:right;font-size:11px;font-weight:600;color:#0f172a;flex-shrink:0}
  .rank-row{display:flex;align-items:center;gap:10px;padding:6px 10px;border-radius:6px;margin-bottom:4px;background:#f8fafc}
  .rank-num{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0}
  .actions{position:fixed;bottom:20px;right:20px;display:flex;gap:8px;z-index:100}
  .btn-print{background:#f97316;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;box-shadow:0 4px 14px rgba(249,115,22,.45)}
  .btn-close{background:#e2e8f0;color:#334155;border:none;padding:10px 16px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer}
  .footer{margin-top:28px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;text-align:center}
  /* ── Church branding ── */
  .church-brand{display:flex;align-items:center;gap:16px;margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #f1f5f9}
  .church-brand img{height:58px;max-width:140px;object-fit:contain;display:block;border-radius:4px;flex-shrink:0}
  .church-brand-placeholder{width:52px;height:52px;border-radius:50%;background:#f1f5f9;border:2px solid #e2e8f0;display:flex;align-items:center;justify-content:center;font-size:22px;color:#cbd5e1;flex-shrink:0}
  .church-brand-name{font-size:17px;font-weight:700;color:#0f172a;letter-spacing:0.2px}
  .church-brand-info{font-size:11px;color:#64748b;margin-top:3px;line-height:1.6}
  .church-brand-pastor{font-size:11px;color:#475569;font-style:italic;margin-top:1px}
  .church-brand-meta{font-size:10px;color:#94a3b8;margin-top:2px}
  @media print{
    .actions{display:none!important}
    body{padding:0}
    @page{margin:1.2cm}
  }
  /* ── Ficha en blanco (para llenar a mano) — compacta, cabe en 1 página ── */
  .form-section{margin-bottom:12px}
  .form-section-title{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#ea580c;margin-bottom:6px;padding-bottom:3px;border-bottom:1px solid #fed7aa}
  .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px 20px}
  .form-field{display:flex;flex-direction:column;gap:3px}
  .form-field.full{grid-column:1/-1}
  .form-label{font-size:10.5px;color:#64748b;font-weight:600}
  .form-line{border-bottom:1px solid #94a3b8;height:15px}
  .form-box{border:1px solid #cbd5e1;border-radius:6px;min-height:50px}
  .check-group{display:flex;flex-wrap:wrap;gap:10px;padding-top:1px}
  .check-item{display:flex;align-items:center;gap:5px;font-size:11px;color:#334155}
  .check-box{width:11px;height:11px;border:1.5px solid #64748b;border-radius:3px;display:inline-block;flex-shrink:0}
  .sig-row{display:flex;justify-content:center;gap:60px;margin-top:20px}
  .sig-block{text-align:center;width:220px}
  .sig-blank-line{border-top:1px solid #1e293b;padding-top:6px;font-size:10px;color:#64748b}
`;

// ── Botones flotantes (no se imprimen) ────────────────────────────────────
const actionBtns = `
  <div class="actions">
    <button class="btn-print" onclick="window.print()">🖨&nbsp; Imprimir / Guardar PDF</button>
    <button class="btn-close" onclick="window.close()">✕ Cerrar</button>
  </div>
`;

// ── Wrapper HTML completo ─────────────────────────────────────────────────
function doc(title, body) {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>${title} — Sistema Eclesiástico</title>
<style>${CSS}</style></head><body>${body}${actionBtns}</body></html>`;
}

// ── Cabecera de cada reporte (con branding de iglesia) ───────────────────
function hdr(title, subtitle, period, church = {}) {
  const hasLogo = !!church.logoUrl;
  const hasChurch = !!church.name;

  const logoBlock = hasLogo
    ? `<img src="${church.logoUrl}" alt="Logo">`
    : `<div class="church-brand-placeholder">✝</div>`;

  const infoLine = [church.address, church.phone, church.city && church.country
    ? `${church.city}, ${church.country}` : (church.city || church.country || "")]
    .filter(Boolean).join(" · ");

  const brandHtml = hasChurch ? `
  <div class="church-brand">
    ${logoBlock}
    <div>
      <div class="church-brand-name">${church.name}</div>
      ${infoLine ? `<div class="church-brand-info">${infoLine}</div>` : ""}
      ${church.pastorName ? `<div class="church-brand-pastor">Pastor: ${church.pastorName}</div>` : ""}
      ${church.foundedYear ? `<div class="church-brand-meta">Fundada en ${church.foundedYear}${church.denomination ? ` · ${church.denomination}` : ""}</div>` : (church.denomination ? `<div class="church-brand-meta">${church.denomination}</div>` : "")}
    </div>
  </div>` : "";

  return `${brandHtml}<div class="hdr">
    <div class="hdr-l">
      <h1>${title}</h1>
      <p>${subtitle}</p>
      ${period ? `<p class="period">${period}</p>` : ""}
    </div>
    <div class="hdr-r">
      Generado: ${nowLabel()}
    </div>
  </div>`;
}

// ── Pie de página ─────────────────────────────────────────────────────────
function footerFor(church = {}) {
  const name = church.name || "Sistema de Control Eclesiástico";
  return `<div class="footer">${name} · Reporte generado automáticamente · Confidencial</div>`;
}

// ─────────────────────────────────────────────────────────────────────────
// 1. REPORTE GENERAL
// ─────────────────────────────────────────────────────────────────────────
export function buildOverviewReport({ mStats, fSummary, dSummary, bStats, gStats }, church = {}) {
  const balance = fSummary?.summary?.balance || 0;
  const baptismsYear = bStats?.byMonth?.reduce((s, m) => s + parseInt(m.count), 0) || 0;

  const catRows = (cats, color) =>
    cats.length === 0
      ? `<tr><td colspan="3" style="text-align:center;color:#94a3b8;padding:12px">Sin datos</td></tr>`
      : cats
        .map(
          (c) => `<tr>
              <td>${c.category_name}</td>
              <td style="text-align:right;font-weight:600;color:${color}">${fmtM(c.total)}</td>
              <td style="text-align:right;color:#94a3b8">${c.transaction_count}</td>
            </tr>`
        )
        .join("");

  const ingresos = (fSummary?.byCategory || []).filter((c) => c.category_type === "INGRESO");
  const egresos = (fSummary?.byCategory || []).filter((c) => c.category_type === "EGRESO");

  return doc("Reporte General", `
    ${hdr("Reporte General", "Resumen ejecutivo de estadísticas de la iglesia", "", church)}

    <div class="metrics">
      <div class="metric"><div class="metric-lbl">Miembros Activos</div><div class="metric-val">${mStats?.active || 0}</div><div class="metric-sub">de ${mStats?.total || 0} registrados</div></div>
      <div class="metric"><div class="metric-lbl">Balance General</div><div class="metric-val" style="color:${balance >= 0 ? "#15803d" : "#dc2626"}">${fmtM(Math.abs(balance))}</div><div class="metric-sub">${balance >= 0 ? "Superávit" : "Déficit"}</div></div>
      <div class="metric"><div class="metric-lbl">Total Diezmos</div><div class="metric-val">${fmtM(dSummary?.summary?.total)}</div><div class="metric-sub">${dSummary?.summary?.count || 0} registros</div></div>
      <div class="metric"><div class="metric-lbl">Bautismos Histórico</div><div class="metric-val">${bStats?.total || 0}</div><div class="metric-sub">${baptismsYear} en ${new Date().getFullYear()}</div></div>
      <div class="metric"><div class="metric-lbl">Grupos Activos</div><div class="metric-val">${gStats?.total || 0}</div><div class="metric-sub">${gStats?.membersInGroups || 0} miembros en grupos</div></div>
      <div class="metric"><div class="metric-lbl">Contribuyentes</div><div class="metric-val">${dSummary?.summary?.uniqueDonors || 0}</div><div class="metric-sub">donantes únicos</div></div>
    </div>

    <div class="section">
      <h2>Resumen Financiero</h2>
      <table>
        <thead><tr><th>Concepto</th><th style="text-align:right">Monto</th></tr></thead>
        <tbody>
          <tr><td>Total Ingresos</td><td style="text-align:right;font-weight:600;color:#15803d">${fmtM(fSummary?.summary?.totalIngresos)}</td></tr>
          <tr><td>Total Egresos</td><td style="text-align:right;font-weight:600;color:#dc2626">${fmtM(fSummary?.summary?.totalEgresos)}</td></tr>
          <tr style="background:#f8fafc"><td><strong>Balance</strong></td><td style="text-align:right;font-weight:700;color:${balance >= 0 ? "#15803d" : "#dc2626"};font-size:14px">${balance >= 0 ? "+" : "−"}${fmtM(Math.abs(balance))}</td></tr>
        </tbody>
      </table>
    </div>

    <div class="two-col">
      <div class="section">
        <h2>Ingresos por Categoría</h2>
        <table>
          <thead><tr><th>Categoría</th><th style="text-align:right">Total</th><th style="text-align:right">Trans.</th></tr></thead>
          <tbody>${catRows(ingresos, "#15803d")}</tbody>
        </table>
      </div>
      <div class="section">
        <h2>Egresos por Categoría</h2>
        <table>
          <thead><tr><th>Categoría</th><th style="text-align:right">Total</th><th style="text-align:right">Trans.</th></tr></thead>
          <tbody>${catRows(egresos, "#dc2626")}</tbody>
        </table>
      </div>
    </div>
    ${footerFor(church)}
  `);
}

// ─────────────────────────────────────────────────────────────────────────
// 2. REPORTE DE MIEMBROS
// ─────────────────────────────────────────────────────────────────────────
export function buildMembersReport(stats, church = {}) {
  const { total, active, birthdaysThisMonth, byGender = [], byStatus = [], byAgeGroup = [] } = stats;
  const GENDER_LABELS = { M: "Masculino", F: "Femenino", OTRO: "Otro" };
  const STATUS_COLORS = { ACTIVO: "#22c55e", INACTIVO: "#94a3b8", VISITANTE: "#eab308", TRANSFERIDO: "#3b82f6" };
  const AGE_GROUP_COLORS = { ADULTO: "#3b82f6", JOVEN: "#8b5cf6", NIÑO: "#f59e0b" };

  const maxG = Math.max(...byGender.map((g) => parseInt(g.count)), 1);
  const maxS = Math.max(...byStatus.map((s) => parseInt(s.count)), 1);
  const maxA = Math.max(...byAgeGroup.map((a) => parseInt(a.count)), 1);

  const gRows = byGender
    .map((g) => `<div class="bar-row">
        <div class="bar-lbl">${GENDER_LABELS[g.gender] || g.gender}</div>
        <div class="bar-wrap"><div class="bar" style="background:#3b82f6;width:${(parseInt(g.count) / maxG) * 100}%"></div></div>
        <div class="bar-val">${g.count} (${total > 0 ? ((parseInt(g.count) / total) * 100).toFixed(1) : 0}%)</div>
      </div>`)
    .join("") || `<p style="color:#94a3b8;font-size:12px">Sin datos</p>`;

  const sRows = byStatus
    .map((s) => `<div class="bar-row">
        <div class="bar-lbl">${s.status}</div>
        <div class="bar-wrap"><div class="bar" style="background:${STATUS_COLORS[s.status] || "#8b5cf6"};width:${(parseInt(s.count) / maxS) * 100}%"></div></div>
        <div class="bar-val">${s.count} (${total > 0 ? ((parseInt(s.count) / total) * 100).toFixed(1) : 0}%)</div>
      </div>`)
    .join("") || `<p style="color:#94a3b8;font-size:12px">Sin datos</p>`;

  const aRows = byAgeGroup
    .map((a) => `<div class="bar-row">
        <div class="bar-lbl">${a.age_group}</div>
        <div class="bar-wrap"><div class="bar" style="background:${AGE_GROUP_COLORS[a.age_group] || "#64748b"};width:${(parseInt(a.count) / maxA) * 100}%"></div></div>
        <div class="bar-val">${a.count} (${total > 0 ? ((parseInt(a.count) / total) * 100).toFixed(1) : 0}%)</div>
      </div>`)
    .join("") || `<p style="color:#94a3b8;font-size:12px">Sin datos</p>`;

  const ninos = parseInt(byAgeGroup.find(a => a.age_group === 'NIÑO')?.count || 0);
  const jovenes = parseInt(byAgeGroup.find(a => a.age_group === 'JOVEN')?.count || 0);

  return doc("Reporte de Miembros", `
    ${hdr("Reporte de Miembros", "Distribución y estadísticas de miembros registrados", "", church)}

    <div class="metrics">
      <div class="metric"><div class="metric-lbl">Total Miembros</div><div class="metric-val">${total}</div></div>
      <div class="metric"><div class="metric-lbl">Miembros Activos</div><div class="metric-val" style="color:#15803d">${active}</div><div class="metric-sub">${total > 0 ? ((active / total) * 100).toFixed(1) : 0}% del total</div></div>
      <div class="metric"><div class="metric-lbl">Jóvenes</div><div class="metric-val" style="color:#7c3aed">${jovenes}</div><div class="metric-sub">${total > 0 ? ((jovenes / total) * 100).toFixed(1) : 0}% del total</div></div>
      <div class="metric"><div class="metric-lbl">Niños</div><div class="metric-val" style="color:#d97706">${ninos}</div><div class="metric-sub">${total > 0 ? ((ninos / total) * 100).toFixed(1) : 0}% del total</div></div>
    </div>

    <div class="two-col">
      <div class="section"><h2>Distribución por Género</h2>${gRows}</div>
      <div class="section"><h2>Distribución por Estado</h2>${sRows}</div>
    </div>
    <div class="section" style="margin-top:16px"><h2>Distribución por Grupo de Edad</h2>${aRows}</div>
    ${footerFor(church)}
  `);
}

// ─────────────────────────────────────────────────────────────────────────
// 3. REPORTE FINANCIERO
// ─────────────────────────────────────────────────────────────────────────
const ACCOUNT_LABELS = { CHEQUE: "Cuenta de Cheque", AHORROS: "Cuenta de Ahorros" };

// Saldo actual (histórico, no acotado al período del reporte) de cada
// cuenta — ver getAccountBalances en financesController.js. Va en su
// propia sección porque mezcla un rango de tiempo distinto al resto del
// reporte (que sí respeta startDate/endDate).
function accountBalancesSection(accountBalances) {
  if (!accountBalances || (!accountBalances.CHEQUE && !accountBalances.AHORROS)) return "";

  const block = (key) => {
    const a = accountBalances[key] || {};
    const bal = a.balance || 0;
    const net = (a.transfersIn || 0) - (a.transfersOut || 0);
    return `<div class="section">
      <h2>${ACCOUNT_LABELS[key]}</h2>
      <table>
        <tbody>
          <tr><td>Saldo actual</td><td style="text-align:right;font-weight:700;color:${bal >= 0 ? "#15803d" : "#dc2626"}">${fmtM(bal)}</td></tr>
          <tr><td>Ingresos históricos</td><td style="text-align:right;color:#15803d">${fmtM(a.ingresos)}</td></tr>
          <tr><td>Egresos históricos</td><td style="text-align:right;color:#dc2626">${fmtM(a.egresos)}</td></tr>
          <tr><td>Transferencias (neto)</td><td style="text-align:right">${net >= 0 ? "+" : "−"}${fmtM(Math.abs(net))}</td></tr>
        </tbody>
      </table>
    </div>`;
  };

  return `<div class="two-col">${block("CHEQUE")}${block("AHORROS")}</div>`;
}

export function buildFinancesReport(data, { startDate, endDate } = {}, church = {}) {
  const { summary, byCategory = [], accountBalances } = data;
  const ingresos = byCategory.filter((c) => c.category_type === "INGRESO");
  const egresos = byCategory.filter((c) => c.category_type === "EGRESO");
  const balance = summary?.balance || 0;
  const maxCat = Math.max(...byCategory.map((c) => parseFloat(c.total || 0)), 1);
  const period = startDate || endDate
    ? `Período: ${startDate || "..."} — ${endDate || "..."}`
    : "Período: Todos los registros";

  const catSection = (cats, color, title) => {
    const rows = cats.length === 0
      ? `<tr><td colspan="4" style="text-align:center;color:#94a3b8;padding:12px">Sin datos en el período</td></tr>`
      : cats.map((c) => `<tr>
            <td>${c.category_name}</td>
            <td style="text-align:right;font-weight:600;color:${color}">${fmtM(c.total)}</td>
            <td style="text-align:right;color:#94a3b8">${c.transaction_count}</td>
            <td style="text-align:right">
              <div style="background:#f1f5f9;border-radius:4px;height:10px;width:80px;overflow:hidden;display:inline-block;vertical-align:middle">
                <div style="background:${color};height:100%;width:${(parseFloat(c.total || 0) / maxCat) * 100}%;border-radius:4px"></div>
              </div>
            </td>
          </tr>`).join("");
    return `<div class="section">
      <h2>${title}</h2>
      <table>
        <thead><tr><th>Categoría</th><th style="text-align:right">Total</th><th style="text-align:right">Trans.</th><th style="text-align:right">Proporción</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  };

  return doc("Reporte Financiero", `
    ${hdr("Reporte Financiero", "Ingresos, egresos y balance por categoría", period, church)}

    <div class="metrics">
      <div class="metric"><div class="metric-lbl">Total Ingresos</div><div class="metric-val" style="color:#15803d">${fmtM(summary?.totalIngresos)}</div></div>
      <div class="metric"><div class="metric-lbl">Total Egresos</div><div class="metric-val" style="color:#dc2626">${fmtM(summary?.totalEgresos)}</div></div>
      <div class="metric"><div class="metric-lbl">Balance</div><div class="metric-val" style="color:${balance >= 0 ? "#15803d" : "#dc2626"}">${balance >= 0 ? "+" : "−"}${fmtM(Math.abs(balance))}</div><div class="metric-sub">${balance >= 0 ? "Superávit" : "Déficit"}</div></div>
    </div>

    ${accountBalancesSection(accountBalances)}
    ${catSection(ingresos, "#16a34a", "Ingresos por Categoría")}
    ${catSection(egresos, "#dc2626", "Egresos por Categoría")}
    ${footerFor(church)}
  `);
}

// ─────────────────────────────────────────────────────────────────────────
// 4. REPORTE DE DIEZMOS Y OFRENDAS
// ─────────────────────────────────────────────────────────────────────────
export function buildDonationsReport(data, { startDate, endDate } = {}, church = {}) {
  const { summary, byType = [], topDonors = [] } = data;
  const maxType = Math.max(...byType.map((t) => t.total), 1);
  const period = startDate || endDate
    ? `Período: ${startDate || "..."} — ${endDate || "..."}`
    : "Período: Todos los registros";

  const typeRows = byType.length === 0
    ? `<p style="color:#94a3b8;font-size:12px">Sin datos en el período</p>`
    : byType.map((t) => `<div class="bar-row">
        <div class="bar-lbl">${t.type}</div>
        <div class="bar-wrap"><div class="bar" style="background:#8b5cf6;width:${(t.total / maxType) * 100}%"></div></div>
        <div class="bar-val">${fmtM(t.total)}</div>
      </div>`).join("");

  const RANK_COLORS = ["#f59e0b;color:#000", "#9ca3af;color:#000", "#b45309;color:#fff"];
  const donorRows = topDonors.length === 0
    ? `<tr><td colspan="4" style="text-align:center;color:#94a3b8;padding:12px">Sin datos</td></tr>`
    : topDonors.map((d, i) => `<tr>
        <td style="text-align:center">
          <span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:${RANK_COLORS[i] || "#f1f5f9;color:#475569"};font-size:11px;font-weight:700">${i + 1}</span>
        </td>
        <td>${d.name}</td>
        <td style="text-align:right;font-weight:600;color:#7c3aed">${fmtM(d.total)}</td>
        <td style="text-align:right;color:#94a3b8">${d.count}</td>
      </tr>`).join("");

  return doc("Reporte de Diezmos y Ofrendas", `
    ${hdr("Reporte de Diezmos y Ofrendas", "Contribuciones personales de miembros", period, church)}

    <div class="metrics">
      <div class="metric"><div class="metric-lbl">Total Recaudado</div><div class="metric-val">${fmtM(summary?.total)}</div></div>
      <div class="metric"><div class="metric-lbl">Total Registros</div><div class="metric-val">${summary?.count || 0}</div></div>
      <div class="metric"><div class="metric-lbl">Contribuyentes Únicos</div><div class="metric-val">${summary?.uniqueDonors || 0}</div></div>
    </div>

    <div class="two-col">
      <div class="section">
        <h2>Por Tipo de Contribución</h2>
        ${typeRows}
      </div>
      <div class="section">
        <h2>Top Contribuyentes</h2>
        <table>
          <thead><tr><th style="text-align:center">#</th><th>Nombre</th><th style="text-align:right">Total</th><th style="text-align:right">Registros</th></tr></thead>
          <tbody>${donorRows}</tbody>
        </table>
      </div>
    </div>
    ${footerFor(church)}
  `);
}

// ─────────────────────────────────────────────────────────────────────────
// 4b. FICHAS EN BLANCO — para que un miembro o visitante llene a mano
// ─────────────────────────────────────────────────────────────────────────
// Solo incluyen datos que la propia persona puede autoreportar (identidad,
// contacto, demografía). Los campos administrativos que decide la iglesia
// —Estado (activo/inactivo), Etapa de seguimiento, Responsable— quedan
// fuera a propósito: no tiene sentido que el visitante los complete.
function formField(label, full = false) {
  return `<div class="form-field${full ? " full" : ""}">
    <span class="form-label">${label}</span>
    <span class="form-line"></span>
  </div>`;
}

function formChecks(label, options, full = false) {
  return `<div class="form-field${full ? " full" : ""}">
    <span class="form-label">${label}</span>
    <div class="check-group">
      ${options.map((o) => `<span class="check-item"><span class="check-box"></span>${o}</span>`).join("")}
    </div>
  </div>`;
}

const sigRow = `<div class="sig-row">
  <div class="sig-block"><div class="sig-blank-line">Firma</div></div>
  <div class="sig-block"><div class="sig-blank-line">Fecha</div></div>
</div>`;

export function buildBlankMemberForm(church = {}) {
  return doc("Ficha de Registro de Miembro", `
    ${hdr("Ficha de Registro de Miembro", "Por favor complete sus datos con letra clara", "", church)}

    <div class="form-section">
      <div class="form-section-title">Datos Personales</div>
      <div class="form-grid">
        ${formField("Nombre *")}
        ${formField("Apellido *")}
        ${formField("Fecha de nacimiento")}
        ${formChecks("Género", ["Masculino", "Femenino"])}
        ${formField("Documento de identidad (cédula, DNI, pasaporte)")}
        ${formField("Miembro desde (fecha, opcional)")}
        ${formChecks("Estado civil", ["Soltero/a", "Casado/a", "Divorciado/a", "Viudo/a", "Unión libre"], true)}
        ${formField("Ocupación")}
        ${formChecks("Categoría de edad", ["Adulto", "Joven", "Niño"])}
      </div>
    </div>

    <div class="form-section">
      <div class="form-section-title">Contacto</div>
      <div class="form-grid">
        ${formField("Teléfono")}
        ${formField("Email")}
        ${formField("Dirección", true)}
      </div>
    </div>

    <div class="form-section">
      <div class="form-section-title">Si es menor de edad</div>
      <div class="form-grid">
        ${formField("Nombre del Padre / Tutor")}
        ${formField("Grado escolar")}
        ${formField("Alergias / Condiciones médicas", true)}
        ${formField("Contacto de emergencia", true)}
      </div>
    </div>

    ${footerFor(church)}
  `);
}

export function buildBlankVisitorForm(church = {}) {
  return doc("Ficha de Registro de Visitante", `
    ${hdr("Ficha de Registro de Visitante", "¡Bienvenido/a! Nos alegra que nos visites", "", church)}

    <div class="form-section">
      <div class="form-section-title">Datos Personales</div>
      <div class="form-grid">
        ${formField("Nombre *")}
        ${formField("Apellido *")}
        ${formField("Fecha de nacimiento")}
        ${formChecks("Género", ["Masculino", "Femenino"])}
      </div>
    </div>

    <div class="form-section">
      <div class="form-section-title">Contacto</div>
      <div class="form-grid">
        ${formField("Teléfono")}
        ${formField("Email")}
        ${formField("Dirección", true)}
      </div>
    </div>

    <div class="form-section">
      <div class="form-section-title">Su Visita</div>
      <div class="form-grid">
        ${formField("Fecha de esta visita *")}
        ${formChecks("¿Cómo llegó a nosotros?", ["Invitado por alguien", "Redes sociales", "Pasó por aquí", "Búsqueda en internet", "Otro"], true)}
        ${formField("Invitado por / Referencia", true)}
      </div>
    </div>

    <div class="form-section">
      <div class="form-section-title">Comentarios o Peticiones de Oración</div>
      <div class="form-box"></div>
    </div>

    ${sigRow}
    ${footerFor(church)}
  `);
}

// ─────────────────────────────────────────────────────────────────────────
// 5. REPORTE DE BAUTISMOS
// ─────────────────────────────────────────────────────────────────────────
export function buildBaptismsReport(data, church = {}) {
  const { total, year, byMonth = [], recent = [] } = data;

  const monthlyData = MONTHS.map((label, i) => ({
    label,
    value: parseInt(byMonth.find((m) => parseInt(m.month) === i + 1)?.count || 0),
  }));
  const yearTotal = monthlyData.reduce((s, m) => s + m.value, 0);
  const maxM = Math.max(...monthlyData.map((m) => m.value), 1);
  const BAR_H = 60;

  const monthBars = monthlyData
    .map((m) => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px">
        <div style="height:${BAR_H}px;width:100%;display:flex;align-items:flex-end;justify-content:center">
          <div style="width:75%;background:#0891b2;border-radius:3px 3px 0 0;height:${Math.max((m.value / maxM) * BAR_H, m.value > 0 ? 4 : 0)}px" title="${m.label}: ${m.value}"></div>
        </div>
        <span style="font-size:8px;color:#64748b">${m.label}</span>
        ${m.value > 0 ? `<span style="font-size:9px;font-weight:700;color:#0e7490">${m.value}</span>` : ""}
      </div>`)
    .join("");

  const recentRows = recent.length === 0
    ? `<tr><td colspan="4" style="text-align:center;color:#94a3b8;padding:12px">Sin datos</td></tr>`
    : recent.map((b) => `<tr>
        <td>${b.first_name} ${b.last_name}</td>
        <td>${b.baptism_date ? b.baptism_date.split("T")[0].split("-").reverse().join("/") : "—"}</td>
        <td>${b.minister || "—"}</td>
        <td>${b.place || "—"}</td>
      </tr>`).join("");

  const bestMonth = yearTotal > 0
    ? monthlyData.reduce((best, m) => m.value > (best?.value || 0) ? m : best, null)
    : null;

  return doc(`Reporte de Bautismos ${year}`, `
    ${hdr("Reporte de Bautismos", `Estadísticas de bautismos — Año ${year}`, "", church)}

    <div class="metrics">
      <div class="metric"><div class="metric-lbl">Total Histórico</div><div class="metric-val">${total}</div></div>
      <div class="metric"><div class="metric-lbl">Bautismos en ${year}</div><div class="metric-val">${yearTotal}</div></div>
      <div class="metric"><div class="metric-lbl">Mes más activo</div><div class="metric-val">${bestMonth?.value > 0 ? bestMonth.label : "—"}</div><div class="metric-sub">${bestMonth?.value > 0 ? `${bestMonth.value} bautismos` : ""}</div></div>
    </div>

    <div class="section">
      <h2>Distribución Mensual — ${year}</h2>
      ${yearTotal === 0
      ? `<p style="text-align:center;color:#94a3b8;padding:20px">Sin bautismos registrados en ${year}</p>`
      : `<div style="display:flex;gap:3px;align-items:flex-end;height:${BAR_H + 28}px;padding:0 4px">${monthBars}</div>`}
    </div>

    <div class="section">
      <h2>Bautismos Registrados (últimos 10)</h2>
      <table>
        <thead><tr><th>Miembro</th><th>Fecha</th><th>Ministro</th><th>Lugar</th></tr></thead>
        <tbody>${recentRows}</tbody>
      </table>
    </div>
    ${footerFor(church)}
  `);
}

// ─────────────────────────────────────────────────────────────────────────
// 6. REPORTE DE ASISTENCIA
// ─────────────────────────────────────────────────────────────────────────
export function buildAttendanceReport(data, church = {}) {
  const { summary, byType = [], monthly = [], topEvents = [] } = data;
  const TYPE_LABELS = { CULTO: "Culto", REUNION: "Reunión", ESPECIAL: "Especial" };
  const TYPE_COLORS = { CULTO: "#3b82f6", REUNION: "#f59e0b", ESPECIAL: "#8b5cf6" };

  const maxType = Math.max(...byType.map((t) => parseInt(t.total_attendance || 0)), 1);
  const BAR_H = 60;

  // Gráfico mensual: barras por mes (miembros + visitantes)
  const monthlyRows = monthly.length === 0
    ? `<p style="color:#94a3b8;font-size:12px;text-align:center;padding:16px">Sin datos en los últimos 6 meses</p>`
    : monthly.map((m) => {
      const members = parseInt(m.member_attendance || 0);
      const guests = parseInt(m.guest_count || 0);
      const total = members + guests;
      const maxVal = Math.max(...monthly.map(x => parseInt(x.member_attendance || 0) + parseInt(x.guest_count || 0)), 1);
      return `<div class="bar-row">
          <div class="bar-lbl">${m.label || m.month}</div>
          <div class="bar-wrap" style="position:relative">
            <div class="bar" style="background:#3b82f6;width:${(members / maxVal) * 100}%;position:absolute;top:0;left:0"></div>
            <div class="bar" style="background:#f59e0b;width:${(total / maxVal) * 100}%;opacity:0.45"></div>
          </div>
          <div class="bar-val">${total.toLocaleString()}</div>
        </div>`;
    }).join("");

  const typeRows = byType.length === 0
    ? `<p style="color:#94a3b8;font-size:12px">Sin datos</p>`
    : byType.map((t) => `<div class="bar-row">
        <div class="bar-lbl">${TYPE_LABELS[t.event_type] || t.event_type}</div>
        <div class="bar-wrap"><div class="bar" style="background:${TYPE_COLORS[t.event_type] || "#64748b"};width:${(parseInt(t.total_attendance || 0) / maxType) * 100}%"></div></div>
        <div class="bar-val">${parseInt(t.total_attendance).toLocaleString()} <span style="color:#94a3b8;font-size:10px">(${t.event_count} ev.)</span></div>
      </div>`).join("");

  const topRows = topEvents.length === 0
    ? `<tr><td colspan="4" style="text-align:center;color:#94a3b8;padding:12px">Sin datos</td></tr>`
    : topEvents.map((e, i) => {
      const medals = ["🥇", "🥈", "🥉"];
      return `<tr>
          <td style="text-align:center;font-weight:700">${medals[i] || i + 1}</td>
          <td>${e.title}</td>
          <td>${e.date ? e.date.split("T")[0].split("-").reverse().join("/") : "—"} · ${TYPE_LABELS[e.event_type] || e.event_type}</td>
          <td style="text-align:right;font-weight:600">${parseInt(e.total_attendance).toLocaleString()}</td>
        </tr>`;
    }).join("");

  return doc("Reporte de Asistencia", `
    ${hdr("Reporte de Asistencia", "Estadísticas de eventos y asistencia — Últimos 6 meses", "", church)}

    <div class="metrics">
      <div class="metric"><div class="metric-lbl">Total Eventos</div><div class="metric-val">${summary?.totalEvents || 0}</div></div>
      <div class="metric"><div class="metric-lbl">Total Asistencias</div><div class="metric-val">${parseInt(summary?.totalAttendance || 0).toLocaleString()}</div><div class="metric-sub">Miembros registrados</div></div>
      <div class="metric"><div class="metric-lbl">Eventos este mes</div><div class="metric-val">${summary?.eventsThisMonth || 0}</div></div>
    </div>

    <div class="two-col">
      <div class="section"><h2>Asistencia Mensual — Últimos 6 meses</h2>${monthlyRows}</div>
      <div class="section"><h2>Por Tipo de Evento</h2>${typeRows}</div>
    </div>

    <div class="section">
      <h2>Eventos con Mayor Asistencia</h2>
      <table>
        <thead><tr><th style="text-align:center">#</th><th>Evento</th><th>Fecha · Tipo</th><th style="text-align:right">Asistencia</th></tr></thead>
        <tbody>${topRows}</tbody>
      </table>
    </div>
    ${footerFor(church)}
  `);
}

// ─────────────────────────────────────────────────────────────────────────
// 7. REPORTE DE DÍAS DE ORACIÓN
// ─────────────────────────────────────────────────────────────────────────
export function buildPrayerReport(data, church = {}, dateRange = {}) {
  const { stats, byMonth = [], topSessions = [], byWeekday = [] } = data;
  const DAY_LABELS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

  const maxWeekday = Math.max(...byWeekday.map((d) => parseInt(d.total_attendance || 0)), 1);

  const periodLabel = dateRange.start && dateRange.end
    ? `${dateRange.start} — ${dateRange.end}`
    : dateRange.start
      ? `Desde ${dateRange.start}`
      : dateRange.end
        ? `Hasta ${dateRange.end}`
        : "Histórico completo";

  // Gráfico mensual
  const monthlyRows = byMonth.length === 0
    ? `<p style="color:#94a3b8;font-size:12px;text-align:center;padding:16px">Sin datos en el período seleccionado</p>`
    : byMonth.map((m) => {
      const sessions = parseInt(m.sessions || 0);
      const attendance = parseInt(m.total_attendance || 0);
      const maxVal = Math.max(...byMonth.map(x => parseInt(x.total_attendance || 0)), 1);
      return `<div class="bar-row">
          <div class="bar-lbl">${m.month}</div>
          <div class="bar-wrap">
            <div class="bar" style="background:#f59e0b;width:${(attendance / maxVal) * 100}%"></div>
          </div>
          <div class="bar-val">${attendance.toLocaleString()} <span style="color:#94a3b8;font-size:10px">(${sessions} ses.)</span></div>
        </div>`;
    }).join("");

  // Asistencia por día de la semana
  const weekdayRows = byWeekday.length === 0
    ? `<p style="color:#94a3b8;font-size:12px">Sin datos</p>`
    : byWeekday.map((d) => `<div class="bar-row">
        <div class="bar-lbl">${DAY_LABELS[d.day_of_week] || `Día ${d.day_of_week}`}</div>
        <div class="bar-wrap"><div class="bar" style="background:#f59e0b;width:${(parseInt(d.total_attendance || 0) / maxWeekday) * 100}%"></div></div>
        <div class="bar-val">${parseInt(d.total_attendance || 0).toLocaleString()} <span style="color:#94a3b8;font-size:10px">(${d.sessions} ses.)</span></div>
      </div>`).join("");

  // Top sesiones
  const topRows = topSessions.length === 0
    ? `<tr><td colspan="4" style="text-align:center;color:#94a3b8;padding:12px">Sin datos</td></tr>`
    : topSessions.map((s, i) => {
      const medals = ["🥇", "🥈", "🥉"];
      const fmtDate = s.occurrence_date ? s.occurrence_date.split("T")[0].split("-").reverse().join("/") : "—";
      const guestInfo = s.guest_count > 0 ? ` · ${s.guest_count} invitado${s.guest_count > 1 ? 's' : ''}` : '';
      return `<tr>
          <td style="text-align:center;font-weight:700">${medals[i] || i + 1}</td>
          <td>${s.prayer_day_name || "Día de Oración"}</td>
          <td>${fmtDate}${guestInfo}</td>
          <td style="text-align:right;font-weight:600">${parseInt(s.attendance_count || 0).toLocaleString()}</td>
        </tr>`;
    }).join("");

  return doc("Reporte de Días de Oración", `
    ${hdr("Reporte de Días de Oración", "Estadísticas de asistencia a días de oración", periodLabel, church)}

    <div class="metrics">
      <div class="metric"><div class="metric-lbl">Total Sesiones</div><div class="metric-val">${stats?.total_sessions || 0}</div></div>
      <div class="metric"><div class="metric-lbl">Total Asistencias</div><div class="metric-val">${parseInt(stats?.total_attendance || 0).toLocaleString()}</div></div>
      <div class="metric"><div class="metric-lbl">Promedio por Sesión</div><div class="metric-val">${parseFloat(stats?.avg_attendance || 0).toFixed(1)}</div></div>
    </div>

    <div class="two-col">
      <div class="section"><h2>Asistencia Mensual</h2>${monthlyRows}</div>
      <div class="section"><h2>Por Día de la Semana</h2>${weekdayRows}</div>
    </div>

    <div class="section">
      <h2>Sesiones con Mayor Asistencia</h2>
      <table>
        <thead><tr><th style="text-align:center">#</th><th>Día de Oración</th><th>Fecha</th><th style="text-align:right">Asistencia</th></tr></thead>
        <tbody>${topRows}</tbody>
      </table>
    </div>
    ${footerFor(church)}
  `);
}

// ─────────────────────────────────────────────────────────────────────────
// 8. LISTA DE ASISTENCIA — EVENTO ESPECÍFICO
// ─────────────────────────────────────────────────────────────────────────
export function buildEventAttendancePDF(event, attendees = [], guestCount = 0, church = {}) {
  const TYPE_LABELS = { CULTO: "Culto", REUNION: "Reunión", ESPECIAL: "Evento Especial" };

  const fmtDate = (d) => {
    if (!d) return "—";
    return new Date(d.slice ? d.slice(0, 10) + "T12:00:00" : d)
      .toLocaleDateString("es-DO", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  };

  const total = attendees.length + guestCount;
  const subtitle = `${TYPE_LABELS[event.event_type] || event.event_type} · ${fmtDate(event.date)}`;

  const attendeeRows = attendees.length === 0
    ? `<tr><td colspan="3" style="text-align:center;color:#94a3b8;padding:16px">Sin asistentes registrados</td></tr>`
    : attendees.map((a, i) => `<tr>
        <td style="text-align:center;color:#94a3b8;width:36px">${i + 1}</td>
        <td style="font-weight:500">${a.first_name || ""} ${a.last_name || ""}</td>
        <td style="color:#64748b">${a.phone || "—"}</td>
      </tr>`).join("");

  return doc(`Lista de Asistencia — ${event.title}`, `
    ${hdr("Lista de Asistencia", event.title, subtitle, church)}

    <div class="metrics" style="grid-template-columns:repeat(3,1fr)">
      <div class="metric"><div class="metric-lbl">Miembros registrados</div><div class="metric-val">${attendees.length}</div></div>
      <div class="metric"><div class="metric-lbl">Visitantes / Público</div><div class="metric-val" style="color:#d97706">${guestCount}</div></div>
      <div class="metric"><div class="metric-lbl">Total Asistentes</div><div class="metric-val" style="color:#15803d">${total}</div></div>
    </div>

    <div class="section">
      <h2>Miembros Presentes</h2>
      <table>
        <thead>
          <tr>
            <th style="text-align:center;width:36px">#</th>
            <th>Nombre</th>
            <th>Teléfono</th>
          </tr>
        </thead>
        <tbody>${attendeeRows}</tbody>
      </table>
    </div>

    ${guestCount > 0 ? `<div class="section">
      <div style="background:#fefce8;border:1px solid #fde047;border-radius:8px;padding:14px;display:flex;align-items:center;gap:12px">
        <span style="font-size:22px">👥</span>
        <div>
          <div style="font-weight:600;color:#854d0e">Visitantes / Público General</div>
          <div style="color:#713f12;font-size:12px;margin-top:2px"><strong>${guestCount}</strong> personas sin registro previo (entrada libre)</div>
        </div>
      </div>
    </div>` : ""}
    ${footerFor(church)}
  `);
}

// ─────────────────────────────────────────────────────────────────────────
// 9. DIRECTORIO DE FAMILIA
// ─────────────────────────────────────────────────────────────────────────
export function buildFamilyMembersPDF(family, members = [], church = {}) {
  const REL_LABELS = { PADRE: "Padre", MADRE: "Madre", HIJO: "Hijo/a", MIEMBRO: "Miembro", ABUELO: "Abuelo/a", TIOS: "Tío/a", OTRO: "Otro" };

  const rows = members.length === 0
    ? `<tr><td colspan="3" style="text-align:center;color:#94a3b8;padding:14px">Sin miembros registrados</td></tr>`
    : members.map((m, i) => `<tr>
        <td style="text-align:center;color:#94a3b8;width:36px">${i + 1}</td>
        <td style="font-weight:500">${m.first_name || ""} ${m.last_name || ""}</td>
        <td><span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;background:#f1f5f9;color:#475569;font-weight:600">${REL_LABELS[m.relationship] || m.relationship || "—"}</span></td>
      </tr>`).join("");

  return doc(`Familia ${family.family_name}`, `
    ${hdr(`Familia ${family.family_name}`, "Registro de integrantes de la familia", "", church)}
    <div class="metrics" style="grid-template-columns:repeat(2,1fr)">
      <div class="metric"><div class="metric-lbl">Total integrantes</div><div class="metric-val">${members.length}</div></div>
      <div class="metric"><div class="metric-lbl">Familia</div><div class="metric-val" style="font-size:16px">${family.family_name}</div></div>
    </div>
    <div class="section">
      <h2>Integrantes</h2>
      <table>
        <thead><tr><th style="text-align:center;width:36px">#</th><th>Nombre</th><th>Relación</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    ${footerFor(church)}
  `);
}

// ─────────────────────────────────────────────────────────────────────────
// 10. LISTA DE MIEMBROS DE GRUPO/MINISTERIO
// ─────────────────────────────────────────────────────────────────────────
export function buildGroupMembersPDF(group, members = [], church = {}) {
  const rows = members.length === 0
    ? `<tr><td colspan="3" style="text-align:center;color:#94a3b8;padding:14px">Sin miembros en este grupo</td></tr>`
    : members.map((m, i) => `<tr>
        <td style="text-align:center;color:#94a3b8;width:36px">${i + 1}</td>
        <td style="font-weight:500">${m.first_name || ""} ${m.last_name || ""}</td>
        <td style="color:#64748b">${m.phone || "—"}</td>
      </tr>`).join("");

  return doc(`Miembros — ${group.name}`, `
    ${hdr(group.name, group.description || "Lista de miembros del grupo/ministerio", "", church)}
    <div class="metrics" style="grid-template-columns:repeat(2,1fr)">
      <div class="metric"><div class="metric-lbl">Total miembros</div><div class="metric-val">${members.length}</div></div>
      <div class="metric"><div class="metric-lbl">Grupo / Ministerio</div><div class="metric-val" style="font-size:15px">${group.name}</div></div>
    </div>
    <div class="section">
      <h2>Lista de Miembros</h2>
      <table>
        <thead><tr><th style="text-align:center;width:36px">#</th><th>Nombre</th><th>Teléfono</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    ${footerFor(church)}
  `);
}

// ─────────────────────────────────────────────────────────────────────────
// 11. DIRECTORIO DE LÍDERES
// ─────────────────────────────────────────────────────────────────────────
export function buildLeadersDirectoryPDF(leaders = [], church = {}) {
  const rows = leaders.length === 0
    ? `<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:14px">Sin líderes registrados</td></tr>`
    : leaders.map((l, i) => {
      const statusColor = l.status === "ACTIVO" ? "#15803d" : "#94a3b8";
      return `<tr>
          <td style="text-align:center;color:#94a3b8;width:36px">${i + 1}</td>
          <td style="font-weight:500">${l.firstName || ""} ${l.lastName || ""}</td>
          <td>${l.position || "—"}</td>
          <td>${l.area || "—"}</td>
          <td>${l.groupName || "—"}</td>
          <td style="text-align:center"><span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:10px;background:${l.status === "ACTIVO" ? "#dcfce7" : "#f1f5f9"};color:${statusColor};font-weight:600">${l.status || "—"}</span></td>
        </tr>`;
    }).join("");

  const activos = leaders.filter(l => l.status === "ACTIVO").length;
  const areas = [...new Set(leaders.map(l => l.area).filter(Boolean))].length;

  return doc("Directorio de Líderes", `
    ${hdr("Directorio de Líderes", "Equipo de liderazgo de la iglesia", "", church)}
    <div class="metrics">
      <div class="metric"><div class="metric-lbl">Total Líderes</div><div class="metric-val">${leaders.length}</div></div>
      <div class="metric"><div class="metric-lbl">Activos</div><div class="metric-val" style="color:#15803d">${activos}</div></div>
      <div class="metric"><div class="metric-lbl">Áreas activas</div><div class="metric-val">${areas}</div></div>
    </div>
    <div class="section">
      <h2>Equipo de Liderazgo</h2>
      <table>
        <thead><tr><th style="text-align:center;width:36px">#</th><th>Nombre</th><th>Posición</th><th>Área</th><th>Grupo</th><th style="text-align:center">Estado</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    ${footerFor(church)}
  `);
}

// ─────────────────────────────────────────────────────────────────────────
// 12. CERTIFICADO DE BAUTISMO INDIVIDUAL
// ─────────────────────────────────────────────────────────────────────────
export function buildBaptismCertificate(baptismData, churchName = "Iglesia Cristiana", logoUrl = null) {
  const { first_name, last_name, baptism_date, minister, place } = baptismData;

  const formatFullDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr.slice(0, 10) + "T12:00:00");
    return d.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
  };

  const year = baptism_date ? new Date(baptism_date.slice(0, 10) + "T12:00:00").getFullYear() : new Date().getFullYear();
  const sealWords = churchName.split(" ").slice(0, 4);

  const CERT_CSS = `
    *{box-sizing:border-box;margin:0;padding:0}
    @page{size:landscape;margin:0.6cm}
    html,body{width:100%;height:100%}
    body{
      font-family:'Georgia','Palatino Linotype',Palatino,serif;
      background:#d6c9a8;
      display:flex;align-items:center;justify-content:center;
      min-height:100vh;padding:16px;
    }
    /* ── Outer frame ── */
    .cert-wrap{
      width:100%;max-width:1100px;
      padding:7px;
      background:linear-gradient(135deg,#c9a227 0%,#e8d07a 30%,#a07820 60%,#e8d07a 80%,#c9a227 100%);
      box-shadow:0 20px 70px rgba(0,0,0,0.45);
    }
    .cert-mid{
      padding:5px;
      background:#fffdf5;
    }
    .cert-inner{
      border:1.5px solid #c9a227;
      background:#fffdf5;
      position:relative;
      padding:32px 44px 24px;
      min-height:490px;
      display:flex;
      flex-direction:column;
    }
    /* ── Watermark ── */
    .wm{
      position:absolute;top:50%;left:50%;
      transform:translate(-50%,-50%);
      font-size:380px;line-height:1;
      color:#c9a227;opacity:0.045;
      pointer-events:none;z-index:0;
      font-family:Georgia,serif;
    }
    /* ── Corner diamonds ── */
    .cd{position:absolute;width:18px;height:18px;background:#c9a227;transform:rotate(45deg)}
    .cd-tl{top:-9px;left:-9px}.cd-tr{top:-9px;right:-9px}
    .cd-bl{bottom:-9px;left:-9px}.cd-br{bottom:-9px;right:-9px}
    /* ── Inner corner lines ── */
    .cl{position:absolute;width:55px;height:55px;border-color:#c9a227;border-style:solid}
    .cl-tl{top:12px;left:12px;border-width:2px 0 0 2px}
    .cl-tr{top:12px;right:12px;border-width:2px 2px 0 0}
    .cl-bl{bottom:12px;left:12px;border-width:0 0 2px 2px}
    .cl-br{bottom:12px;right:12px;border-width:0 2px 2px 0}
    /* ── Layout: 3 columns ── */
    .body-row{
      display:flex;gap:0;flex:1;
      position:relative;z-index:1;
    }
    /* Left panel */
    .left-panel{
      width:110px;min-width:110px;
      display:flex;flex-direction:column;
      align-items:center;justify-content:center;
      gap:12px;
      border-right:1px solid #e8d07a;
      padding-right:20px;
      margin-right:28px;
    }
    .church-logo{
      width:90px;height:90px;
      object-fit:cover;
      margin-bottom:8px;
      border-radius:50%;
      border:3px solid #c9a227;
      box-shadow:0 0 0 2px #fffdf5, 0 4px 12px rgba(201,162,39,0.3);
      background:#fffdf5;
      padding:2px;
    }
    .lp-cross{
      font-size:72px;color:#c9a227;
      line-height:1;
      text-shadow:0 2px 12px rgba(201,162,39,0.4);
    }
    .lp-line{
      width:2px;height:60px;
      background:linear-gradient(to bottom,transparent,#c9a227,transparent);
    }
    .lp-ornament{
      font-size:22px;color:#c9a227;letter-spacing:4px;
    }
    /* Center panel */
    .center-panel{
      flex:1;
      text-align:center;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      gap:0;
    }
    .church-name{
      font-size:19px;font-weight:700;
      color:#1a2744;letter-spacing:4px;
      text-transform:uppercase;
      margin-bottom:2px;
    }
    .church-sub{
      font-size:11px;color:#8a7a5a;font-style:italic;letter-spacing:2px;
      margin-bottom:10px;
    }
    .gold-rule{
      width:100%;height:1px;
      background:linear-gradient(90deg,transparent,#c9a227 20%,#c9a227 80%,transparent);
      margin:8px 0;
    }
    .cert-title{
      font-size:38px;font-weight:700;
      color:#1a2744;letter-spacing:5px;
      text-transform:uppercase;line-height:1.1;
      margin:6px 0 2px;
    }
    .cert-subtitle{
      font-size:12px;color:#8a7a5a;font-style:italic;
      letter-spacing:2px;margin-bottom:12px;
    }
    .cert-presents{
      font-size:11px;color:#a09070;
      text-transform:uppercase;letter-spacing:3px;
      margin-bottom:4px;
    }
    .cert-name{
      font-size:46px;font-weight:400;font-style:italic;
      color:#1a2744;line-height:1.15;
      margin:4px 0 10px;
      text-shadow:1px 1px 0 rgba(201,162,39,0.15);
    }
    .cert-body{
      font-size:14px;color:#3a3020;line-height:1.85;
      max-width:480px;margin-bottom:10px;
    }
    .details-row{
      display:flex;align-items:center;justify-content:center;
      gap:0;margin:8px 0;
    }
    .detail-block{
      text-align:center;padding:0 18px;
    }
    .detail-label{
      font-size:9px;text-transform:uppercase;letter-spacing:2px;
      color:#a09070;margin-bottom:3px;
    }
    .detail-value{
      font-size:15px;font-weight:700;color:#1a2744;
    }
    .detail-sep{
      width:1px;height:36px;
      background:linear-gradient(to bottom,transparent,#c9a227,transparent);
    }
    .verse-block{
      margin:10px 0 0;
      padding:9px 20px;
      border-top:1px solid #c9a227;
      border-bottom:1px solid #c9a227;
      max-width:460px;
    }
    .verse-text{
      font-size:12px;font-style:italic;color:#5a4a2a;line-height:1.6;
    }
    .verse-ref{
      font-size:10px;font-weight:700;color:#c9a227;
      letter-spacing:2px;margin-top:3px;
    }
    /* Right panel: Seal */
    .right-panel{
      width:110px;min-width:110px;
      display:flex;flex-direction:column;
      align-items:center;justify-content:center;
      border-left:1px solid #e8d07a;
      padding-left:20px;
      margin-left:28px;
    }
    .seal{
      width:108px;height:108px;
      border-radius:50%;
      background:radial-gradient(circle at 40% 35%,#fffdf5 55%,#fdf0c0);
      box-shadow:
        0 0 0 3px #c9a227,
        0 0 0 7px #fffdf5,
        0 0 0 9px #c9a227,
        0 4px 18px rgba(0,0,0,0.2);
      display:flex;align-items:center;justify-content:center;
      transform:rotate(-8deg);
    }
    .seal-in{
      text-align:center;padding:10px;
    }
    .seal-cross{font-size:26px;color:#c9a227;display:block;line-height:1}
    .seal-church{
      font-size:8.5px;font-weight:700;color:#1a2744;
      text-transform:uppercase;letter-spacing:0.5px;
      line-height:1.4;margin-top:3px;
    }
    .seal-year{font-size:13px;font-weight:700;color:#c9a227;margin-top:4px}
    /* Signatures */
    .sigs{
      display:flex;justify-content:space-between;
      padding:0 60px;
      position:relative;z-index:1;
      margin-top:18px;
    }
    .sig{text-align:center;flex:1;max-width:220px}
    .sig-line{
      border-top:1.5px solid #1a2744;
      padding-top:7px;margin-top:38px;
    }
    .sig-name{
      font-size:12px;font-weight:700;color:#1a2744;
      text-transform:uppercase;letter-spacing:1px;
    }
    .sig-role{font-size:10px;color:#8a7a5a;margin-top:2px}
    /* Footer */
    .footer{
      display:flex;justify-content:space-between;
      margin-top:12px;padding-top:8px;
      border-top:1px solid #e8d07a;
      font-size:9.5px;color:#b0a070;
      font-family:'Segoe UI',Helvetica,Arial,sans-serif;
      position:relative;z-index:1;
    }
    /* Buttons */
    .actions{position:fixed;bottom:20px;right:20px;display:flex;gap:10px;z-index:100}
    .btn-print{
      background:linear-gradient(135deg,#c9a227,#a07820);
      color:#fff;border:none;padding:13px 26px;border-radius:8px;
      font-size:14px;font-weight:700;cursor:pointer;
      box-shadow:0 4px 16px rgba(160,120,32,0.5);
      font-family:'Segoe UI',Arial,sans-serif;letter-spacing:0.5px;
    }
    .btn-print:hover{background:linear-gradient(135deg,#d4af37,#b8860b)}
    .btn-close{
      background:#f0ece0;color:#3a3020;
      border:1.5px solid #c9a227;padding:13px 22px;border-radius:8px;
      font-size:14px;font-weight:600;cursor:pointer;
      font-family:'Segoe UI',Arial,sans-serif;
    }
    @media print{
      .actions{display:none!important}
      body{background:#fff;padding:0}
      .cert-wrap{box-shadow:none}
      @page{size:landscape;margin:0.6cm}
    }
  `;

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Certificado de Bautismo — ${first_name} ${last_name}</title>
<style>${CERT_CSS}</style></head><body>
<div class="cert-wrap"><div class="cert-mid"><div class="cert-inner">
  <div class="wm">✝</div>
  <div class="cd cd-tl"></div><div class="cd cd-tr"></div>
  <div class="cd cd-bl"></div><div class="cd cd-br"></div>
  <div class="cl cl-tl"></div><div class="cl cl-tr"></div>
  <div class="cl cl-bl"></div><div class="cl cl-br"></div>

  <div class="body-row">
    <!-- Left decorative column -->
    <div class="left-panel">
      ${logoUrl ? `<img src="${logoUrl}" alt="Logo Iglesia" class="church-logo">` : '<div class="lp-cross">✝</div>'}
      <div class="lp-line"></div>
      <div class="lp-ornament">❧</div>
    </div>

    <!-- Main content -->
    <div class="center-panel">
      <div class="church-name">${churchName}</div>
      <div class="church-sub">En obediencia a la Gran Comisión</div>
      <div class="gold-rule"></div>
      <div class="cert-title">Certificado<br>de Bautismo</div>
      <div class="cert-subtitle">Este certificado es otorgado a</div>
      <div class="cert-presents">A nombre de nuestra congregación, se certifica que</div>
      <div class="cert-name">${first_name} ${last_name}</div>
      <div class="cert-body">
        ha sido bautizado(a) en las aguas en obediencia al mandamiento<br>
        de nuestro Señor Jesucristo, confesando públicamente su fe en Él.
      </div>
      <div class="details-row">
        <div class="detail-block">
          <div class="detail-label">Fecha del Bautismo</div>
          <div class="detail-value">${formatFullDate(baptism_date)}</div>
        </div>
        ${minister ? `<div class="detail-sep"></div>
        <div class="detail-block">
          <div class="detail-label">Ministro Oficiante</div>
          <div class="detail-value">${minister}</div>
        </div>` : ""}
        ${place ? `<div class="detail-sep"></div>
        <div class="detail-block">
          <div class="detail-label">Lugar</div>
          <div class="detail-value">${place}</div>
        </div>` : ""}
      </div>
      <div class="verse-block">
        <div class="verse-text">"El que creyere y fuere bautizado, será salvo; mas el que no creyere, será condenado."</div>
        <div class="verse-ref">— Marcos 16:16</div>
      </div>
    </div>

    <!-- Right seal column -->
    <div class="right-panel">
      <div class="seal">
        <div class="seal-in">
          <span class="seal-cross">✝</span>
          <div class="seal-church">${sealWords.join("<br>")}</div>
          <div class="seal-year">${year}</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Signatures -->
  <div class="sigs">
    <div class="sig">
      <div class="sig-line">
        <div class="sig-name">Pastor / Ministro</div>
        <div class="sig-role">Firma y sello</div>
      </div>
    </div>
    <div class="sig">
      <div class="sig-line">
        <div class="sig-name">Secretario(a)</div>
        <div class="sig-role">Iglesia local</div>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <span>Certificado emitido: ${nowLabel()}</span>
    <span>Sistema de Control Eclesiástico</span>
  </div>
</div></div></div>

<div class="actions">
  <button class="btn-print" onclick="window.print()">🖨&nbsp; Imprimir / Guardar PDF</button>
  <button class="btn-close" onclick="window.close()">✕ Cerrar</button>
</div>
</body></html>`;
}

// ─────────────────────────────────────────────────────────────────────────
// 7. CARTAS DE REFERENCIA PASTORALES
// ─────────────────────────────────────────────────────────────────────────

const LETTER_LABELS = {
  MEMBRESIA: "Carta de Membresía",
  BUENA_CONDUCTA: "Carta de Buena Conducta",
  RECOMENDACION: "Carta de Recomendación",
  TRANSFERENCIA: "Carta de Transferencia de Membresía",
  PRESENTACION: "Carta de Presentación",
  VISA: "Carta de Respaldo para Gestiones Oficiales",
};

const LETTER_BODIES = {
  MEMBRESIA: (member, church) =>
    `Por medio de la presente, la <strong>${church.name}</strong>, ubicada en ${church.address || "nuestra localidad"}, 
    certifica que <strong>${member.first_name} ${member.last_name}</strong> es miembro activo de esta 
    congregación, participando regularmente en los cultos, actividades y ministerios de esta casa de Dios.
    <br><br>
    Esta iglesia da fe de la comunión fraternal y el compromiso cristiano que caracteriza a dicho(a) hermano(a), 
    por lo cual extendemos la presente carta a solicitud del interesado(a).`,

  BUENA_CONDUCTA: (member, church) =>
    `La <strong>${church.name}</strong> hace constar que <strong>${member.first_name} ${member.last_name}</strong>, 
    miembro de esta congregación, ha demostrado en todo tiempo una conducta íntegra, responsable y 
    en concordancia con los principios y valores del evangelio de Jesucristo.
    <br><br>
    Durante su permanencia en nuestra iglesia, dicho(a) hermano(a) ha sido ejemplo de honestidad, 
    responsabilidad y buen testimonio cristiano tanto dentro como fuera de la congregación, 
    por lo que no tenemos objeción alguna que hacer con respecto a su persona.`,

  RECOMENDACION: (member, church) =>
    `La <strong>${church.name}</strong> se complace en recomendar ampliamente a 
    <strong>${member.first_name} ${member.last_name}</strong>, miembro fiel y comprometido(a) de 
    esta congregación.
    <br><br>
    Conocemos a dicho(a) hermano(a) como una persona de fe sólida, carácter íntegro y dedicación 
    genuina al servicio del Señor. Su vida refleja los valores del evangelio y su actitud siempre 
    ha sido de colaboración y buen testimonio. Con toda confianza, la recomendamos para cualquier 
    cargo, gestión o responsabilidad para la cual se le considere.`,

  TRANSFERENCIA: (member, church, dest) =>
    `La <strong>${church.name}</strong> extiende la presente carta a fin de hacer constar que 
    <strong>${member.first_name} ${member.last_name}</strong> ha sido miembro activo y fiel de 
    esta congregación.
    <br><br>
    Por motivos de traslado, dicho(a) hermano(a) solicita su transferencia de membresía${dest ? ` hacia la <strong>${dest}</strong>` : " a la congregación que corresponda"}. 
    Esta iglesia certifica que se retira en plena comunión, al día en sus responsabilidades y 
    con un testimonio cristiano irreprochable. Lo recomendamos fraternalmente a la congregación 
    receptora como un(a) hermano(a) digno(a) de plena confianza y comunión.`,

  PRESENTACION: (member, church) =>
    `La <strong>${church.name}</strong> tiene el agrado de presentar ante ustedes a 
    <strong>${member.first_name} ${member.last_name}</strong>, miembro activo de esta congregación.
    <br><br>
    Le extendemos esta carta de presentación con el propósito de que sea recibido(a) con el amor 
    fraternal que caracteriza al cuerpo de Cristo. Dicho(a) hermano(a) cuenta con nuestro pleno 
    respaldo y confianza, y esperamos que su participación sea de bendición para la congregación 
    que lo(a) reciba.`,

  VISA: (member, church) =>
    `La <strong>${church.name}</strong>, congregación cristiana debidamente establecida, hace 
    constar por medio de la presente que <strong>${member.first_name} ${member.last_name}</strong> 
    es miembro activo y comprometido(a) de esta iglesia desde hace tiempo, participando regularmente 
    en los servicios religiosos y actividades de la congregación.
    <br><br>
    Esta carta se emite a petición del interesado(a) para los fines que estime convenientes ante 
    las autoridades correspondientes. La iglesia respalda plenamente a dicho(a) miembro(a) y 
    certifica la veracidad de la información aquí contenida.`,
};

const LETTER_CSS = `
  *{box-sizing:border-box;margin:0;padding:0}
  @page{size:letter portrait;margin:2cm}
  body{
    font-family:'Georgia',serif;
    background:#f5f5f0;
    color:#1a1a1a;
    padding:40px;
    font-size:13.5px;
    line-height:1.8;
  }
  .letter-wrap{
    max-width:720px;
    margin:0 auto;
    background:#fff;
    border:1px solid #d0c8b0;
    border-top:6px solid #1a2744;
    padding:52px 60px 48px;
    box-shadow:0 4px 24px rgba(0,0,0,0.08);
    position:relative;
  }
  .letter-wrap::before{
    content:'';
    position:absolute;
    top:8px;left:8px;right:8px;bottom:8px;
    border:1px solid #e8e0c8;
    pointer-events:none;
  }
  /* Header */
  .ltr-header{
    display:flex;align-items:center;justify-content:space-between;
    border-bottom:2px solid #1a2744;
    padding-bottom:20px;margin-bottom:26px;
    gap:20px;
  }
  .ltr-header-text{flex:1}
  .ltr-header-logo{
    flex-shrink:0;
    display:flex;align-items:center;justify-content:flex-end;
  }
  .ltr-church-name{
    font-size:20px;font-weight:700;
    color:#1a2744;letter-spacing:0.5px;
    text-transform:uppercase;
    font-family:'Georgia',serif;
  }
  .ltr-church-info{
    font-size:11px;color:#6b6b5a;
    line-height:1.6;margin-top:5px;
    font-family:'Arial',sans-serif;
  }
  .ltr-cross{
    font-size:44px;color:#1a2744;
    opacity:0.12;
    font-family:serif;
    line-height:1;
  }
  /* Type badge */
  .ltr-type-badge{
    display:inline-block;
    background:#1a2744;
    color:#fff;
    font-size:10px;
    letter-spacing:2px;
    text-transform:uppercase;
    padding:5px 18px;
    border-radius:2px;
    margin-bottom:22px;
    font-family:'Arial',sans-serif;
  }
  /* Meta row */
  .ltr-meta{
    display:flex;justify-content:space-between;
    font-size:11.5px;color:#6b6b5a;
    margin-bottom:30px;
    font-family:'Arial',sans-serif;
  }
  /* Saludo */
  .ltr-recipient{
    font-size:13px;color:#1a1a1a;
    margin-bottom:18px;
    font-style:italic;
  }
  /* Body */
  .ltr-body{
    font-size:13.5px;
    line-height:1.9;
    color:#222;
    margin-bottom:28px;
    text-align:justify;
  }
  /* Purpose block */
  .ltr-purpose{
    background:#f8f7f2;
    border-left:3px solid #1a2744;
    padding:12px 18px;
    margin:20px 0;
    font-style:italic;
    font-size:12.5px;
    color:#3a3a2a;
    border-radius:0 4px 4px 0;
  }
  /* Custom block */
  .ltr-custom{
    font-size:13px;
    color:#333;
    margin:16px 0 24px;
    line-height:1.85;
  }
  /* Closing */
  .ltr-closing{
    margin-bottom:48px;
    font-size:13px;color:#333;
    line-height:1.7;
  }
  /* Signature */
  .ltr-sig-wrap{
    display:flex;justify-content:flex-end;
    margin-top:16px;
  }
  .ltr-sig{
    text-align:center;
    min-width:240px;
  }
  .ltr-sig-line{
    border-top:1.5px solid #1a2744;
    padding-top:10px;
    margin-top:52px;
  }
  .ltr-sig-name{
    font-size:13px;font-weight:700;
    color:#1a2744;text-transform:uppercase;
    letter-spacing:0.5px;
  }
  .ltr-sig-role{
    font-size:11px;color:#6b6b5a;
    margin-top:3px;font-family:'Arial',sans-serif;
  }
  /* Validity */
  .ltr-validity{
    display:inline-block;
    border:1px dashed #c0b890;
    padding:6px 18px;
    font-size:11px;
    color:#7a6a40;
    border-radius:4px;
    margin-top:24px;
    font-family:'Arial',sans-serif;
  }
  /* Footer */
  .ltr-footer{
    margin-top:32px;
    padding-top:14px;
    border-top:1px solid #e0dac8;
    font-size:10px;
    color:#a0a090;
    text-align:center;
    font-family:'Arial',sans-serif;
    letter-spacing:0.3px;
  }
  /* Print buttons */
  .actions{position:fixed;bottom:20px;right:20px;display:flex;gap:10px;z-index:100}
  .btn-print{
    background:#1a2744;color:#fff;border:none;
    padding:11px 22px;border-radius:8px;font-size:13px;
    font-weight:700;cursor:pointer;
    box-shadow:0 4px 14px rgba(26,39,68,0.4);
    font-family:'Arial',sans-serif;
  }
  .btn-close{
    background:#f0ece0;color:#3a3020;
    border:1.5px solid #c0b890;padding:11px 18px;
    border-radius:8px;font-size:13px;font-weight:600;
    cursor:pointer;font-family:'Arial',sans-serif;
  }
  @media print{
    .actions{display:none!important}
    body{background:#fff;padding:0}
    .letter-wrap{box-shadow:none;border:none;border-top:4px solid #1a2744}
    @page{size:letter;margin:2cm}
  }
`;

function ltrValidityLabel(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr.slice(0, 10) + "T12:00:00");
  return `Válida hasta: ${d.toLocaleDateString("es-DO", { day: "numeric", month: "long", year: "numeric" })}`;
}

function ltrFormatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr.slice(0, 10) + "T12:00:00");
  return d.toLocaleDateString("es-DO", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * Genera el HTML de una carta de referencia lista para imprimir / exportar a PDF.
 *
 * @param {Object} letter       - Datos de la carta (de la BD)
 * @param {Object} church       - { name, address, phone }
 */
export function buildReferenceLetter(letter, church = {}) {
  const {
    letter_type, recipient, purpose, custom_body,
    issued_by, issued_at, valid_until, destination_church,
    first_name, last_name,
  } = letter;

  const memberObj = { first_name, last_name };
  const churchObj = { name: church.name || "Iglesia Cristiana", address: church.address || "", phone: church.phone || "", logoUrl: church.logoUrl || null };

  const typeLabel = LETTER_LABELS[letter_type] || "Carta Pastoral";
  const bodyFn = LETTER_BODIES[letter_type];
  const bodyText = bodyFn
    ? bodyFn(memberObj, churchObj, destination_church)
    : `La <strong>${churchObj.name}</strong> extiende la presente carta en favor de <strong>${first_name} ${last_name}</strong>.`;

  const issueDate = ltrFormatDate(issued_at);
  const validLabel = ltrValidityLabel(valid_until);
  const purposeHtml = purpose
    ? `<div class="ltr-purpose"><strong>Propósito:</strong> ${purpose}</div>`
    : "";
  const customHtml = custom_body
    ? `<div class="ltr-custom">${custom_body}</div>`
    : "";
  const validHtml = validLabel
    ? `<div class="ltr-validity">📅 ${validLabel}</div>`
    : "";

  const churchInfo = [churchObj.address, churchObj.phone].filter(Boolean).join(" · ");
  const logoHtml = churchObj.logoUrl
    ? `<img src="${churchObj.logoUrl}" alt="Logo" style="height:64px;max-width:160px;object-fit:contain;display:block;">`
    : `<div class="ltr-cross">✝</div>`;

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>${typeLabel} — ${first_name} ${last_name}</title>
<style>${LETTER_CSS}</style></head><body>

<div class="letter-wrap">

  <!-- Encabezado -->
  <div class="ltr-header">
    <div class="ltr-header-text">
      <div class="ltr-church-name">${churchObj.name}</div>
      ${churchInfo ? `<div class="ltr-church-info">${churchInfo}</div>` : ""}
    </div>
    <div class="ltr-header-logo">${logoHtml}</div>
  </div>

  <!-- Tipo de carta -->
  <div class="ltr-type-badge">${typeLabel}</div>

  <!-- Metadatos -->
  <div class="ltr-meta">
    <span><strong>Para:</strong> ${recipient || "A quien corresponda"}</span>
    <span>Fecha de emisión: ${issueDate}</span>
  </div>

  <!-- Saludo -->
  <p class="ltr-recipient">Estimado(a) ${recipient || "a quien corresponda"}:</p>

  <!-- Cuerpo -->
  <div class="ltr-body">${bodyText}</div>

  ${purposeHtml}
  ${customHtml}

  <!-- Cierre -->
  <div class="ltr-closing">
    En Cristo,<br><br>
    ${validHtml}
  </div>

  <!-- Firma -->
  <div class="ltr-sig-wrap">
    <div class="ltr-sig">
      <div class="ltr-sig-line">
        <div class="ltr-sig-name">${issued_by}</div>
        <div class="ltr-sig-role">Pastor / Ministro · ${churchObj.name}</div>
      </div>
    </div>
  </div>

  <!-- Pie -->
  <div class="ltr-footer">
    ${typeLabel} · Emitida el ${issueDate} · ${churchObj.name} · Sistema de Control Eclesiástico
  </div>

</div>

<div class="actions">
  <button class="btn-print" onclick="window.print()">🖨&nbsp; Imprimir / Guardar PDF</button>
  <button class="btn-close" onclick="window.close()">✕ Cerrar</button>
</div>
</body></html>`;

  return html;
}

// ─────────────────────────────────────────────────────────────────────────
// NORMAS INTERNAS (reglamento interno) — documento formal multi-página,
// distinto de los reportes de una página: cabecera institucional, secciones
// numeradas, caja destacada opcional, tabla opcional y firmas al cierre.
// Estilo propio en vez del CSS compartido de reportes (igual criterio que
// buildReferenceLetter) porque la maquetación no tiene nada que ver con
// tarjetas de métricas ni gráficos de barra.
// ─────────────────────────────────────────────────────────────────────────
const REG_CSS = `
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Georgia','Segoe UI',serif;color:#1e293b;background:#fff;padding:0;font-size:12.5px;line-height:1.6}
  .reg-wrap{max-width:800px;margin:0 auto;padding:32px}
  .reg-header{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding-bottom:16px;border-bottom:4px solid #1e3a5f;margin-bottom:20px}
  .reg-header-text{flex:1}
  .reg-church-name{font-family:'Segoe UI',Arial,sans-serif;font-size:20px;font-weight:800;color:#1e3a5f;letter-spacing:.02em}
  .reg-title{font-size:14px;font-weight:600;color:#334155;margin-top:4px}
  .reg-subtitle{font-size:11.5px;font-style:italic;color:#64748b;margin-top:2px}
  .reg-logo img{height:52px;max-width:130px;object-fit:contain;display:block}
  .reg-cross{width:44px;height:44px;border-radius:50%;background:#f1f5f9;border:2px solid #cbd5e1;display:flex;align-items:center;justify-content:center;font-size:19px;color:#94a3b8}
  .reg-preamble{background:#f8fafc;border-left:4px solid #1e3a5f;border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:22px;font-style:italic;color:#475569;font-size:11.5px;line-height:1.7}
  .reg-preamble p+p{margin-top:8px}
  .reg-section{margin-bottom:20px;break-inside:avoid-page}
  .reg-heading{font-family:'Segoe UI',Arial,sans-serif;font-size:12.5px;font-weight:800;color:#fff;background:#1e3a5f;padding:7px 12px;border-radius:5px;text-transform:uppercase;letter-spacing:.03em;margin-bottom:10px}
  .reg-intro{color:#334155;margin-bottom:10px}
  .reg-item{display:flex;gap:8px;margin-bottom:9px;align-items:baseline}
  .reg-item-label{font-weight:700;color:#1e3a5f;flex-shrink:0}
  .reg-item-body{color:#334155}
  .reg-item-body strong{color:#0f172a}
  .reg-callout{background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:12px 16px;margin:10px 0;font-size:12px;color:#713f12}
  .reg-callout strong{color:#422006}
  .reg-table{width:100%;border-collapse:collapse;margin-top:8px;font-size:11px}
  .reg-table th{background:#1e3a5f;color:#fff;text-align:left;padding:7px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.03em}
  .reg-table td{padding:7px 10px;border-bottom:1px solid #e2e8f0;color:#334155;vertical-align:top}
  .reg-table tr:nth-child(even) td{background:#f8fafc}
  .reg-meta{text-align:center;font-size:11px;color:#64748b;margin:24px 0 16px}
  .reg-sig-row{display:flex;justify-content:center;gap:60px;margin-top:28px;flex-wrap:wrap}
  .reg-sig-block{text-align:center;width:230px}
  .reg-sig-line{border-top:1px solid #1e293b;padding-top:6px;font-size:10.5px;color:#475569}
  .reg-footer{margin-top:28px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:9.5px;color:#94a3b8;text-align:center;font-family:'Segoe UI',Arial,sans-serif}
  .actions{position:fixed;bottom:20px;right:20px;display:flex;gap:8px;z-index:100}
  .btn-print{background:#1e3a5f;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;box-shadow:0 4px 14px rgba(30,58,95,.45);font-family:'Segoe UI',Arial,sans-serif}
  .btn-close{background:#e2e8f0;color:#334155;border:none;padding:10px 16px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Segoe UI',Arial,sans-serif}
  @media print{
    .actions{display:none!important}
    .reg-wrap{padding:0}
    .reg-section{break-inside:avoid}
    @page{margin:1.5cm}
  }
`;

// "párrafo1\n\npárrafo2" → <p>párrafo1</p><p>párrafo2</p>, con \n simple
// dentro de un párrafo como <br> — mismo formato libre que ya usa el campo
// de notas del pastor (MemberDetailPage) y custom_body de Cartas.
function regParagraphs(text) {
  if (!text) return "";
  return text
    .split(/\n{2,}/)
    .map((p) => `<p>${p.trim().replace(/\n/g, "<br>")}</p>`)
    .join("");
}

const regFmtDate = (d) => {
  if (!d) return null;
  return new Date(d.slice(0, 10) + "T12:00:00").toLocaleDateString("es-ES", {
    day: "numeric", month: "long", year: "numeric",
  });
};

export function buildInternalRegulations(regulations = {}, church = {}) {
  const {
    title = "Reglamento Interno", subtitle, preamble,
    sections = [], signatories = [], effective_date,
  } = regulations;

  const churchName = church.name || "Iglesia Cristiana";
  const logoHtml = church.logoUrl
    ? `<div class="reg-logo"><img src="${church.logoUrl}" alt="Logo"></div>`
    : `<div class="reg-cross">✝</div>`;

  const preambleHtml = preamble
    ? `<div class="reg-preamble">${regParagraphs(preamble)}</div>`
    : "";

  const sectionsHtml = sections.map((s) => {
    const introHtml = s.intro ? `<div class="reg-intro">${regParagraphs(s.intro)}</div>` : "";

    const itemsHtml = (s.items || []).length
      ? (s.items || []).map((it) => `
        <div class="reg-item">
          ${it.label ? `<span class="reg-item-label">${it.label}.</span>` : ""}
          <span class="reg-item-body">${it.title ? `<strong>${it.title}:</strong> ` : ""}${it.body || ""}</span>
        </div>`).join("")
      : "";

    const calloutHtml = s.callout?.body
      ? `<div class="reg-callout">${s.callout.title ? `<strong>${s.callout.title}:</strong> ` : ""}${s.callout.body}</div>`
      : "";

    const tableHtml = s.table?.rows?.length
      ? `<table class="reg-table">
          <thead><tr>${(s.table.columns || []).map((c) => `<th>${c}</th>`).join("")}</tr></thead>
          <tbody>${s.table.rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody>
        </table>`
      : "";

    return `<div class="reg-section">
      ${s.heading ? `<div class="reg-heading">${s.heading}</div>` : ""}
      ${introHtml}${itemsHtml}${calloutHtml}${tableHtml}
    </div>`;
  }).join("");

  const effectiveLabel = regFmtDate(effective_date);

  const sigHtml = signatories.length
    ? `<div class="reg-sig-row">${signatories.map((label) => `
        <div class="reg-sig-block">
          <div class="reg-sig-line">${label}<br>${churchName}</div>
        </div>`).join("")}</div>`
    : "";

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>${title} — ${churchName}</title>
<style>${REG_CSS}</style></head><body>

<div class="reg-wrap">

  <div class="reg-header">
    <div class="reg-header-text">
      <div class="reg-church-name">${churchName}</div>
      <div class="reg-title">${title}</div>
      ${subtitle ? `<div class="reg-subtitle">${subtitle}</div>` : ""}
    </div>
    ${logoHtml}
  </div>

  ${preambleHtml}

  ${sectionsHtml}

  ${effectiveLabel ? `<p class="reg-meta">Vigente desde el ${effectiveLabel}</p>` : ""}

  ${sigHtml}

  <div class="reg-footer">${churchName} · ${title} · Sistema de Control Eclesiástico</div>

</div>

<div class="actions">
  <button class="btn-print" onclick="window.print()">🖨&nbsp; Imprimir / Guardar PDF</button>
  <button class="btn-close" onclick="window.close()">✕ Cerrar</button>
</div>
</body></html>`;

  return html;
}

// ─────────────────────────────────────────────────────────────────────────
// INVENTARIO — listado (reusado tanto para el reporte completo/filtrado
// como para un solo ítem desde su página de detalle, pasando un array de 1)
// ─────────────────────────────────────────────────────────────────────────
const INV_CONDITION_LABEL = {
  BUENO: "Bueno", REGULAR: "Regular", MALO: "Malo", DANADO: "Dañado",
};

export function buildInventoryReport(items = [], church = {}, opts = {}) {
  const title = opts.title || "Reporte de Inventario";
  const totalItems = items.length;
  const totalUnits = items.reduce((s, it) => s + Number(it.quantity || 0), 0);
  const totalValue = items.reduce((s, it) => s + Number(it.value || 0) * Number(it.quantity || 0), 0);
  const lowStockItems = items.filter((it) => it.min_stock != null && it.quantity <= it.min_stock);

  const rows = items.length === 0
    ? `<tr><td colspan="8" style="text-align:center;color:#94a3b8;padding:14px">Sin ítems registrados</td></tr>`
    : items.map((it, i) => {
        const isLow = it.min_stock != null && it.quantity <= it.min_stock;
        return `<tr>
          <td style="text-align:center;color:#94a3b8;width:30px">${i + 1}</td>
          <td style="color:#64748b;font-family:monospace;font-size:11px">${it.code || "—"}</td>
          <td style="font-weight:500">${it.name}${isLow ? ' <span style="color:#b45309;font-size:10px">⚠ stock bajo</span>' : ""}</td>
          <td style="color:#64748b">${it.category_name || "Sin categoría"}</td>
          <td style="text-align:center">${it.quantity} ${it.unit || ""}</td>
          <td style="color:#64748b">${it.location || "—"}</td>
          <td style="text-align:center">${INV_CONDITION_LABEL[it.condition] || it.condition}</td>
          <td style="text-align:right">${it.value != null ? fmtM(it.value) : "—"}</td>
        </tr>`;
      }).join("");

  const notesBlock = items.length === 1 && items[0].notes
    ? `<div class="section"><h2>Notas</h2><p style="color:#334155;white-space:pre-line">${items[0].notes}</p></div>`
    : "";

  return doc(title, `
    ${hdr(title, items.length === 1 ? "Ficha de ítem" : "Listado de equipo y suministros", "", church)}
    <div class="metrics">
      <div class="metric"><div class="metric-lbl">Total ítems</div><div class="metric-val">${totalItems}</div></div>
      <div class="metric"><div class="metric-lbl">Unidades</div><div class="metric-val">${totalUnits}</div></div>
      <div class="metric"><div class="metric-lbl">Valor estimado</div><div class="metric-val">${fmtM(totalValue)}</div></div>
    </div>
    ${lowStockItems.length > 0 ? `<p style="color:#b45309;font-size:11px;margin:-10px 0 16px">⚠ ${lowStockItems.length} ítem(s) con stock bajo</p>` : ""}
    <div class="section">
      <h2>Listado</h2>
      <table>
        <thead><tr>
          <th style="text-align:center;width:30px">#</th><th>Código</th><th>Nombre</th><th>Categoría</th>
          <th style="text-align:center">Cantidad</th><th>Ubicación</th>
          <th style="text-align:center">Estado</th><th style="text-align:right">Valor</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    ${notesBlock}
    ${footerFor(church)}
  `);
}
