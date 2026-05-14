import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import dashboardPreview from "@/assets/dashboard-preview.jpg";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-36 pb-20">
      <div className="pointer-events-none absolute inset-0 -z-10" style={{ background: "var(--gradient-hero)" }} />
      <div className="mx-auto max-w-6xl px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-primary"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Performance Reporting & Inventory System Manager
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="mx-auto mt-8 max-w-4xl font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl"
        >
          Smarter Operations. <br />
          <span className="text-gradient-gold">Clearer Profits.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground md:text-lg"
        >
          P.R.I.S.M is the financial nerve-center for Pathfinder Restaurant — track sales,
          inventory, expenses and profit in real time, with the elegance of a fintech platform.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <Link to="/login">
            <Button variant="hero" size="xl" className="group">
              Enter dashboard
              <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
          <a href="#preview">
            <Button variant="glass" size="xl">See it in action</Button>
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          id="preview"
          className="relative mx-auto mt-20 max-w-5xl"
        >
          <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-gold opacity-25 blur-3xl" />
          <div className="overflow-hidden rounded-2xl border border-primary/20 shadow-elegant">
            <img
              src={dashboardPreview}
              alt="P.R.I.S.M dashboard preview"
              width={1920}
              height={1080}
              className="w-full"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}