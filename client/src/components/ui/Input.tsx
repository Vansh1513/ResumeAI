import { type InputHTMLAttributes, forwardRef } from "react";
import { cn } from "../../utils/cn";

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-lg border border-border bg-surface-overlay px-3.5 py-2.5 text-sm text-text",
        "placeholder:text-text-subtle",
        "transition-all duration-150",
        "hover:border-border hover:bg-surface-overlay",
        "focus:border-primary focus:bg-surface-raised focus:outline-none focus:ring-2 focus:ring-primary/20",
        "disabled:cursor-not-allowed disabled:opacity-40",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
export default Input;
