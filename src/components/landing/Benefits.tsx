import { motion } from "framer-motion";
import { TrendingUp, Clock, Eye, Lock } from "lucide-react";

const stats = [
  { value: "100%", label: "Real-time sync across devices" },
  { value: "0", label: "Manual reconciliation by month-end" },
  { value: "24/7", label: "Always-on financial visibility" },
  { value: "3", label: "Role-based access tiers" },
];

const items = [
  { icon: TrendingUp, title: "Profit clarity", desc: "Net profit auto-calculated from revenue minus stock cost and expenses." },
  { icon: Clock, title: "Time recovered", desc: "Replace spreadsheets with one intuitive control surface." },
  { icon: Eye, title: "Full visibility", desc: "Every sale, every adjustment, every shift — fully traceable." },
  { icon: Lock, title: "Safe by design", desc: "Row-level security, secure auth and tamper-proof audit logs." },
];

export function Benefits() {
  return (
    <section id="benefits" className="relative py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="glass rounded-2xl p-6 text-center">
              <div className="font-display text-4xl font-bold text-gradient-gold">{s.value}</div>
              <div className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="mt-20 grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-primary">Why P.R.I.S.M</p>
            <h2 className="mt-4 font-display text-4xl font-bold tracking-tight md:text-5xl">
              Built for the rhythm of a <span className="text-gradient-gold">restaurant</span>.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Pathfinder Restaurant deserves more than spreadsheets. P.R.I.S.M turns daily
              operations into a clean, accountable system — from the till to the boardroom.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {items.map((it, i) => (
              <motion.div
                key={it.title}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="glass rounded-2xl p-5"
              >
                <it.icon className="h-5 w-5 text-primary" />
                <h3 className="mt-3 font-display text-lg font-semibold">{it.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{it.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}