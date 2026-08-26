import {useState} from "react";
import {QRCodeSVG} from "qrcode.react";
import {Dialog, DialogContent, DialogHeader, DialogFooter} from "@/components/ui/Dialog";
import {Button} from "@/components/ui/Button";
import {Copy, Check, Monitor, ExternalLink, BookOpen} from "lucide-react";
import {cn} from "@/lib/utils";

/**
 * Dos QR distintos, mismo diálogo — cada uno con un propósito diferente:
 *  - "pantalla" (/pantalla/:token): la pantalla del salón, un día a la vez,
 *    enfocada en "qué está pasando ahora". Pensada para el televisor o para
 *    que alguien la siga en vivo desde su celular.
 *  - "programa" (/programa/:token): el programa completo, todos los días y
 *    todas las sesiones sin límite, para compartir con oradores o el
 *    público en general — no depende de la hora ni de qué esté en curso.
 *
 * No hace ninguna llamada al backend: el token ya viene en `conference`
 * (public_token, el mismo para ambos — mismo nivel de exposición pública),
 * así que solo arma la URL y la dibuja como QR local.
 */
export function ProgramQRDialog({open, onClose, conference}) {
  const [mode, setMode] = useState("pantalla");
  const [copiado, setCopiado] = useState(false);
  if (!conference?.public_token) return null;

  const path = mode === "pantalla" ? "pantalla" : "programa";
  const url = `${window.location.origin}/${path}/${conference.public_token}`;

  const copiar = async () => {
    await navigator.clipboard.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  };

  const switchMode = (m) => {
    if (m === mode) return;
    setMode(m);
    setCopiado(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm bg-card border-border">
        <DialogHeader>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            {mode === "pantalla" ? <Monitor size={16} /> : <BookOpen size={16} />}
            {mode === "pantalla" ? "Programa en pantalla" : "Programa completo"}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">{conference.name}</p>
        </DialogHeader>

        <div className="flex gap-1.5 rounded-xl border border-border bg-muted/50 p-1 mt-1">
          <button
            onClick={() => switchMode("pantalla")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors",
              mode === "pantalla" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Monitor size={13} /> En vivo
          </button>
          <button
            onClick={() => switchMode("programa")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors",
              mode === "programa" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <BookOpen size={13} /> Programa completo
          </button>
        </div>

        <div className="flex flex-col items-center gap-4 py-2">
          <div className="rounded-xl bg-white p-4">
            <QRCodeSVG value={url} size={200} level="M" />
          </div>
          <p className="text-xs text-center text-muted-foreground text-pretty">
            {mode === "pantalla"
              ? "Cualquiera que escanee este código ve el programa del día en su propio teléfono, tal como aparece en la pantalla del salón."
              : "Cualquiera que escanee este código ve todos los días y todas las sesiones de la conferencia, sin límite — para oradores o el público en general."}
          </p>

          {/* En el televisor o kiosco del salón, este botón evita tener que
              escribir la URL a mano con un control remoto: se abre el
              navegador del equipo en esa dirección y se deja ahí. */}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 text-sm font-medium transition-colors"
          >
            <ExternalLink size={14} /> Abrir en pestaña nueva
          </a>

          <button
            onClick={copiar}
            className="w-full flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-left text-xs text-muted-foreground hover:border-blue-500 transition-colors"
          >
            <span className="truncate font-mono">{url}</span>
            {copiado
              ? <Check size={14} className="text-emerald-700 dark:text-emerald-400 shrink-0" />
              : <Copy size={14} className="shrink-0" />}
          </button>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
