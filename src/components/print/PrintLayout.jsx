import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer, Download, X, Loader2 } from 'lucide-react';

/**
 * PrintLayout — overlay de vista previa con barra de acciones.
 *
 * Props:
 *   title       — título de la barra (ej: "Vista Previa")
 *   subtitle    — subtítulo (ej: nombre del programa)
 *   onClose     — cerrar el overlay
 *   onExportPdf — función async que genera y descarga el PDF;
 *                 recibe (onStart, onEnd) para controlar el estado de carga.
 *                 Si no se pasa, solo aparece el botón de imprimir.
 *   children    — el documento (<PrintPage> …)
 *
 * Uso:
 *   <PrintLayout title="Programa de Culto" subtitle={program.title}
 *                onClose={...} onExportPdf={handleExportPdf}>
 *     <PrintPage> … </PrintPage>
 *   </PrintLayout>
 */
export default function PrintLayout({ title = 'Vista Previa', subtitle, onClose, onExportPdf, children }) {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  const handleExport = () => {
    if (!onExportPdf) return;
    setExportError('');
    onExportPdf(
      () => setExporting(true),
      (err) => { setExporting(false); if (err) setExportError(err); },
    );
  };

  return (
    <>
      {/* CSS de impresión — sólo muestra #print-root */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #print-root { display: block !important; }
          #print-root { position: fixed; inset: 0; overflow: visible; }
          #print-toolbar { display: none !important; }
          #print-scroll  { overflow: visible !important; padding: 0 !important; background: white !important; }
          #print-page    {
            box-shadow: none !important;
            border-radius: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
        }
      `}</style>

      {createPortal(
      <div id="print-root" className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col">

        {/* Barra de acciones */}
        <div id="print-toolbar"
          className="flex items-center justify-between px-4 sm:px-6 py-3 bg-white border-b border-gray-200 flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Printer className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-gray-800">{title}</p>
              {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Exportar PDF */}
            {onExportPdf && (
              <button
                onClick={handleExport}
                disabled={exporting}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                title="Descargar como PDF"
              >
                {exporting
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Download className="h-4 w-4" />
                }
                <span className="hidden sm:inline">{exporting ? 'Generando...' : 'Exportar PDF'}</span>
              </button>
            )}

            {/* Imprimir */}
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>

            {/* Cerrar */}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Error de exportación */}
        {exportError && (
          <div className="flex-shrink-0 px-6 py-2 bg-red-50 border-b border-red-200 text-red-600 text-sm text-center">
            {exportError}
          </div>
        )}

        {/* Área scrollable con el documento */}
        <div id="print-scroll" className="flex-1 overflow-y-auto py-8 px-4 flex justify-center bg-gray-100">
          {children}
        </div>
      </div>,
      document.body
      )}
    </>
  );
}
