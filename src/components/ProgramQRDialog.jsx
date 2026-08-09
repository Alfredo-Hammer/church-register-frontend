import {useState} from "react";
import {QRCodeSVG} from "qrcode.react";
import {Dialog, DialogContent, DialogHeader, DialogFooter} from "@/components/ui/Dialog";
import {Button} from "@/components/ui/Button";
import {Copy, Check, Monitor} from "lucide-react";

/**
 * QR del programa general: apunta a la pantalla pública (/pantalla/:token),
 * la misma que se cuelga en el salón. Sirve para imprimirlo en la entrada o
 * en el volante de la conferencia, para que cada quien lo abra en su propio
 * teléfono en vez de depender solo del televisor del pasillo.
 *
 * No hace ninguna llamada al backend: el token ya viene en `conference`
 * (public_token), así que solo arma la URL y la dibuja como QR local, sin
 * pedirle nada a ningún servicio externo.
 */
export function ProgramQRDialog({open, onClose, conference}) {
  const [copiado, setCopiado] = useState(false);
  if (!conference?.public_token) return null;

  const url = `${window.location.origin}/pantalla/${conference.public_token}`;

  const copiar = async () => {
    await navigator.clipboard.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm bg-card border-border">
        <DialogHeader>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Monitor size={16} /> Programa en pantalla
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">{conference.name}</p>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          <div className="rounded-xl bg-white p-4">
            <QRCodeSVG value={url} size={200} level="M" />
          </div>
          <p className="text-xs text-center text-muted-foreground text-pretty">
            Cualquiera que escanee este código ve el programa del día en su
            propio teléfono, tal como aparece en la pantalla del salón.
          </p>
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
