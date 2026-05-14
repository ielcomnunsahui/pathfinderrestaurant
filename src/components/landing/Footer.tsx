import { PrismLogo } from "@/components/brand/PrismLogo";

export function Footer() {
  return (
    <footer className="border-t border-border/50 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 md:flex-row">
        <PrismLogo />
        <p className="text-center text-xs text-muted-foreground md:text-right">
          Pathfinder Restaurant · Opp. Al-Hikmah University, Adeta, Ilorin, Kwara State, Nigeria
          <br />
          <span className="text-primary/80">Powered by SAPHIX DESIGN AGENCY</span> · © {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}