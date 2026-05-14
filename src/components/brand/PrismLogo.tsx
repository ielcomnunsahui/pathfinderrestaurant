import logo from "@/assets/prism-logo.png";
import { cn } from "@/lib/utils";

export function PrismLogo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-black ring-1 ring-primary/30 shadow-gold">
        <img src={logo} alt="Pathfinder Restaurant logo" className="h-full w-full object-contain" />
      </div>
      {showText && (
        <div className="flex flex-col leading-none">
          <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Pathfinder</span>
          <span className="font-display text-lg font-bold tracking-tight text-gradient-gold">
            P.R.I.S.M
          </span>
        </div>
      )}
    </div>
  );
}