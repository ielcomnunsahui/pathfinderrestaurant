import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PrismLogo } from "@/components/brand/PrismLogo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export function Navbar() {
  return (
    <header className="fixed top-0 z-50 w-full">
      <div className="mx-auto mt-4 flex max-w-6xl items-center justify-between rounded-2xl glass px-4 py-3 md:px-6">
        <Link to="/">
          <PrismLogo />
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#preview" className="hover:text-foreground transition-colors">Dashboard</a>
          <a href="#benefits" className="hover:text-foreground transition-colors">Benefits</a>
          <a href="#contact" className="hover:text-foreground transition-colors">Contact</a>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link to="/login">
            <Button variant="hero" size="sm">Sign in</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}