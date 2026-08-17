import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-lg border border-line bg-ink px-3.5 py-2.5 text-sm text-chalk placeholder:text-chalk-dim focus:border-turf-bright focus:outline-none",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
