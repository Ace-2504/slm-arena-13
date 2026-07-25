"use client";
import ThemePicker from "@/components/ThemePicker";
import ArenaLive from "@/components/ArenaLive";
import DATA from "@/lib/arena-data.json";

type Q = { id: string; q: string; ctx: string; gold: string; source: string; answerable: boolean };
type Model = { id: string; name: string; family: string; stage: string; site: string };
type LB = Model & { score: number; grounded: number };

const MODELS = DATA.models as Model[];
const QS = DATA.questions as Q[];
const BOARD = DATA.leaderboard as LB[];


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
          stages — answering the <em>same</em> question live on a local GPU, then scored 0–10 by a
          blind LLM judge. Ask one of the held-out evaluation questions, where the judge is handed
          the gold answer so its scores are checkable, or write your own and watch all thirteen
          take a run at it.
        </p>
      </header>

      {/* stats */}
      <div className="statgrid">
        <div className="panel stat"><div className="value">13</div><div className="tag label">Models</div></div>
        <div className="panel stat"><div className="value">3</div><div className="tag label">Sizes</div></div>
        <div className="panel stat"><div className="value">{DATA.n_questions_total}</div><div className="tag label">Held-out Qs</div></div>
        <div className="panel stat"><div className="value">{DATA.n_questions_arena}</div><div className="tag label">Ready to ask</div></div>
        <div className="panel stat"><div className="value">1</div><div className="tag label">Blind judge</div></div>
      </div>

      {/* ARENA — live generation + live judging */}
      <section id="arena" className="section">
        <ArenaLive models={MODELS} questions={QS} />
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
            Every answer is scored by a Gemini judge that never sees which model produced it. For a
            <strong> held-out question</strong> the judge is handed the <strong>gold answer</strong>, so its
            score is checkable against a known-good reference rather than a popularity contest. For a
            question <strong>you write</strong> there is no answer key, so the judge grades from its own
            knowledge — still blind to the model, but a weaker signal, and the arena labels it as such.
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
        <div className="src">Vizuara AI Labs · SLM engineering · live generation on a local GPU, judged by Gemini</div>
      </footer>
    </div>
  );
}
