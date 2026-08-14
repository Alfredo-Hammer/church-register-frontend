import * as React from "react";
import {AlertTriangle} from "lucide-react";
import {Dialog, DialogContent, DialogFooter} from "./Dialog";
import {Button} from "./Button";

/**
 * Diálogo de confirmación genérico para acciones que no deberían ejecutarse
 * con un solo clic (cerrar sesión, eliminar, etc.). Pensado para reemplazar
 * los `window.confirm()` y los modales de confirmación copiados por página.
 *
 * `onConfirm` puede ser async — mientras se resuelve, los botones se
 * deshabilitan y el de confirmar muestra `confirmingLabel`.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  confirmingLabel = "Procesando…",
  cancelLabel = "Cancelar",
  onConfirm,
  variant = "default", // "default" | "destructive"
}) {
  const [loading, setLoading] = React.useState(false);

  const handleConfirm = async () => {
    if (loading) return;
    try {
      setLoading(true);
      await onConfirm?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !loading && onOpenChange(o)}>
      <DialogContent
        className="max-w-[22rem] sm:max-w-[22rem] p-6"
        onClose={() => !loading && onOpenChange(false)}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          {variant === "destructive" && (
            <span className="w-11 h-11 rounded-full bg-destructive/15 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </span>
          )}
          <div className="space-y-1">
            <h2 className="text-base font-semibold leading-snug text-foreground">{title}</h2>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        <DialogFooter className="mt-5 grid grid-cols-2 gap-2 sm:space-x-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? confirmingLabel : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
