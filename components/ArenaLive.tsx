"use client";
import { useState } from "react";

/**
 * The arena: one question -> all 13 models generate LIVE on the local GPU -> every answer is
 * scored LIVE by a blind LLM judge.
 *
 * Two question sources share one box:
 *  - the frozen held-out set, which carries a gold answer, so grading is checkable;
 *  - anything the user types, where the judge grades from its own knowledge (labelled as such).
 */
type Model = { id: string; name: string; family: string; stage: string; site: string };
type Q = { id: string; q: string; gold: string; source: string; answerable: boolean };
type Row = {
  status: "queued" | "generating" | "answered" | "judging" | "done" | "error";
  text: string; secs?: number; tokens?: number;
  score?: number; grounded?: boolean; reason?: string; error?: string;
};

const ENDPOINT = process.env.NEXT_PUBLIC_INFERENCE_URL;
const SOURCE_LABEL: Record<string, string> = {
  "case-law": "US case law", sec: "SEC filings", "fineweb-edu": "Educational web",
};

function scoreColor(s: number) {
  return `hsl(${Math.round(s * 12)} 62% 42%)`;
}

function ScorePill({ s, pending }: { s?: number; pending?: boolean }) {
  if (pending || s === undefined) {
    return <span className="mono badge" style={{ minWidth: 54, textAlign: "center" }}>–</span>;
  }
  return (
    <span className="mono" style={{
      fontWeight: 700, fontSize: "0.9rem", color: "#fff", background: scoreColor(s),
      borderRadius: 7, padding: "3px 9px", minWidth: 54, textAlign: "center", display: "inline-block",
    }} title="Blind LLM-judge score, 0–10">{s.toFixed(1)}</span>
  );
}

export default function ArenaLive({ models, questions }: { models: Model[]; questions: Q[] }) {
  const [text, setText] = useState(questions[0]?.q ?? "");
  const [picked, setPicked] = useState<Q | null>(questions[0] ?? null);
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [phase, setPhase] = useState<"idle" | "generating" | "judging" | "done">("idle");
  const [done, setDone] = useState(0);
  const [err, setErr] = useState("");
  const [showGold, setShowGold] = useState(false);

  const live = Boolean(ENDPOINT);
  const isKnown = picked !== null && picked.q === text.trim();

  function choose(q: Q) {
    setPicked(q); setText(q.q); setRows({}); setPhase("idle"); setShowGold(false); setErr("");
  }
  function edit(v: string) {
    setText(v);
    setPicked(questions.find((q) => q.q === v.trim()) ?? null);
    setShowGold(false);
  }

  async function run() {
    const question = text.trim();
    if (!question || phase === "generating" || phase === "judging") return;
    setErr(""); setDone(0); setShowGold(false); setPhase("generating");
    setRows(Object.fromEntries(models.map((m) => [m.id, { status: "queued", text: "" } as Row])));

    const answers: Record<string, string> = {};
    const ctx = isKnown ? undefined : undefined;   // held-out questions are asked closed-book here

    // Sequential: the GPU serialises generation anyway, and this streams results in.
    for (const m of models) {
      setRows((r) => ({ ...r, [m.id]: { ...r[m.id], status: "generating" } }));
      try {
        const res = await fetch(`${ENDPOINT}/generate`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model_id: m.id, prompt: question, question, context: ctx, max_new_tokens: 120 }),
        });
        if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 120)}`);
        const j = await res.json();
        const a = (j.completion || "").trim();
        answers[m.id] = a;
        setRows((r) => ({ ...r, [m.id]: { status: "answered", text: a || "(empty)", secs: j.seconds, tokens: j.tokens } }));
      } catch (e) {
        setRows((r) => ({ ...r, [m.id]: { status: "error", text: "", error: e instanceof Error ? e.message : String(e) } }));
      }
      setDone((d) => d + 1);
    }

    // Judge every answer that came back.
    setPhase("judging");
    setRows((r) => Object.fromEntries(Object.entries(r).map(
      ([k, v]) => [k, v.status === "answered" ? { ...v, status: "judging" } : v])));
    try {
      const jr = await fetch(`${ENDPOINT}/judge`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, context: ctx, reference: picked?.gold, answers }),
      });
      if (!jr.ok) throw new Error(`${jr.status} ${(await jr.text()).slice(0, 160)}`);
      const g = await jr.json();
      setRows((r) => {
        const next = { ...r };
        for (const [mid, v] of Object.entries(g.graded as Record<string, any>)) {
          next[mid] = v.error
            ? { ...next[mid], status: "done", error: v.error }
            : { ...next[mid], status: "done", score: v.score, grounded: v.grounded, reason: v.reason };
        }
        return next;
      });
    } catch (e) {
      setErr(`Judging failed: ${e instanceof Error ? e.message : String(e)}`);
      setRows((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, { ...v, status: "done" as const }])));
    }
    setPhase("done");
  }

  const busy = phase === "generating" || phase === "judging";
  const ranked = models.slice().sort((a, b) => (rows[b.id]?.score ?? -1) - (rows[a.id]?.score ?? -1));
  const ordered = phase === "done" ? ranked : models;

  return (
    <div className="panel card">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <span className="tag">Arena</span>
        <span className={live ? "badge badge-accent" : "badge"}>
          {live ? "live · local GPU + LLM judge" : "not connected"}
        </span>
        {busy && <span className="badge">
          {phase === "generating" ? `generating ${done}/${models.length}` : "judging…"}
        </span>}
      </div>

      <h2 style={{ marginTop: 0 }}>One question, {models.length} models, judged live</h2>
      <p style={{ margin: "6px 0 14px" }}>
        Pick a held-out question or write your own, and every model answers it in turn on the local
        GPU. A blind LLM judge then scores each answer 0–10. Held-out questions carry a gold answer,
        so the judge grades against a known-good reference; for your own questions it grades from
        its own knowledge.
      </p>

      {/* held-out question chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        {questions.slice(0, 6).map((q) => (
          <button key={q.id} className="btn" disabled={busy}
            style={{ fontSize: "0.8rem", padding: "6px 10px", textAlign: "left",
                     borderColor: picked?.id === q.id ? "var(--accent)" : "var(--border)" }}
            onClick={() => choose(q)}>
            {q.q.length > 52 ? q.q.slice(0, 50) + "…" : q.q}
          </button>
        ))}
      </div>

      <select className="field" style={{ marginBottom: 8 }} disabled={busy}
        value={picked?.id ?? ""}
        onChange={(e) => { const q = questions.find((x) => x.id === e.target.value); if (q) choose(q); }}>
        <option value="">— or pick from all {questions.length} held-out questions —</option>
        {questions.map((q, i) => (
          <option key={q.id} value={q.id}>{i + 1}. {q.q.length > 70 ? q.q.slice(0, 68) + "…" : q.q}</option>
        ))}
      </select>

      <textarea className="field" rows={3} value={text} onChange={(e) => edit(e.target.value)}
        placeholder="Ask anything — or pick a held-out question above" disabled={busy}
        style={{ resize: "vertical" }}
        onKeyDown={(e) => { if (!busy && e.key === "Enter" && (e.metaKey || e.ctrlKey)) run(); }} />

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
        <button className="btn-primary" onClick={run} disabled={!live || busy || !text.trim()}>
          {phase === "generating" ? `Generating ${done}/${models.length}…`
            : phase === "judging" ? "Judging…"
            : `Ask all ${models.length} & judge`}
        </button>
        <span className="badge">
          {isKnown ? "held-out question · graded against the gold answer"
                   : "your question · graded without a reference"}
        </span>
        {isKnown && picked && (
          <button className="btn" style={{ fontSize: "0.8rem", padding: "5px 10px" }}
            onClick={() => setShowGold((s) => !s)} disabled={busy}>
            {showGold ? "hide answer key" : "show answer key"}
          </button>
        )}
      </div>

      {isKnown && picked && showGold && (
        <div className="panel-inset" style={{ padding: "12px 14px", marginTop: 12 }}>
          <span className="tag" style={{ color: "var(--accent-2)" }}>
            Answer key · {SOURCE_LABEL[picked.source] ?? picked.source}
          </span>
          <p style={{ margin: "6px 0 0", lineHeight: 1.55 }}>{picked.gold}</p>
        </div>
      )}

      {err && <p style={{ color: "var(--accent)", marginTop: 12, fontSize: "0.88rem" }}>{err}</p>}
      {!live && (
        <p style={{ marginTop: 12, fontSize: "0.88rem", color: "var(--fg-dim)" }}>
          Live generation runs the models on a local GPU, so it is available when this site is run
          against a local inference server.
        </p>
      )}

      {Object.keys(rows).length > 0 && (
        <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
          {ordered.map((m) => {
            const row = rows[m.id];
            if (!row) return null;
            const border = row.status === "generating" ? "var(--accent)"
              : row.status === "error" ? "var(--accent-3)" : "var(--border-soft)";
            return (
              <div key={m.id} className="panel-inset" style={{ padding: "12px 14px", borderColor: border }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <ScorePill s={row.score} pending={row.status !== "done"} />
                  <a href={m.site} target="_blank" rel="noreferrer"
                     style={{ fontWeight: 600, color: "var(--fg)", textDecoration: "none" }}>{m.name}</a>
                  <span className="badge">{m.family}</span>
                  <span className="badge">{m.stage}</span>
                  {row.grounded && <span className="badge badge-accent">grounded</span>}
                  <span style={{ marginLeft: "auto" }} className="badge">
                    {row.status === "queued" ? "queued"
                      : row.status === "generating" ? "generating…"
                      : row.status === "judging" ? "judging…"
                      : row.status === "error" ? "failed"
                      : `${row.tokens} tok · ${row.secs}s`}
                  </span>
                </div>
                <p className="mono" style={{
                  margin: "9px 0 0", fontSize: "0.85rem", lineHeight: 1.5, whiteSpace: "pre-wrap",
                  color: row.error ? "var(--accent-3)" : "var(--fg-muted)",
                  maxHeight: 170, overflow: "auto",
                }}>
                  {row.error ? row.error : row.status === "queued" ? "—" : row.text || "…"}
                </p>
                {row.reason && (
                  <p style={{ margin: "8px 0 0", fontSize: "0.8rem", color: "var(--fg-dim)", fontStyle: "italic" }}>
                    judge: {row.reason}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
