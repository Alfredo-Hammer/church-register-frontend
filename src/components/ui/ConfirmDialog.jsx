import * as React from "react";
import {AlertTriangle} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./Dialog";
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
        className="max-w-sm"
        onClose={() => !loading && onOpenChange(false)}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {variant === "destructive" && (
              <span className="w-9 h-9 rounded-lg bg-destructive/15 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-destructive" />
              </span>
            )}
            {title}
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
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
