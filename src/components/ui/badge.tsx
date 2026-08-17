import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

const styles: Record<string, string> = {
  confirmed: "bg-turf-dim text-turf-bright border-turf-dim",
  pending: "bg-amber-dim/40 text-amber border-amber-dim",
  canceled: "bg-clay/10 text-clay border-clay/40",
};

export function Badge({ className, tone = "confirmed", ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof styles }) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wide", styles[tone], className)}
      {...props}
    />
  );
}
