import * as React from "react";
import {cn} from "@/lib/utils";
import {X} from "lucide-react";

const Dialog = ({open, onOpenChange, children}) => {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      {/* Content */}
      <div className="relative z-50 w-full flex justify-center px-4">
        {children}
      </div>
    </div>
  );
};

const DialogContent = React.forwardRef(
  ({className, children, onClose, ...props}, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-[90vh] overflow-y-auto",
        "w-full max-w-[95vw] sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl p-6",
        className,
      )}
      {...props}
    >
      {onClose && (
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
        >
          <X className="h-4 w-4 text-gray-400" />
          <span className="sr-only">Close</span>
        </button>
      )}
      {children}
    </div>
  ),
);
DialogContent.displayName = "DialogContent";

const DialogHeader = ({className, ...props}) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left mb-4",
      className,
    )}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({className, ...props}) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6",
      className,
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef(({className, ...props}, ref) => (
  <h2
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight text-white",
      className,
    )}
    {...props}
  />
));
DialogTitle.displayName = "DialogTitle";

const DialogDescription = React.forwardRef(({className, ...props}, ref) => (
  <p ref={ref} className={cn("text-sm text-gray-400", className)} {...props} />
));
DialogDescription.displayName = "DialogDescription";

export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
};
