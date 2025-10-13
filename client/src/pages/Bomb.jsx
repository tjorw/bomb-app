import React, { useEffect, useMemo, useRef, useState } from "react";
import { startConnection } from "../lib/signalrClient";

// Mapper om servern skulle skicka enum som number
const statusText = (s) =>
  typeof s === "string"
    ? s
    : s === 0
    ? "Odesarmerad"
    : s === 1
    ? "Desarmerad"
    : s === 2
    ? "Exploderad"
    : String(s);

// Format hh:mm:ss (tolkar "dd" i din beskrivning som sekunder)
const fmt = (total) => {
  const t = Math.max(0, Number(total) | 0);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

export default function Bomb() {
  const [state, setState] = useState({
    status: "Odesarmerad",
    remainingSeconds: 0,
    paused: false,
    failedAttempts: 0,
    maxAttempts: 2
  });
  const [connected, setConnected] = useState(false);

  // För att trigga blink när failedAttempts ökar
  const prevAttempts = useRef(0);
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/state");
        const json = await res.json();
        if (!mounted) return;
        setState(json);

        await startConnection((dto) => {
          if (!mounted) return;
          setState(dto);
        });
        setConnected(true);
      } catch (err) {
        console.error(err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const status = statusText(state.status);
  const timeStr = useMemo(() => fmt(state.remainingSeconds), [state.remainingSeconds]);

  // Blink vid fel kod (ökat failedAttempts)
  useEffect(() => {
    if (state.failedAttempts > prevAttempts.current) {
      // Trigga blink kort
      setBlink(true);
      const id = setTimeout(() => setBlink(false), 300);
    }
    prevAttempts.current = state.failedAttempts;
  }, [state.failedAttempts]);

  const isExploded = status === "Exploderad";
  const isDefused = status === "Desarmerad";
  const isActive = status === "Odesarmerad";
    const attemptsLeft = Math.max(0, (state.maxAttempts ?? 2) - (state.failedAttempts ?? 0));

  return (
    <div className="wrap">
      <style>{css}</style>


      <div className={["panel", isExploded ? "panel-danger" : isDefused ? "panel-ok" : ""].join(" ")}>
        {/* Neon-ram */}
        <div className="glow" />

        {/* Display */}
        <div
          className={[
            "display",
            blink ? "blink" : "",
            isExploded ? "display-danger" : isDefused ? "display-ok" : ""
          ].join(" ")}
          aria-live="polite"
          aria-atomic="true"
        >
          {isExploded ? (
            <span className="final final-danger">EXPLODERAT</span>
          ) : isDefused ? (
            <span className="final final-ok">DESARMERAD</span>
          ) : (
            <span className={["timer", state.paused ? "paused" : ""].join(" ")}>
              {timeStr}
            </span>
          )}
        </div>

      <div className="statusRow">
        <span><strong>Försök:</strong> {state.failedAttempts}/{state.maxAttempts} ({attemptsLeft} kvar)</span>
      </div>

      </div>
    </div>
  );
}

/* ====== Futuristisk timer-stil ====== */
const css = `
:root{
  --bg: #070b1a;
  --panel: #0b1020;
  --panel-2: #0e1630;
  --neon: #67e8f9;        /* cyan */
  --neon-2: #22d3ee;      /* cyan alt */
  --ok: #22c55e;          /* green */
  --warn: #f59e0b;        /* amber */
  --danger: #ef4444;      /* red */
  --text: #e5e7eb;
  --muted: #9aa4b2;
  --ring: rgba(103,232,249,.28);
}

*{ box-sizing: border-box; }
body{ background: var(--bg); color: var(--text); font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue"; }

.wrap{ max-width: 820px; margin: 28px auto; padding: 16px; }

.hdr{
  display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:12px;
}
.chips{ display:flex; gap:8px; flex-wrap:wrap; }
.chip{
  font-size: 12px; padding: 6px 10px; border-radius: 999px;
  color: var(--text);
  border: 1px solid rgba(103,232,249,.25);
  background: linear-gradient(180deg, rgba(14,22,48,.9), rgba(7,11,26,.9));
  box-shadow: inset 0 0 0 1px rgba(103,232,249,.06), 0 4px 14px rgba(0,0,0,.35);
}

.panel{
  position: relative; overflow: hidden; border-radius: 20px;
  background: linear-gradient(180deg, var(--panel), var(--panel-2));
  border: 1px solid rgba(103,232,249,.22);
  box-shadow: 0 16px 40px rgba(0,0,0,.45), inset 0 0 0 1px rgba(255,255,255,.04);
  padding: 24px;
}
.panel-ok{ border-color: rgba(34,197,94,.35); }
.panel-danger{ border-color: rgba(239,68,68,.4); }

.glow{
  position:absolute; inset:-1px; pointer-events:none; border-radius:20px;
  background:
    radial-gradient(300px 120px at 20% 0%, rgba(103,232,249,.12), transparent 60%),
    radial-gradient(380px 160px at 80% 100%, rgba(34,211,238,.10), transparent 70%);
}

.display{
  display:flex; align-items:center; justify-content:center;
  height: 210px; border-radius: 16px;
  background: linear-gradient(180deg, rgba(2,6,23,.45), rgba(2,6,23,.75));
  border: 1px solid rgba(103,232,249,.18);
  box-shadow: inset 0 0 0 1px rgba(103,232,249,.05), inset 0 -40px 80px rgba(0,0,0,.3);
  position:relative;
}
.display-ok{ border-color: rgba(34,197,94,.35); }
.display-danger{ border-color: rgba(239,68,68,.35); }

.timer{
  font-family: "Courier New", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-weight: 800;
  font-size: clamp(48px, 12vw, 140px);
  letter-spacing: 0.06em;
  color: #cffafe;
  text-shadow:
    0 0 12px rgba(103,232,249,.5),
    0 0 24px rgba(34,211,238,.35),
    0 2px 0 rgba(0,0,0,.8);
}
.timer.paused{
  color:#94a3b8;
  text-shadow: 0 0 10px rgba(148,163,184,.2);
  opacity:.9;
  filter: saturate(.6);
}

/* Blink vid fel kod */
.blink{
  animation: blink .5s ease;
}
@keyframes blink{
  0%{ background: var(--bg) }
  50%{ background: var(--danger) }
  100%{ background: var(--bg) }
}

/* Finaltext när exploderad/desarmerad */
.final{
  font-weight: 900;
  letter-spacing: .18em;
  font-size: clamp(28px, 6.5vw, 72px);
  text-transform: uppercase;
  color: #e5e7eb;
  text-shadow: 0 0 10px rgba(255,255,255,.1);
}
.final-ok{ color:#bbf7d0; text-shadow: 0 0 16px rgba(34,197,94,.35); }
.final-danger{ color:#fecaca; text-shadow: 0 0 16px rgba(239,68,68,.35); }

.meta{
  margin-top: 12px;
  color: var(--muted);
  font-size: 14px;
}
`;
