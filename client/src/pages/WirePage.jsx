import React, { useEffect, useState, useMemo } from "react";
import { startConnection } from "../lib/signalrClient";

/**
 * Futuristisk WirePage
 * - Helskärmslayout, centrerad knapp
 * - Neon-/glöd-stil per färg
 * - Pulser när inte aktiverad, “vinst”-glöd när aktiverad
 * - Visar progress (x/6) och senaste feedback
 * - Knapp tryck = POST /api/activation/press
 */
export default function WirePage({ color, label }) {
  const [state, setState] = useState({
    codeEnabled: false,
    activationIndex: 0,
    activationTotal: 6,
    lastActivationMsg: ""
  });
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  // Färgschema (justeras per sladd)
  const theme = useMemo(() => {
    const map = {
      red:   { main: "#ef4444", glow: "#fecaca" },
      blue:  { main: "#3b82f6", glow: "#bfdbfe" },
      green: { main: "#22c55e", glow: "#bbf7d0" },
      yellow:{ main: "#f59e0b", glow: "#fde68a" },
      white: { main: "#e5e7eb", glow: "#ffffff" },
      black: { main: "#94a3b8", glow: "#cbd5e1" }, // “techno grey” så glöden syns
    };
    return map[color] || map.red;
  }, [color]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const r = await fetch("/api/activation/state");
      const json = await r.json();
      if (!mounted) return;
      setState(json);
      await startConnection((dto) => mounted && setState(dto));
    })();
    return () => { mounted = false; };
  }, []);

  async function press() {
    if (busy) return;
    setBusy(true);
    setToast("");
    try {
      const res = await fetch("/api/activation/press", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ color })
      });
      const json = await res.json().catch(() => ({}));
      setToast(json?.msg || (res.ok ? "OK" : "Fel"));
    } catch (e) {
      setToast("Nätverksfel");
    } finally {
      setBusy(false);
      // auto-hide toast
      setTimeout(() => setToast(""), 2000);
    }
  }

  const progressText = `${Math.min(state.activationIndex, state.activationTotal)}/${state.activationTotal}`;
  const done = state.codeEnabled;

  return (
    <div className="wire-wrap" style={{
      // CSS-variabler för temat
      ["--wire-main"]: theme.main,
      ["--wire-glow"]: theme.glow
    }}>
      <style>{css}</style>

      <main className="center">


          <button
            className={["wire-btn", busy ? "busy" : "", done ? "done" : "pulse"].join(" ")}
            onClick={press}
            disabled={busy || done}
            aria-busy={busy ? "true" : "false"}
            aria-label={`Koppla ${label}`}
            title={done ? "Redan aktiverad" : `Koppla ${label}`}
          >
            <span className="btn-ring" />
            <span className="btn-core">{label.toUpperCase()}</span>
          </button>


      </main>
    </div>
  );
}

const css = `
:root{
  --bg:#070b1a;
  --panel:#0b1020;
  --panel-2:#0e1530;
  --text:#e5e7eb;
  --muted:#94a3b8;
}

/* Layout */
.wire-wrap{ min-height:100dvh; position:relative; color:var(--text); font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue"; background: var(--bg); overflow:hidden; }
.topbar{ position:fixed; inset:0 0 auto 0; display:flex; align-items:center; gap:12px; padding:10px 14px; z-index:5; }
.link{ color:#bae6fd; text-decoration:none; opacity:.9; }
.link:hover{ text-decoration:underline; opacity:1; }
.spacer{ flex:1; }
.nav{ display:flex; gap:12px; }
.center{ min-height:100dvh; display:grid; place-items:center; padding:72px 16px 24px; }

/* Bakgrund: techno-grid + glow */
.field{ position:absolute; inset:0; z-index:0; }
.grid{
  position:absolute; inset:-20% -20% -20% -20%;
  background-image:
    linear-gradient(rgba(100,116,139,.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(100,116,139,.08) 1px, transparent 1px);
  background-size: 40px 40px, 40px 40px;
  transform: perspective(500px) rotateX(60deg) translateY(-22%);
  filter: blur(.2px);
  opacity:.45;
}


/* Panel */
.panel{
  position:relative; z-index:2; width:min(680px, 92vw);
  background: linear-gradient(180deg, var(--panel), var(--panel-2));
  border:1px solid rgba(148,163,184,.22);
  box-shadow: 0 16px 46px rgba(0,0,0,.45), inset 0 0 0 1px rgba(255,255,255,.04);
  border-radius: 20px;
  padding: 28px 20px 24px;
}
.panel-done{ border-color: color-mix(in oklab, var(--wire-main) 70%, #fff 0%); }

/* Rubriker & text */
.title{ margin:8px 0 2px; font-size: clamp(24px, 4.4vw, 40px); letter-spacing:.3px; }
.subtitle{ margin:0 0 18px; color:var(--muted); min-height:24px; }

/* Badge */
.badge{
  display:inline-block; padding:6px 10px; border-radius:999px; font-size:12px;
  border:1px solid rgba(148,163,184,.28);
  background: linear-gradient(180deg, rgba(14,22,48,.9), rgba(7,11,26,.9));
  box-shadow: inset 0 0 0 1px rgba(103,232,249,.06), 0 4px 14px rgba(0,0,0,.35);
}

/* Stor neonknapp (centrerad) */
.wire-btn{
  position:relative;
  display:grid; place-items:center;
  width:min(480px, 90vw); height:min(480px, 90vw);
  margin: 10px auto 16px;
  border-radius: 999px;
  border: 1px solid color-mix(in oklab, var(--wire-main) 60%, black 40%);
  background:
    radial-gradient(120% 120% at 50% 0%, color-mix(in oklab, var(--wire-glow) 22%, transparent), transparent 60%),
    linear-gradient(180deg, rgba(2,6,23,.3), rgba(2,6,23,.7));
  box-shadow:
    0 0 0 4px color-mix(in oklab, var(--wire-main) 20%, transparent) inset,
    0 22px 60px rgba(0,0,0,.6);
  color:#f8fafc;
  cursor:pointer;
  transition: transform .08s ease, filter .14s ease, box-shadow .14s ease, opacity .2s ease;
  isolation:isolate;
}
.wire-btn .btn-ring{
  position:absolute; inset:-12px;
  border-radius:inherit;
  filter: blur(14px);
  background:
    radial-gradient(80% 80% at 50% 50%, color-mix(in oklab, var(--wire-main) 40%, transparent), transparent 60%),
    radial-gradient(100% 100% at 50% 70%, color-mix(in oklab, var(--wire-glow) 34%, transparent), transparent 70%);
  opacity:.75; z-index:-1;
}
.wire-btn .btn-core{
  font-weight:900; letter-spacing:.12em;
  font-size: clamp(18px, 3.8vw, 28px);
  text-align:center;
  text-shadow: 0 0 16px color-mix(in oklab, var(--wire-glow) 45%, transparent), 0 2px 0 rgba(0,0,0,.6);
}

/* Interaktioner */
.wire-btn:hover{ filter: brightness(1.06) saturate(1.02); }
.wire-btn:active{ transform: translateY(1px) scale(.995); }
.wire-btn:disabled{ cursor:not-allowed; opacity:.7; filter:saturate(.8) grayscale(.1); }

.pulse{ animation: pulse 1.6s ease-in-out infinite; }
@keyframes pulse {
  0%,100% { box-shadow: 0 0 0 4px color-mix(in oklab, var(--wire-main) 16%, transparent) inset, 0 22px 60px rgba(0,0,0,.6); }
  50%     { box-shadow: 0 0 0 6px color-mix(in oklab, var(--wire-main) 24%, transparent) inset, 0 26px 68px rgba(0,0,0,.66); }
}
.done{ animation: doneGlow 1.2s ease-in-out 1 both; }
@keyframes doneGlow {
  0%   { filter: brightness(1); }
  30%  { filter: brightness(1.25); }
  100% { filter: brightness(1.05); }
}
.busy{ animation: busy 0.8s linear infinite; }
@keyframes busy { 0%{ transform: scale(1); } 50%{ transform: scale(1.01); } 100%{ transform: scale(1); } }

/* Progressrad */
.row{ display:flex; align-items:center; gap:10px; margin: 4px auto 0; width:min(520px, 92%); }
.meter{
  flex:1; height:10px; border-radius:999px; overflow:hidden;
  background: rgba(148,163,184,.18);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.06);
}
.bar{
  height:100%; background: linear-gradient(90deg, color-mix(in oklab, var(--wire-main) 70%, #0ea5e9 0%), var(--wire-glow));
  box-shadow: 0 0 16px color-mix(in oklab, var(--wire-main) 40%, transparent);
  transition: width .25s ease;
}
.meter-text{ min-width:54px; text-align:right; color:var(--muted); font-variant-numeric: tabular-nums; }

/* Toast */
.toast{
  margin: 14px auto 0; width: fit-content; padding: 8px 12px;
  background: rgba(2,6,23,.55);
  border: 1px solid rgba(148,163,184,.26);
  border-radius: 10px;
  box-shadow: 0 10px 26px rgba(0,0,0,.4);
}
`;
