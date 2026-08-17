import { Bell, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TopBar({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-ink/90 px-4 py-4 backdrop-blur sm:px-8">
      <h1 className="font-display text-lg font-semibold sm:text-xl">{title}</h1>
      <div className="flex items-center gap-2 sm:gap-3">
        <button className="rounded-full border border-line p-2 text-chalk-dim hover:text-chalk">
          <Bell className="h-4 w-4" />
        </button>
        <Button size="sm" className="hidden sm:inline-flex">
          <Plus className="h-4 w-4" /> Nueva reserva
        </Button>
        <Button size="sm" className="sm:hidden !px-3">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
