import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

interface BIPEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }>; }

export function InstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [hidden, setHidden] = useState(() => typeof window !== "undefined" && localStorage.getItem("prism-install-dismissed") === "1");

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setEvt(e as BIPEvent); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!evt || hidden) return null;
  // Don't show inside iframe (Lovable preview)
  try { if (window.self !== window.top) return null; } catch { return null; }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-2xl border bg-card p-4 shadow-elegant">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-primary/10 p-2"><Download className="h-4 w-4 text-primary"/></div>
        <div className="flex-1">
          <p className="font-semibold">Install P.R.I.S.M</p>
          <p className="mt-1 text-xs text-muted-foreground">Add to your home screen for faster access.</p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="hero" onClick={async () => { await evt.prompt(); await evt.userChoice; setEvt(null); }}>Install</Button>
            <Button size="sm" variant="ghost" onClick={() => { localStorage.setItem("prism-install-dismissed", "1"); setHidden(true); }}>Not now</Button>
          </div>
        </div>
        <button onClick={() => { localStorage.setItem("prism-install-dismissed", "1"); setHidden(true); }} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4"/></button>
      </div>
    </div>
  );
}
