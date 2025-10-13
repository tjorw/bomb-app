import React, { useEffect, useState, useMemo } from "react";
import { startConnection } from "../lib/signalrClient";

const statusText = (s) => (typeof s === "string" ? s : s === 0 ? "Odesarmerad" : s === 1 ? "Desarmerad" : s === 2 ? "Exploderad" : String(s));

export default function Home() {
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [show, setShow] = useState(false);

  const [state, setState] = useState({
    status: "Odesarmerad",
    remainingSeconds: 0,
    paused: false,
    failedAttempts: 0,
    maxAttempts: 2
  });

  const status = useMemo(() => statusText(state.status), [state.status]);


  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/state");
        const json = await res.json();
        if (!mounted) return;
        setState(json);
        await startConnection((dto) => mounted && setState(dto));
      } catch (e) {
        console.error(e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Keypad actions
  const onKeyPress = (k) => {
    if (status !== "Odesarmerad") return;
    if (k === "C") setCode("");
    else if (k === "⌫") setCode((c) => c.slice(0, -1));
    else if (k === "✓") submit();
    else if (/^\d$/.test(k)) setCode((c) => (c + k).slice(0, 16)); // max 16 tecken
  };

  async function submit() {
    if (!code) return;
    setMsg("Skickar...");
    try {
      const res = await fetch("/api/submit-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code })
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsg(json?.reason || "Koden accepterad.");
        setCode("");
      } else {
        setMsg(json?.reason || "Fel kod.");
        setCode("");
      }
    } catch (err) {
      setMsg("Fel: " + err.message);
    }
  }

  return (
    <div className="wrap">
      <style>{css}</style>

      <div className={["panel", status === "Exploderad" ? "explode" : "", status === "Desarmerad" ? "defused" : ""].join(" ")}>
        {/* Code window */}
        <div className="display">
          <div className="glowEdge" />
          <div className="codeRow" aria-label="Inmatad kod">
            {code.length ? (
              show ? <span className="codeShown">{code}</span> : <span className="codeDots">{"•".repeat(code.length)}</span>
            ) : (
              <span className="placeholder">Mata in kod …</span>
            )}
          </div>
          <button className="eye" aria-label={show ? "Dölj kod" : "Visa kod"} onClick={() => setShow(!show)}>
            {show ? "🙈" : "👁️"}
          </button>
        </div>

        {/* Keypad */}
        <div className="pad">
          {["1","2","3","4","5","6","7","8","9","C","0","⌫"].map((k) => (
            <button
              key={k}
              className={"key " + (k === "C" ? "key-alt" : k === "⌫" ? "key-warn" : "")}
              onClick={() => onKeyPress(k)}
              disabled={status !== "Odesarmerad"}
            >
              {k}
            </button>
          ))}
        </div>

        {/* Submit */}
        <button
          className="submit"
          onClick={() => onKeyPress("✓")}
          disabled={!code || status !== "Odesarmerad"}
          title="Skicka kod"
        >
          ✓ Skicka kod
        </button>

      </div>

    </div>
  );
}

/* ====== CSS: Futuristiskt UI för kodfönster & knappsats ====== */
const css = `
:root {
  --bg: #0b1020;
  --panel: #0e1530;
  --panel-2: #121b3a;
  --accent: #6ee7ff;
  --accent-2: #3ec7f3;
  --warn: #f59e0b;
  --err: #ef4444;
  --ok: #22c55e;
  --text: #f3f4f6;
  --muted: #94a3b8;
  --ring: rgba(110, 231, 255, 0.3);
}

* { box-sizing: border-box; }
body { background: var(--bg); color: var(--text); font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue"; }

.wrap { max-width: 520px; margin: 24px auto; padding: 16px; }
.title { margin: 0 0 12px; font-weight: 700; letter-spacing: 0.4px; }

.statusRow { display: grid; gap: 6px; grid-template-columns: 1fr; margin-bottom: 12px; color: var(--muted); }
@media(min-width: 520px){ .statusRow { grid-template-columns: 1fr 1fr 1fr; } }

.panel {
  background: radial-gradient(120% 120% at 0% 0%, rgba(62,199,243,.08) 0%, transparent 60%),
              linear-gradient(180deg, var(--panel), var(--panel-2));
  border: 1px solid rgba(62,199,243,.2);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 12px 40px rgba(0,0,0,.35), 0 0 0 6px rgba(62,199,243,.05) inset;
  position: relative;
  overflow: hidden;
}

.panel.defused { border-color: rgba(34,197,94,.35); box-shadow: 0 0 0 6px rgba(34,197,94,.08) inset; }
.panel.explode { border-color: rgba(239,68,68,.35); box-shadow: 0 0 0 6px rgba(239,68,68,.08) inset; }

.display {
  position: relative;
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(30,41,59,.6), rgba(2,6,23,.6));
  padding: 18px 48px 18px 18px;
  border: 1px solid rgba(148,163,184,.2);
  box-shadow: 0 0 0 1px rgba(110,231,255,.06) inset, 0 8px 30px rgba(0,0,0,.2) inset;
}

.glowEdge {
  position: absolute; inset: -1px; border-radius: 12px;
  pointer-events: none;
  background: radial-gradient(180px 60px at 15% 0%, rgba(110,231,255,.12), transparent 60%),
              radial-gradient(240px 80px at 75% 100%, rgba(62,199,243,.10), transparent 70%);
}

.codeRow { min-height: 28px; display: flex; align-items: center; letter-spacing: 3px; font-size: 22px; }
.codeDots { color: var(--accent); text-shadow: 0 0 6px rgba(110,231,255,.6); }
.codeShown { color: #e5e7eb; text-shadow: 0 0 6px rgba(255,255,255,.15); }
.placeholder { color: var(--muted); letter-spacing: 0; }

.eye {
  position: absolute; right: 8px; top: 8px;
  background: transparent; border: 1px solid rgba(148,163,184,.25);
  color: var(--muted); padding: 6px 8px; border-radius: 8px; cursor: pointer;
  transition: transform .06s ease, background .2s ease, color .2s ease;
}
.eye:hover { color: var(--text); background: rgba(148,163,184,.1); }
.eye:active { transform: scale(.96); }

.pad {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 10px; margin-top: 14px;
}
.key {
  height: 64px; border-radius: 12px; font-size: 22px; font-weight: 600;
  border: 1px solid rgba(62,199,243,.25);
  color: #dbeafe;
  background:
    radial-gradient(120% 120% at 50% -20%, rgba(110,231,255,.22), transparent 50%),
    linear-gradient(180deg, rgba(30,58,138,.4), rgba(2,6,23,.4));
  box-shadow: 0 2px 0 rgba(62,199,243,.25) inset, 0 10px 22px rgba(0,0,0,.35);
  cursor: pointer;
  transition: transform .06s ease, box-shadow .12s ease, filter .12s ease;
}
.key:hover { filter: brightness(1.08); }
.key:active { transform: translateY(1px) scale(.99); box-shadow: 0 1px 0 rgba(62,199,243,.3) inset, 0 8px 18px rgba(0,0,0,.35); }

.key-alt { border-color: rgba(245,158,11,.35); color: #fde68a; }
.key-warn { border-color: rgba(239,68,68,.4); color: #fecaca; }

.key:disabled { opacity: .5; cursor: not-allowed; filter: grayscale(.2); }

.submit {
  width: 100%; margin-top: 12px; height: 48px; border-radius: 12px;
  border: 1px solid rgba(34,197,94,.4);
  color: #dcfce7; font-weight: 700; letter-spacing: .3px;
  background:
    radial-gradient(140% 120% at 50% -20%, rgba(34,197,94,.25), transparent 50%),
    linear-gradient(180deg, rgba(21,128,61,.5), rgba(3,45,26,.6));
  box-shadow: 0 2px 0 rgba(34,197,94,.3) inset, 0 12px 24px rgba(0,0,0,.35);
  cursor: pointer; transition: transform .06s ease, filter .12s ease, box-shadow .12s;
}
.submit:hover { filter: brightness(1.06); }
.submit:active { transform: translateY(1px); }
.submit:disabled {
  opacity: .5; cursor: not-allowed; border-color: rgba(148,163,184,.3);
  background: linear-gradient(180deg, rgba(51,65,85,.35), rgba(2,6,23,.35));
  color: #cbd5e1;
}

.msg { margin-top: 10px; color: #e5e7eb; font-size: 14px; opacity: .95; }

.hint { margin-top: 14px; color: var(--muted); }
.hint a { color: var(--accent-2); text-decoration: none; }
.hint a:hover { text-decoration: underline; }

/* focus ring */
.key:focus, .submit:focus, .eye:focus {
  outline: none;
  box-shadow: 0 0 0 3px var(--ring);
}
`;
