import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Genera y descarga un PDF A4 de una sola página a partir de #print-page.
 * Escala el contenido para que quepa completo (ancho y alto) sin paginar.
 */
export async function exportProgramPdf(filename = 'programa', onStart, onEnd) {
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
    const pdf     = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const pageW = pdf.internal.pageSize.getWidth();   // 210 mm
    const pageH = pdf.internal.pageSize.getHeight();  // 297 mm

    // Escalar para que todo entre en una sola página A4 (fit-to-page)
    const ratio  = canvas.width / canvas.height;
    const scaleW = pageW / canvas.width;
    const scaleH = pageH / canvas.height;
    const scale  = Math.min(scaleW, scaleH);

    const imgW = canvas.width  * scale;
    const imgH = canvas.height * scale;

    // Centrar en la página
    const x = (pageW - imgW) / 2;
    const y = (pageH - imgH) / 2;

    pdf.addImage(imgData, 'PNG', x, y, imgW, imgH);
    pdf.save(`${filename}.pdf`);
    onEnd?.(null);
  } catch (err) {
    console.error('Error generando PDF:', err);
    onEnd?.('Error al generar el PDF. Intenta de nuevo.');
  }
}
