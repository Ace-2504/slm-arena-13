"use client";
import { useMemo, useState } from "react";
import ThemePicker from "@/components/ThemePicker";
import DATA from "@/lib/arena-data.json";

type Ans = { r: string; s: number; g: boolean };
type Q = { id: string; q: string; gold: string; source: string; answerable: boolean; answers: Record<string, Ans> };
type Model = { id: string; name: string; family: string; stage: string; site: string };
type LB = Model & { score: number; grounded: number };

const MODELS = DATA.models as Model[];
const QS = DATA.questions as Q[];
const BOARD = DATA.leaderboard as LB[];
const MODEL_BY_ID: Record<string, Model> = Object.fromEntries(MODELS.map((m) => [m.id, m]));

const SOURCE_LABEL: Record<string, string> = {
  "case-law": "US case law",
  sec: "SEC filings",
  "fineweb-edu": "Educational web",
};
const FAMILIES = ["125M", "500M", "Gemma 2B"];

function scoreColor(s: number) {
  // 0 -> red, 10 -> green
  return `hsl(${Math.round(s * 12)} 62% 42%)`;
}

function ScorePill({ s }: { s: number }) {
  return (
    <span
      className="mono"
      style={{
        fontWeight: 700,
        fontSize: "0.9rem",
        color: "#fff",
        background: scoreColor(s),
        borderRadius: 7,
        padding: "3px 9px",
        minWidth: 54,
        textAlign: "center",
        display: "inline-block",
      }}
      title="Blind LLM-judge score, 0–10"
    >
      {s.toFixed(1)}
    </span>
  );
}

export default function ArenaApp() {
  const [qi, setQi] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const q = QS[qi];

  function go(delta: number) {
    setRevealed(false);
    setQi((i) => (i + delta + QS.length) % QS.length);
  }
  function random() {
    setRevealed(false);
    setQi(Math.floor(Math.random() * QS.length));
  }

  // per-question ranking of the 13 models by score (desc), stable by leaderboard order on ties
  const ranked = useMemo(() => {
    const order = Object.fromEntries(BOARD.map((m, i) => [m.id, i]));
    return MODELS.slice().sort((a, b) => {
      const d = q.answers[b.id].s - q.answers[a.id].s;
      return d !== 0 ? d : (order[a.id] ?? 0) - (order[b.id] ?? 0);
    });
  }, [qi]);

  const topScore = ranked.length ? q.answers[ranked[0].id].s : 0;

  return (
    <div className="wrap">
      <nav className="nav">
        <span className="tag">VIZUARA · SLM ENGINEERING</span>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <a href="#arena" className="tag" style={{ fontSize: "0.72rem" }}>Arena</a>
          <a href="#leaderboard" className="tag" style={{ fontSize: "0.72rem" }}>Leaderboard</a>
          <a href="#judge" className="tag" style={{ fontSize: "0.72rem" }}>The judge</a>
          <ThemePicker />
        </div>
      </nav>

      {/* hero */}
      <header className="hero">
        <span className="tag" style={{ color: "var(--accent)" }}>HEAD-TO-HEAD · TRAINED &amp; ALIGNED BY HARMAN SANDHU</span>
        <h1>SLM Arena</h1>
        <p className="lead">
          Thirteen small language models — three sizes (125M, 500M, Gemma&nbsp;2B) across their training
          stages — answering the <em>same</em> held-out legal and financial questions. A blind LLM judge
          scored every response out of 10, and for each question it was handed the gold answer and its
          corpus evidence, so the scores are checkable rather than vibes. This is a replay of the real
          evaluation — every answer below is exactly what the model produced.
        </p>
      </header>

      {/* stats */}
      <div className="statgrid">
        <div className="panel stat"><div className="value">13</div><div className="tag label">Models</div></div>
        <div className="panel stat"><div className="value">3</div><div className="tag label">Sizes</div></div>
        <div className="panel stat"><div className="value">{DATA.n_questions_total}</div><div className="tag label">Held-out Qs</div></div>
        <div className="panel stat"><div className="value">{DATA.n_questions_arena}</div><div className="tag label">In the arena</div></div>
        <div className="panel stat"><div className="value">1</div><div className="tag label">Blind judge</div></div>
      </div>

      {/* ARENA */}
      <section id="arena" className="section">
        <span className="tag">Arena · one question, thirteen answers</span>
        <div className="panel card" style={{ marginTop: 12 }}>
          {/* controls */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 16 }}>
            <button className="btn" onClick={() => go(-1)}>‹ Prev</button>
            <button className="btn" onClick={() => go(1)}>Next ›</button>
            <button className="btn-primary" onClick={random}>Random question</button>
            <span className="mono" style={{ color: "var(--fg-dim)", fontSize: "0.85rem" }}>
              {qi + 1} / {QS.length}
            </span>
            <select
              className="field"
              style={{ marginLeft: "auto", maxWidth: 260 }}
              value={qi}
              onChange={(e) => { setRevealed(false); setQi(Number(e.target.value)); }}
            >
              {QS.map((qq, i) => (
                <option key={qq.id} value={i}>
                  {i + 1}. {qq.q.length > 46 ? qq.q.slice(0, 44) + "…" : qq.q}
                </option>
              ))}
            </select>
          </div>

          {/* question */}
          <div className="panel-inset" style={{ padding: "16px 18px" }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              <span className="badge badge-accent">{SOURCE_LABEL[q.source] ?? q.source}</span>
              <span className="badge">{q.answerable ? "answerable" : "not in context"}</span>
            </div>
            <div style={{ fontSize: "1.08rem", fontWeight: 600, lineHeight: 1.5 }}>{q.q}</div>
            <div style={{ marginTop: 14 }}>
              {revealed ? (
                <div>
                  <span className="tag" style={{ color: "var(--accent-2)" }}>Answer key (gold)</span>
                  <p style={{ margin: "6px 0 0", color: "var(--fg)", lineHeight: 1.55 }}>{q.gold}</p>
                </div>
              ) : (
                <button className="btn" onClick={() => setRevealed(true)}>Reveal the answer key ▾</button>
              )}
            </div>
          </div>

          {/* responses ranked */}
          <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
            {ranked.map((m, i) => {
              const a = q.answers[m.id];
              const isTop = a.s === topScore && a.s > 0;
              return (
                <div
                  key={m.id}
                  className="panel-inset"
                  style={{ padding: "13px 15px", borderColor: isTop ? "var(--accent)" : "var(--border-soft)" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span className="mono" style={{ color: "var(--fg-dim)", width: 22 }}>{i + 1}</span>
                    <a href={m.site} target="_blank" rel="noreferrer" style={{ fontWeight: 600, color: "var(--fg)", textDecoration: "none" }}>
                      {m.name}
                    </a>
                    <span className="badge">{m.family}</span>
                    <span className="badge">{m.stage}</span>
                    {a.g && <span className="badge badge-accent" title="Judge marked this answer grounded in the source">grounded</span>}
                    <span style={{ marginLeft: "auto" }}><ScorePill s={a.s} /></span>
                  </div>
                  <p className="mono" style={{ margin: "10px 0 0", fontSize: "0.86rem", color: "var(--fg-muted)", lineHeight: 1.5, whiteSpace: "pre-wrap", maxHeight: 150, overflow: "auto" }}>
                    {a.r || "—"}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
        <p style={{ fontSize: "0.85rem", color: "var(--fg-dim)", marginTop: 10 }}>
          Ranking is per-question, by the judge&apos;s 0–10 correctness score. Model names link to each model&apos;s own site
          (training details, cost, architecture). Base models are prompted few-shot and are the floor.
        </p>
      </section>

      {/* LEADERBOARD */}
      <section id="leaderboard" className="section">
        <span className="tag">Leaderboard · mean judge score over all {DATA.n_questions_total} held-out questions</span>
        <div className="panel card" style={{ marginTop: 12, overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>#</th><th>Model</th><th>Size</th><th>Stage</th>
                <th style={{ textAlign: "right" }}>Judge / 10</th>
                <th style={{ textAlign: "right" }}>Grounded</th>
              </tr>
            </thead>
            <tbody>
              {BOARD.map((m, i) => (
                <tr key={m.id}>
                  <td className="num" style={{ color: "var(--fg-dim)" }}>{i + 1}</td>
                  <td><a href={m.site} target="_blank" rel="noreferrer" style={{ color: "var(--fg)", textDecoration: "none", fontWeight: 600 }}>{m.name}</a></td>
                  <td style={{ color: "var(--fg-muted)" }}>{m.family}</td>
                  <td style={{ color: "var(--fg-muted)" }}>{m.stage}</td>
                  <td style={{ textAlign: "right" }}><ScorePill s={m.score} /></td>
                  <td className="num" style={{ color: "var(--fg-muted)" }}>{m.grounded}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: "0.85rem", color: "var(--fg-dim)", marginTop: 10 }}>
          Scores are the blind judge&apos;s correctness rating (1–5, shown on a 0–10 scale), averaged over the full
          held-out set — not just the {DATA.n_questions_arena} questions surfaced in the arena above. Gemma 2B dominates on
          absolute correctness; the from-scratch 125M and 500M models are far smaller and score accordingly.
        </p>
      </section>

      {/* HOW THE JUDGE WORKS */}
      <section id="judge" className="section">
        <div className="panel card">
          <span className="tag">How the judge works</span>
          <h2>An open-book judge, blind to the contestant</h2>
          <p style={{ marginTop: 8 }}>
            Every answer is scored by a Gemini judge that never sees which model produced it. For each held-out
            question the judge is handed the <strong>gold answer and the corpus evidence</strong>, then rates the
            response for correctness (1–5, shown here on a 0–10 scale) and whether it is grounded in the source. Because
            the judge has the answer key, the scores are checkable rather than a popularity contest.
          </p>
          <p style={{ marginTop: 12 }}>
            The evaluation set is frozen and decontaminated (chunk-level dedup against public legal benchmarks), and
            every model is scored on the identical questions with deterministic greedy decoding. The custom 125M and
            500M base models are prompted few-shot so they show real capability, and are treated as the floor. The
            reward model used in RLAIF is kept out of this scoring entirely — the judge is independent of it, so RLAIF
            gets no home-field advantage.
          </p>
          <p style={{ marginTop: 12, fontSize: "0.86rem", color: "var(--fg-dim)" }}>
            Honest caveat: the judge itself has not yet been calibrated against human labels, so treat small
            differences cautiously. The full methodology, confidence intervals and paired-significance tests live in
            the evaluation report behind each model&apos;s site.
          </p>
        </div>
      </section>

      <footer>
        <div className="grad-divider" />
        <div className="badge-line">Arena built &amp; models aligned by Harman Sandhu</div>
        <div className="src">Vizuara AI Labs · SLM engineering · a replay of the real held-out evaluation</div>
      </footer>
    </div>
  );
}
