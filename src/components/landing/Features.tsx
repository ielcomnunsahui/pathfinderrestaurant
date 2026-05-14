import { motion } from "framer-motion";
import {
  BarChart3, Boxes, Receipt, Target, ShieldCheck, Zap, FileBarChart, Bell,
} from "lucide-react";

const features = [
  { icon: BarChart3, title: "Realtime analytics", desc: "Daily, weekly, monthly and yearly revenue with live profit/loss." },
  { icon: Boxes, title: "Inventory intelligence", desc: "Auto stock deduction, low-stock alerts and full movement history." },
  { icon: Receipt, title: "POS-style sales", desc: "Lightning-fast entries, printable receipts and payment tracking." },
  { icon: FileBarChart, title: "Expense control", desc: "Categorize, attach receipts and watch trends evolve." },
  { icon: Target, title: "Goals & targets", desc: "Set revenue goals and visualize progress as it happens." },
  { icon: ShieldCheck, title: "Roles & audit logs", desc: "Admin, Manager, Staff — every action accountable." },
  { icon: Zap, title: "Live sync", desc: "Multi-user realtime updates across every device." },
  { icon: Bell, title: "Smart alerts", desc: "Stock, goals and daily summaries surfaced when it matters." },
];

export function Features() {
  return (
    <section id="features" className="relative py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.3em] text-primary">Capabilities</p>
          <h2 className="mt-4 font-display text-4xl font-bold tracking-tight md:text-5xl">
            Everything Pathfinder needs, <span className="text-gradient-gold">unified.</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            One system for sales, stock, cash flow and accountability — designed for the
            speed of a busy kitchen and the rigor of modern finance.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="group glass rounded-2xl p-6 transition-all hover:-translate-y-1 hover:border-primary/40"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}