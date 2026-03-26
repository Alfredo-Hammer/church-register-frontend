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
  @media print{
    .actions{display:none!important}
    body{padding:0}
    @page{margin:1.2cm}
  }
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

// ── Cabecera de cada reporte ──────────────────────────────────────────────
function hdr(title, subtitle, period) {
  return `<div class="hdr">
    <div class="hdr-l">
      <h1>${title}</h1>
      <p>${subtitle}</p>
      ${period ? `<p class="period">${period}</p>` : ""}
    </div>
    <div class="hdr-r">
      <strong>Sistema de Control Eclesiástico</strong><br>
      Generado: ${nowLabel()}
    </div>
  </div>`;
}

// ── Pie de página ─────────────────────────────────────────────────────────
const footer = `<div class="footer">Reporte generado automáticamente por el Sistema de Control Eclesiástico · Confidencial</div>`;

// ─────────────────────────────────────────────────────────────────────────
// 1. REPORTE GENERAL
// ─────────────────────────────────────────────────────────────────────────
export function buildOverviewReport({ mStats, fSummary, dSummary, bStats, gStats }) {
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
    ${hdr("Reporte General", "Resumen ejecutivo de estadísticas de la iglesia")}

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
    ${footer}
  `);
}

// ─────────────────────────────────────────────────────────────────────────
// 2. REPORTE DE MIEMBROS
// ─────────────────────────────────────────────────────────────────────────
export function buildMembersReport(stats) {
  const { total, active, birthdaysThisMonth, byGender = [], byStatus = [] } = stats;
  const GENDER_LABELS = { M: "Masculino", F: "Femenino", OTRO: "Otro" };
  const STATUS_COLORS = { ACTIVO: "#22c55e", INACTIVO: "#94a3b8", VISITANTE: "#eab308", TRANSFERIDO: "#3b82f6" };

  const maxG = Math.max(...byGender.map((g) => parseInt(g.count)), 1);
  const maxS = Math.max(...byStatus.map((s) => parseInt(s.count)), 1);

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

  return doc("Reporte de Miembros", `
    ${hdr("Reporte de Miembros", "Distribución y estadísticas de miembros registrados")}

    <div class="metrics">
      <div class="metric"><div class="metric-lbl">Total Miembros</div><div class="metric-val">${total}</div></div>
      <div class="metric"><div class="metric-lbl">Miembros Activos</div><div class="metric-val" style="color:#15803d">${active}</div><div class="metric-sub">${total > 0 ? ((active / total) * 100).toFixed(1) : 0}% del total</div></div>
      <div class="metric"><div class="metric-lbl">Cumpleaños este mes</div><div class="metric-val">${birthdaysThisMonth}</div></div>
    </div>

    <div class="two-col">
      <div class="section"><h2>Distribución por Género</h2>${gRows}</div>
      <div class="section"><h2>Distribución por Estado</h2>${sRows}</div>
    </div>
    ${footer}
  `);
}

// ─────────────────────────────────────────────────────────────────────────
// 3. REPORTE FINANCIERO
// ─────────────────────────────────────────────────────────────────────────
export function buildFinancesReport(data, { startDate, endDate } = {}) {
  const { summary, byCategory = [] } = data;
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
    ${hdr("Reporte Financiero", "Ingresos, egresos y balance por categoría", period)}

    <div class="metrics">
      <div class="metric"><div class="metric-lbl">Total Ingresos</div><div class="metric-val" style="color:#15803d">${fmtM(summary?.totalIngresos)}</div></div>
      <div class="metric"><div class="metric-lbl">Total Egresos</div><div class="metric-val" style="color:#dc2626">${fmtM(summary?.totalEgresos)}</div></div>
      <div class="metric"><div class="metric-lbl">Balance</div><div class="metric-val" style="color:${balance >= 0 ? "#15803d" : "#dc2626"}">${balance >= 0 ? "+" : "−"}${fmtM(Math.abs(balance))}</div><div class="metric-sub">${balance >= 0 ? "Superávit" : "Déficit"}</div></div>
    </div>

    ${catSection(ingresos, "#16a34a", "Ingresos por Categoría")}
    ${catSection(egresos, "#dc2626", "Egresos por Categoría")}
    ${footer}
  `);
}

// ─────────────────────────────────────────────────────────────────────────
// 4. REPORTE DE DIEZMOS Y OFRENDAS
// ─────────────────────────────────────────────────────────────────────────
export function buildDonationsReport(data, { startDate, endDate } = {}) {
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
    ${hdr("Reporte de Diezmos y Ofrendas", "Contribuciones personales de miembros", period)}

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
    ${footer}
  `);
}

// ─────────────────────────────────────────────────────────────────────────
// 5. REPORTE DE BAUTISMOS
// ─────────────────────────────────────────────────────────────────────────
export function buildBaptismsReport(data) {
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
    ${hdr("Reporte de Bautismos", `Estadísticas de bautismos — Año ${year}`)}

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
    ${footer}
  `);
}

// ─────────────────────────────────────────────────────────────────────────
// 6. CERTIFICADO DE BAUTISMO INDIVIDUAL
// ─────────────────────────────────────────────────────────────────────────
export function buildBaptismCertificate(baptismData, churchName = "Iglesia Cristiana") {
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
      <div class="lp-cross">✝</div>
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
