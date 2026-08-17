import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
}

const variants = {
  primary: "bg-turf-bright text-ink hover:bg-[#6cd67c]",
  ghost: "text-chalk-dim hover:text-chalk border border-line",
  outline: "border border-line text-chalk hover:border-chalk-dim",
};
const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-5 py-2.5 text-sm", lg: "px-6 py-3.5 text-sm" };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
