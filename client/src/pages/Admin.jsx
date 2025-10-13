import React, { useEffect, useState } from "react";

export default function Admin() {
  const [state, setState] = useState({ status: "Odesarmerad", remainingSeconds: 0, paused: false, failedAttempts: 0, maxAttempts: 2 });
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [secondsInput, setSecondsInput] = useState("");

  async function refresh() {
    setLoading(true);
    const res = await fetch("/api/state");
    const json = await res.json();
    setState(json);
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  async function call(path, body) {
    setMsg("Kör...");
    const res = await fetch(path, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
    if (res.ok) {
      setMsg("OK");
      await refresh();
    } else {
      const json = await res.json().catch(() => ({}));
      setMsg(json?.reason || "Misslyckades");
    }
  }

  return (
    <div style={{ padding: 20, display: "grid", gap: 12, maxWidth: 480 }}>
      <h2>Kontrollpanel</h2>
      {loading ? <p>Laddar...</p> : (
        <>
          <div>
            <div><strong>Status:</strong> {state.status}</div>
            <div><strong>Återstående tid:</strong> {state.remainingSeconds} s {state.paused ? "(pausad)" : ""}</div>
            <div><strong>Felaktiga försök:</strong> {state.failedAttempts}/{state.maxAttempts}</div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => call("/api/admin/pause")}>Stoppa (Pausa)</button>
            <button onClick={() => call("/api/admin/resume")}>Starta (Resume)</button>
            <button onClick={() => call("/api/admin/reset")}>Återställ</button>
          </div>
          
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", borderTop: "1px solid #ddd", paddingTop: 12 }}>
            <button onClick={() => call("/api/admin/registerfail")}>Fail +</button>
            <button onClick={() => call("/api/admin/undoFail")}>Fail -</button>
          </div>

          <div style={{ borderTop: "1px solid #ddd", paddingTop: 12 }}>
            <label style={{ display: "block", marginBottom: 6 }}>
              Sätt tid (sekunder):
              <input
                type="number"
                min="0"
                value={secondsInput}
                onChange={(e) => setSecondsInput(e.target.value)}
                placeholder="ex. 90"
                style={{ marginLeft: 8, width: 120 }}
              />
            </label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                onClick={() => call("/api/admin/set-time", { seconds: parseInt(secondsInput || "0", 10), autostart: false })}
              >
                Sätt tid & PAUSA
              </button>
              <button
                onClick={() => call("/api/admin/set-time", { seconds: parseInt(secondsInput || "0", 10), autostart: true })}
              >
                Sätt tid & STARTA
              </button>
            </div>
          </div>

          <p>{msg}</p>
        </>
      )}
    </div>
  );
}
