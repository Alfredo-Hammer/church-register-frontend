import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';

// ── Constantes de diseño ──────────────────────────────────────────────────────

const NAVY  = '#0d1f3c';
const GOLD  = '#b8933a';
const CREAM = '#fdf8f0';

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseDate(dateStr) {
  return new Date(String(dateStr).slice(0, 10) + 'T00:00:00');
}

function dateRange(start, end) {
  const opts = { day: 'numeric', month: 'long', year: 'numeric' };
  const s = parseDate(start).toLocaleDateString('es', opts);
  if (String(start).slice(0, 10) === String(end).slice(0, 10)) return s;
  return `${s} – ${parseDate(end).toLocaleDateString('es', opts)}`;
}

function safeName(str) {
  return str.replace(/[\s/\\?%*:|"<>]/g, '-');
}

// `format` sigue la firma de jsPDF: 'letter', 'a4', o [ancho, alto] en mm
// para tamaños que no son de página completa, como el gafete.
async function domToPDF(el, filename, orientation, elW, elH, format = 'letter') {
  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    scrollX: 0,
    scrollY: 0,
    width: elW,
    height: elH,
    windowWidth: elW,
    windowHeight: elH,
  });
  const img = canvas.toDataURL('image/jpeg', 0.93);
  const pdf = new jsPDF({ orientation, unit: 'mm', format });
  const pw  = pdf.internal.pageSize.getWidth();
  const ph  = pdf.internal.pageSize.getHeight();
  pdf.addImage(img, 'JPEG', 0, 0, pw, ph);
  pdf.save(filename);
}

// ── Certificado de Participación ──────────────────────────────────────────────
// Genera un PDF tipo carta landscape.
// church: { name, pastorName, phone, logoUrl }

export async function generateCertificadoPDF(conference, registration, church, onStart, onEnd) {
  onStart?.();

  // 1056×816 px = 11×8.5 in a 96 dpi (landscape letter)
  const W = 1056;
  const H = 816;

  const churchName = church?.name       || '';
  const pastor     = church?.pastorName || null;
  const phone      = church?.phone      || null;
  const logo       = church?.logoUrl    || null;

  const logoHTML = logo
    ? `<img src="${logo}" alt="${churchName}"
        style="width:64px;height:64px;object-fit:contain;border-radius:50%;
          border:2px solid ${GOLD};flex-shrink:0;" />`
    : '';

  const churchHeaderHTML = (churchName || logo) ? `
    <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:14px;">
      ${logoHTML}
      <div style="text-align:${logo ? 'left' : 'center'};">
        <div style="font-size:18px;font-weight:700;color:${NAVY};line-height:1.2;">${churchName}</div>
        ${pastor ? `<div style="font-size:11px;color:#4a5568;font-family:Arial,sans-serif;margin-top:2px;">Pr. ${pastor}</div>` : ''}
        ${phone  ? `<div style="font-size:11px;color:#718096;font-family:Arial,sans-serif;">${phone}</div>` : ''}
      </div>
    </div>
    <div style="width:240px;height:1px;background:${GOLD};margin:0 auto 14px;"></div>
  ` : '';

  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed;left:-9999px;top:0;
    width:${W}px;height:${H}px;
    background:${CREAM};overflow:hidden;
    font-family:Georgia,"Times New Roman",serif;
  `;

  el.innerHTML = `
    <div style="width:100%;height:100%;background:${CREAM};display:flex;flex-direction:column;
      align-items:center;justify-content:center;position:relative;box-sizing:border-box;
      padding:44px 90px;border:12px solid ${NAVY};">

      <div style="position:absolute;inset:20px;border:2px solid ${GOLD};pointer-events:none;"></div>

      <div style="position:absolute;top:28px;left:28px;width:28px;height:28px;
        border-top:2px solid ${GOLD};border-left:2px solid ${GOLD};"></div>
      <div style="position:absolute;top:28px;right:28px;width:28px;height:28px;
        border-top:2px solid ${GOLD};border-right:2px solid ${GOLD};"></div>
      <div style="position:absolute;bottom:28px;left:28px;width:28px;height:28px;
        border-bottom:2px solid ${GOLD};border-left:2px solid ${GOLD};"></div>
      <div style="position:absolute;bottom:28px;right:28px;width:28px;height:28px;
        border-bottom:2px solid ${GOLD};border-right:2px solid ${GOLD};"></div>

      <div style="position:absolute;font-size:380px;color:rgba(13,31,60,0.04);top:50%;
        left:50%;transform:translate(-50%,-50%);line-height:1;pointer-events:none;">✝</div>

      <div style="position:relative;text-align:center;width:100%;
        display:flex;flex-direction:column;align-items:center;">

        ${churchHeaderHTML}

        <div style="font-size:9px;font-weight:700;letter-spacing:5px;text-transform:uppercase;
          color:${GOLD};font-family:Arial,sans-serif;margin-bottom:10px;">
          Certificado de Participación
        </div>

        <div style="font-size:13px;color:#4a5568;font-style:italic;margin-bottom:10px;">
          Se certifica con honor que
        </div>

        <div style="font-size:50px;font-weight:700;color:${NAVY};line-height:1.1;margin-bottom:12px;">
          ${registration.full_name}
        </div>

        <div style="font-size:13px;color:#4a5568;font-style:italic;margin-bottom:6px;">
          participó en la
        </div>

        <div style="font-size:22px;font-weight:700;color:${NAVY};margin-bottom:4px;">
          ${conference.name}
        </div>

        ${conference.theme ? `
          <div style="font-size:12px;font-style:italic;color:#4a5568;margin-bottom:3px;">
            "${conference.theme}"
          </div>` : ''}

        ${conference.theme_verse ? `
          <div style="font-size:10px;color:${GOLD};font-style:italic;font-family:Arial,sans-serif;margin-bottom:14px;">
            ${conference.theme_verse}
          </div>` : '<div style="margin-bottom:14px;"></div>'}

        <div style="font-family:Arial,sans-serif;font-size:11px;color:#718096;margin-bottom:26px;letter-spacing:0.5px;">
          ${dateRange(conference.start_date, conference.end_date)}
          ${conference.location        ? ` · ${conference.location}`        : ''}
          ${registration.origin_church ? ` · ${registration.origin_church}` : ''}
        </div>

        <div style="display:flex;gap:80px;justify-content:center;width:100%;">
          <div style="text-align:center;">
            ${pastor ? `<div style="font-size:11px;color:${NAVY};font-family:Georgia,serif;margin-bottom:4px;">Pr. ${pastor}</div>` : ''}
            <div style="width:200px;height:1px;background:#718096;margin:0 auto 6px;"></div>
            <div style="font-size:9px;color:#4a5568;font-family:Arial,sans-serif;
              text-transform:uppercase;letter-spacing:2px;">Firma del Pastor</div>
          </div>
          <div style="text-align:center;">
            <div style="width:200px;height:1px;background:#718096;margin:0 auto 6px;"></div>
            <div style="font-size:9px;color:#4a5568;font-family:Arial,sans-serif;
              text-transform:uppercase;letter-spacing:2px;">Sello de la Iglesia</div>
          </div>
        </div>

        <div style="width:240px;height:1px;background:${GOLD};margin-top:18px;"></div>
      </div>
    </div>
  `;

  document.body.appendChild(el);
  try {
    await domToPDF(el, `certificado-${safeName(registration.full_name)}.pdf`, 'landscape', W, H);
    onEnd?.(null);
  } catch (err) {
    console.error(err);
    onEnd?.('Error al generar el certificado.');
  } finally {
    document.body.removeChild(el);
  }
}

// ── PDF del Gafete ────────────────────────────────────────────────────────────
// Tarjeta que el asistente porta durante la conferencia, con el QR que el
// equipo escanea en la puerta de cada sesión. El QR se genera con la
// librería `qrcode` (no `qrcode.react`, que se usa en el diálogo de vista
// previa) porque produce directamente una imagen PNG lista para incrustar en
// el HTML que se rasteriza, sin depender de montar un componente React fuera
// de pantalla y esperar a que el canvas termine de pintarse.

const BADGE_W = 384; // 4 in a 96 dpi
const BADGE_H = 576; // 6 in a 96 dpi
const BADGE_FORMAT_MM = [101.6, 152.4]; // 4in × 6in

// Compartida entre el gafete individual y el lote: así los dos salen
// idénticos siempre, en vez de arriesgarse a que diverjan con el tiempo.
function buildBadgeHtml(conference, registration, church, qrDataUrl) {
  const churchName = church?.name || '';
  const logo = church?.logoUrl || null;
  const photo = registration.photo_url || null;

  return `
    <div style="width:100%;height:100%;background:${CREAM};display:flex;flex-direction:column;
      align-items:center;box-sizing:border-box;padding:24px 24px 28px;border:6px solid ${NAVY};position:relative;">

      <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
        ${logo ? `<img src="${logo}" alt="${churchName}" style="width:32px;height:32px;object-fit:contain;
          border-radius:50%;border:2px solid ${GOLD};" />` : ''}
        <div style="font-size:12px;font-weight:700;color:${NAVY};text-align:center;">${churchName}</div>
      </div>

      <div style="width:160px;height:1px;background:${GOLD};margin:12px 0;"></div>

      <div style="width:108px;height:108px;border-radius:50%;overflow:hidden;border:3px solid ${GOLD};
        background:#e8e2d4;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        ${photo
          ? `<img src="${photo}" alt="" style="width:100%;height:100%;object-fit:cover;" />`
          : `<span style="font-family:Arial,sans-serif;font-size:34px;font-weight:700;color:${NAVY};">
              ${(registration.full_name || '?').charAt(0).toUpperCase()}</span>`}
      </div>

      <div style="font-size:8px;font-weight:700;letter-spacing:3px;text-transform:uppercase;
        color:${GOLD};font-family:Arial,sans-serif;margin-top:10px;">Gafete de Participante</div>

      <div style="margin-top:10px;font-size:24px;font-weight:700;color:${NAVY};
        text-align:center;line-height:1.15;word-break:break-word;">
        ${registration.full_name}
      </div>

      ${registration.origin_church ? `
        <div style="margin-top:4px;font-size:12px;color:#4a5568;font-family:Arial,sans-serif;text-align:center;">
          ${registration.origin_church}
        </div>` : ''}

      <div style="margin-top:auto;margin-bottom:8px;background:#fff;padding:10px;border-radius:8px;">
        <img src="${qrDataUrl}" alt="QR" style="width:116px;height:116px;display:block;" />
      </div>
      ${registration.check_in_pin ? `
        <div style="text-align:center;margin-bottom:12px;">
          <div style="font-size:7px;letter-spacing:2px;text-transform:uppercase;color:#a89f8c;font-family:Arial,sans-serif;">PIN de respaldo</div>
          <div style="font-family:Menlo,Consolas,monospace;font-size:20px;font-weight:700;letter-spacing:4px;color:${NAVY};">
            ${registration.check_in_pin}
          </div>
        </div>` : ''}

      <div style="width:160px;height:1px;background:${GOLD};margin-bottom:10px;"></div>

      <div style="font-size:13px;font-weight:700;color:${NAVY};text-align:center;line-height:1.2;">
        ${conference.name}
      </div>
      <div style="font-size:10px;color:#718096;font-family:Arial,sans-serif;margin-top:2px;">
        ${dateRange(conference.start_date, conference.end_date)}
        ${conference.location ? ` · ${conference.location}` : ''}
      </div>
    </div>
  `;
}

export async function generateGafetePDF(conference, registration, church, onStart, onEnd) {
  onStart?.();

  if (!registration.check_in_token) {
    onEnd?.('Este registro no tiene un token de gafete. Vuelve a cargar la página.');
    return;
  }

  let qrDataUrl;
  try {
    qrDataUrl = await QRCode.toDataURL(registration.check_in_token, {
      width: 280, margin: 1, color: {dark: '#0d1f3c', light: '#ffffff'},
    });
  } catch (err) {
    console.error(err);
    onEnd?.('Error al generar el código QR.');
    return;
  }

  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed;left:-9999px;top:0;
    width:${BADGE_W}px;height:${BADGE_H}px;
    background:${CREAM};overflow:hidden;
    font-family:Georgia,"Times New Roman",serif;
  `;
  el.innerHTML = buildBadgeHtml(conference, registration, church, qrDataUrl);

  document.body.appendChild(el);
  try {
    await domToPDF(
      el, `gafete-${safeName(registration.full_name)}.pdf`,
      'portrait', BADGE_W, BADGE_H, BADGE_FORMAT_MM
    );
    onEnd?.(null);
  } catch (err) {
    console.error(err);
    onEnd?.('Error al generar el gafete.');
  } finally {
    document.body.removeChild(el);
  }
}

// Hoja carta — lo que cualquier impresora normal tiene cargado, a
// diferencia de una página a la medida exacta del gafete (que exigiría
// cartulina precortada a 4×6, algo que casi nadie tiene a mano).
const SHEET_FORMAT_MM = [215.9, 279.4]; // Carta/Letter, portrait
const SHEET_MARGIN_MM = 4;
const BADGE_GAP_MM = 3;

// Cuántos gafetes de tamaño BADGE_FORMAT_MM entran por hoja, en cuadrícula,
// y desde dónde arrancar para que la cuadrícula quede centrada en vez de
// pegada a una esquina. Calculado en vez de fijo a 2×1: si el tamaño del
// gafete cambia el día de mañana, esto se reacomoda solo.
function computeBadgeGrid() {
  const [pageW, pageH] = SHEET_FORMAT_MM;
  const [cellW, cellH] = BADGE_FORMAT_MM;
  const usableW = pageW - SHEET_MARGIN_MM * 2;
  const usableH = pageH - SHEET_MARGIN_MM * 2;
  const cols = Math.max(1, Math.floor((usableW + BADGE_GAP_MM) / (cellW + BADGE_GAP_MM)));
  const rows = Math.max(1, Math.floor((usableH + BADGE_GAP_MM) / (cellH + BADGE_GAP_MM)));
  const gridW = cols * cellW + (cols - 1) * BADGE_GAP_MM;
  const gridH = rows * cellH + (rows - 1) * BADGE_GAP_MM;
  return {
    cols, rows,
    startX: SHEET_MARGIN_MM + (usableW - gridW) / 2,
    startY: SHEET_MARGIN_MM + (usableH - gridH) / 2,
  };
}

// PDF de varios gafetes en cuadrícula sobre hojas carta — varios por hoja
// en vez de uno por página, para no gastar una hoja entera por persona.
// Cada celda lleva un borde fino como guía de corte. onProgress avisa
// cuántos van, porque con muchos inscritos esto tarda unos segundos.
export async function generateGafetesBatchPDF(conference, registrations, church, onStart, onProgress, onEnd) {
  onStart?.();

  const conToken = registrations.filter((r) => r.check_in_token);
  if (conToken.length === 0) {
    onEnd?.('Ninguno de los inscritos seleccionados tiene gafete generado.');
    return;
  }

  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed;left:-9999px;top:0;
    width:${BADGE_W}px;height:${BADGE_H}px;
    background:${CREAM};overflow:hidden;
    font-family:Georgia,"Times New Roman",serif;
  `;
  document.body.appendChild(el);

  const { cols, rows, startX, startY } = computeBadgeGrid();
  const perPage = cols * rows;
  const [cellW, cellH] = BADGE_FORMAT_MM;

  try {
    let pdf = null;
    for (let i = 0; i < conToken.length; i++) {
      const registration = conToken[i];
      onProgress?.(i + 1, conToken.length);

      const qrDataUrl = await QRCode.toDataURL(registration.check_in_token, {
        width: 280, margin: 1, color: {dark: '#0d1f3c', light: '#ffffff'},
      });
      el.innerHTML = buildBadgeHtml(conference, registration, church, qrDataUrl);

      const canvas = await html2canvas(el, {
        scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false,
        scrollX: 0, scrollY: 0, width: BADGE_W, height: BADGE_H,
        windowWidth: BADGE_W, windowHeight: BADGE_H,
      });
      const img = canvas.toDataURL('image/jpeg', 0.93);

      const posInPage = i % perPage;
      if (posInPage === 0) {
        if (!pdf) {
          pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: SHEET_FORMAT_MM });
        } else {
          pdf.addPage(SHEET_FORMAT_MM, 'portrait');
        }
      }
      const col = posInPage % cols;
      const row = Math.floor(posInPage / cols);
      const x = startX + col * (cellW + BADGE_GAP_MM);
      const y = startY + row * (cellH + BADGE_GAP_MM);

      pdf.addImage(img, 'JPEG', x, y, cellW, cellH);
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.2);
      pdf.rect(x, y, cellW, cellH); // guía de corte
    }

    pdf.save(`gafetes-${safeName(conference.name)}.pdf`);
    onEnd?.(null);
  } catch (err) {
    console.error(err);
    onEnd?.('Error al generar los gafetes.');
  } finally {
    document.body.removeChild(el);
  }
}
