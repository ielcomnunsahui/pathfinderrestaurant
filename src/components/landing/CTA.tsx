import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function CTA() {
  return (
    <section id="contact" className="relative py-28">
      <div className="mx-auto max-w-5xl px-6">
        <div className="relative overflow-hidden rounded-3xl border border-primary/20 p-12 text-center md:p-20">
          <div className="absolute inset-0 -z-10 bg-gradient-gold opacity-10" />
          <div className="absolute -top-32 left-1/2 -z-10 h-64 w-[120%] -translate-x-1/2 rounded-full bg-gradient-gold opacity-20 blur-3xl" />
          <p className="text-xs uppercase tracking-[0.3em] text-primary">Get started</p>
          <h2 className="mt-4 font-display text-4xl font-bold tracking-tight md:text-6xl">
            Operate with <span className="text-gradient-gold">precision</span>.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Sign in to your P.R.I.S.M workspace and take command of every plate served, every
            naira earned and every gram of stock moved.
          </p>
          <div className="mt-10 flex justify-center">
            <Link to="/login">
              <Button variant="hero" size="xl">
                Open P.R.I.S.M <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}