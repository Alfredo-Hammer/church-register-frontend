import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Genera y descarga un PDF A4 con la ficha del miembro a partir de #print-page.
 */
export async function exportMemberPdf(member, onStart, onEnd) {
  const el = document.getElementById('print-page');
  if (!el) {
    onEnd?.('No se encontró el documento para exportar.');
    return;
  }

  onStart?.();

  try {
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      scrollX: 0,
      scrollY: 0,
      width: el.scrollWidth,
      height: el.scrollHeight,
      windowWidth: el.scrollWidth,
      windowHeight: el.scrollHeight,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const pageW = pdf.internal.pageSize.getWidth();  // 210 mm
    const pageH = pdf.internal.pageSize.getHeight(); // 297 mm

    const scaleW = pageW / canvas.width;
    const scaleH = pageH / canvas.height;
    const scale = Math.min(scaleW, scaleH);

    const imgW = canvas.width * scale;
    const imgH = canvas.height * scale;
    const x = (pageW - imgW) / 2;
    const y = (pageH - imgH) / 2;

    pdf.addImage(imgData, 'PNG', x, y, imgW, imgH);

    const name = member
      ? `${member.first_name}-${member.last_name}`.toLowerCase().replace(/\s+/g, '-')
      : 'miembro';
    pdf.save(`ficha-${name}.pdf`);
    onEnd?.(null);
  } catch (err) {
    console.error('Error generando PDF de miembro:', err);
    onEnd?.('Error al generar el PDF. Intenta de nuevo.');
  }
}
