"use client";
import { useState } from "react";

/**
 * Live head-to-head: sends ONE question to all 13 models on the local inference server
 * and streams each answer in as it lands. Enabled only when NEXT_PUBLIC_INFERENCE_URL is set
 * (local testing); the public deployment renders the "not connected" note instead.
 */
type Model = { id: string; name: string; family: string; stage: string; site: string };
type Row = { status: "idle" | "running" | "done" | "error"; text: string; secs?: number; tokens?: number };

const ENDPOINT = process.env.NEXT_PUBLIC_INFERENCE_URL;

const SAMPLES = [
  "What does 'stare decisis' mean?",
  "What must a plaintiff prove to establish negligence?",
  "In contract law, what is the doctrine of consideration?",
  "What is the purpose of an SEC Form 10-K?",
];

export default function LiveArena({ models }: { models: Model[] }) {
  const [q, setQ] = useState("");
  const [ctx, setCtx] = useState("");
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [running, setRunning] = useState(false);
  const [doneCount, setDoneCount] = useState(0);

  const live = Boolean(ENDPOINT);

  async function runAll() {
    const question = q.trim();
    if (!question || running) return;
    setRunning(true);
    setDoneCount(0);
    setRows(Object.fromEntries(models.map((m) => [m.id, { status: "idle", text: "" } as Row])));

    let done = 0;
    // Sequential on purpose: the GPU holds at most 2 models at a time (LRU), so parallel
    // requests would just thrash weights in and out of VRAM.
    for (const m of models) {
      setRows((r) => ({ ...r, [m.id]: { status: "running", text: "" } }));
      try {
        const res = await fetch(`${ENDPOINT}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model_id: m.id,
            prompt: question,            // used by the base completers
            question,                    // used by qa / grounded
            context: ctx.trim() || undefined,
            max_new_tokens: 120,
          }),
        });
        if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 120)}`);
        const j = await res.json();
        setRows((r) => ({
          ...r,
          [m.id]: { status: "done", text: j.completion || "(empty)", secs: j.seconds, tokens: j.tokens },
        }));
      } catch (e) {
        setRows((r) => ({
          ...r,
          [m.id]: { status: "error", text: e instanceof Error ? e.message : String(e) },
        }));
      }
      done += 1;
      setDoneCount(done);
    }
    setRunning(false);
  }

  if (!live) {
    return (
      <div className="panel card">
        <span className="tag">Live arena</span>
        <h2>Ask your own question</h2>
        <p style={{ marginTop: 8 }}>
          The live head-to-head runs every model on a local GPU, so it is available when the site is
          run against a local inference server. The replay above uses the same models&apos; real
          answers from the frozen evaluation.
        </p>
      </div>
    );
  }

  return (
    <div className="panel card">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <span className="tag">Live arena</span>
        <span className="badge badge-accent">live · local GPU</span>
        {running && <span className="badge">{doneCount} / {models.length} done</span>}
      </div>
      <h2 style={{ marginTop: 0 }}>Ask your own question — all {models.length} models answer</h2>
      <p style={{ margin: "6px 0 14px" }}>
        The same prompt goes to every model in turn. Models run one at a time because the GPU only
        holds a couple at once, so a full sweep takes a minute or two — answers appear as they land.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        {SAMPLES.map((s) => (
          <button key={s} className="btn" style={{ fontSize: "0.82rem", padding: "6px 10px" }}
            onClick={() => setQ(s)} disabled={running}>
            {s.length > 52 ? s.slice(0, 50) + "…" : s}
          </button>
        ))}
      </div>

      <textarea className="field" rows={2} value={q} onChange={(e) => setQ(e.target.value)}
        placeholder="Your question" style={{ resize: "vertical" }} disabled={running} />
      <textarea className="field" rows={2} value={ctx} onChange={(e) => setCtx(e.target.value)}
        placeholder="Optional context passage (used by the QA and RAFT models)"
        style={{ resize: "vertical", marginTop: 8 }} disabled={running} />

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
        <button className="btn-primary" onClick={runAll} disabled={running || !q.trim()}>
          {running ? `Running… (${doneCount}/${models.length})` : `Ask all ${models.length} models`}
        </button>
        {Object.keys(rows).length > 0 && !running && (
          <button className="btn" onClick={() => { setRows({}); setDoneCount(0); }}>Clear</button>
        )}
      </div>

      {Object.keys(rows).length > 0 && (
        <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
          {models.map((m) => {
            const row = rows[m.id];
            if (!row) return null;
            const border =
              row.status === "running" ? "var(--accent)" :
              row.status === "error" ? "var(--accent-3)" : "var(--border-soft)";
            return (
              <div key={m.id} className="panel-inset" style={{ padding: "12px 14px", borderColor: border }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <a href={m.site} target="_blank" rel="noreferrer"
                     style={{ fontWeight: 600, color: "var(--fg)", textDecoration: "none" }}>{m.name}</a>
                  <span className="badge">{m.family}</span>
                  <span className="badge">{m.stage}</span>
                  <span style={{ marginLeft: "auto" }} className="badge">
                    {row.status === "running" ? "generating…"
                      : row.status === "done" ? `${row.tokens} tok · ${row.secs}s`
                      : row.status === "error" ? "failed" : "queued"}
                  </span>
                </div>
                <p className="mono" style={{
                  margin: "9px 0 0", fontSize: "0.85rem", lineHeight: 1.5, whiteSpace: "pre-wrap",
                  color: row.status === "error" ? "var(--accent-3)" : "var(--fg-muted)",
                  maxHeight: 160, overflow: "auto",
                }}>
                  {row.status === "idle" ? "—" : row.text || "…"}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
