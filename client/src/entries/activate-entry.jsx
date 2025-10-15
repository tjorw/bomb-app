import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { startConnection } from "../lib/signalrClient";

function ActivatePage() {
  const [state, setState] = useState({ codeEnabled: false, activationIndex: 0, activationTotal: 6, lastActivationMsg: "" });

  useEffect(() => {
    let mounted = true;
    (async () => {
      const r = await fetch("/api/activation/state"); const json = await r.json();
      if (!mounted) return;
      setState(json);
      await startConnection((dto) => mounted && setState(dto));
    })();
    return () => { mounted = false; };
  }, []);

  const order = ["red","blue","green","yellow","white","black"];
  const colorName = { red:"Röd", blue:"Blå", green:"Grön", yellow:"Gul", white:"Vit", black:"Svart" };

  return (
    <div style={{ padding: 20, maxWidth: 520 }}>
      <h2>Aktivera systemet (koppla sladdar i ordning)</h2>
      <p>Status: {state.codeEnabled ? "✅ Aktiverad" : `⛔ Inte aktiverad (${state.activationIndex}/${state.activationTotal})`}</p>
      <p style={{ minHeight: 24 }}>{state.lastActivationMsg}</p>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap: 8, marginTop: 12 }}>
        {order.map(c => (
          <a key={c} href={`/wire-${c}.html`} style={{
            display:"block", padding:"14px 10px", textAlign:"center",
            borderRadius:12, color:"#111", textDecoration:"none",
            background: c==="red"?"#fecaca":c==="blue"?"#bfdbfe":c==="green"?"#bbf7d0":c==="yellow"?"#fef9c3":c==="white"?"#e5e7eb":"#d1d5db",
            border:"1px solid rgba(0,0,0,.1)"
          }}>
            {colorName[c]}
          </a>
        ))}
      </div>
      <div style={{ marginTop: 16 }}>
        <a href="/index.html">Gå till kodsidan</a> (låst tills alla sladdar är kopplade rätt)
      </div>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<ActivatePage />);
