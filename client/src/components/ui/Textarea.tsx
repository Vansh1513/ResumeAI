import { type TextareaHTMLAttributes, forwardRef } from "react";
import { cn } from "../../utils/cn";

const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full resize-y rounded-lg border border-border bg-surface-overlay px-3.5 py-2.5 text-sm text-text",
        "placeholder:text-text-subtle min-h-[140px] leading-relaxed",
        "transition-all duration-150",
        "focus:border-primary focus:bg-surface-raised focus:outline-none focus:ring-2 focus:ring-primary/20",
        "disabled:cursor-not-allowed disabled:opacity-40",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
export default Textarea;
