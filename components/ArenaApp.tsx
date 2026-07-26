"use client";
import { useState } from "react";
import ThemePicker from "@/components/ThemePicker";
import ArenaLive from "@/components/ArenaLive";
import ModelMap from "@/components/ModelMap";
import DATA from "@/lib/arena-data.json";

type Q = { id: string; q: string; ctx: string; gold: string; source: string; answerable: boolean };
type Model = { id: string; name: string; family: string; stage: string; site: string };
type LB = Model & {
  score: number; grounded: number; fabrication: number; token_f1: number; n: number;
  by_source: Record<string, number>;
};

const MODELS = DATA.models as Model[];
const QS = DATA.questions as Q[];
const BOARD = DATA.leaderboard as LB[];
// "rubric10" once the frozen set has been re-scored with the same 4-dimension rubric the live
// arena uses; "correct1to5" while the leaderboard still carries the old 5-value mapping.
const RUBRIC10 = (DATA as { rubric?: string }).rubric === "rubric10";

const SOURCES: { key: string; label: string }[] = [
  { key: "case-law", label: "Case law" },
  { key: "sec", label: "SEC" },
  { key: "fineweb-edu", label: "Web" },
];

function scoreColor(s: number) {
  return `hsl(${Math.round(s * 12)} 62% 42%)`;
}

function ScorePill({ s }: { s: number }) {
  return (
    <span className="mono" style={{
      fontWeight: 700, fontSize: "0.9rem", color: "#fff", background: scoreColor(s),
      borderRadius: 7, padding: "3px 9px", minWidth: 54, textAlign: "center", display: "inline-block",
    }} title="Blind LLM-judge score, 0–10">{s.toFixed(2)}</span>
  );
}

type Tab = "arena" | "leaderboard" | "judge";
const TABS: { id: Tab; label: string }[] = [
  { id: "arena", label: "Arena" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "judge", label: "How the judge works" },
];

export default function ArenaApp() {
  const [tab, setTab] = useState<Tab>("arena");

  return (
    <div className="wrap">
      <nav className="nav">
        <span className="tag">SLM ENGINEERING</span>
        <ThemePicker />
      </nav>

      {/* hero */}
      <header className="hero">
        <div className="brand">Trained, fine-tuned &amp; aligned by Harman Sandhu</div>
        <span className="tag" style={{ color: "var(--accent)" }}>HEAD-TO-HEAD · 13 MODELS, ONE QUESTION</span>
        <h1>SLM Arena</h1>
        <p className="lead">
          Thirteen small language models — three sizes (125M, 500M, Gemma&nbsp;2B) across their
          training stages — answering the <em>same</em> question live, then scored
          0–10 by a blind LLM judge. Ask one of the held-out evaluation questions, where the judge
          is handed the gold answer so its scores are checkable, or write your own and watch all
          thirteen take a run at it.
        </p>
      </header>

      {/* stats */}
      <div className="statgrid">
        <div className="panel stat"><div className="value">13</div><div className="tag label">Models</div></div>
        <div className="panel stat"><div className="value">3</div><div className="tag label">Sizes</div></div>
        <div className="panel stat"><div className="value">5</div><div className="tag label">Stages</div></div>
        <div className="panel stat"><div className="value">{DATA.n_questions_total}</div><div className="tag label">Held-out Qs</div></div>
        <div className="panel stat"><div className="value">1</div><div className="tag label">Blind judge</div></div>
      </div>

      {/* the build, laid out */}
      <section className="section"><ModelMap models={MODELS} /></section>

      {/* tab bar — in the body, not the navbar */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "34px 0 16px" }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={tab === t.id ? "btn-primary" : "btn"}
            style={{ fontSize: "0.9rem" }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "arena" && (
        <section id="arena" className="section" style={{ marginTop: 0 }}>
          <ArenaLive models={MODELS} questions={QS} />
        </section>
      )}

      {tab === "leaderboard" && (
        <section id="leaderboard" className="section" style={{ marginTop: 0 }}>
          <div className="panel card breakout" style={{ overflowX: "auto" }}>
            <span className="tag">Leaderboard · frozen held-out evaluation</span>
            <h2 style={{ marginTop: 6 }}>Mean judge score over all {DATA.n_questions_total} questions</h2>
            <p style={{ margin: "6px 0 16px" }}>
              This table is the <strong>offline evaluation</strong>, not the live arena: every model
              answered the same {DATA.n_questions_total} decontaminated held-out questions and a
              blind judge scored each one. The per-source columns split those same items by where
              the document came from.
            </p>
            <table className="lb-table" style={{ minWidth: 1020 }}>
              <thead>
                <tr>
                  <th>#</th><th>Model</th><th>Size</th><th>Stage</th>
                  <th style={{ textAlign: "right" }}>Mean /10</th>
                  <th></th>
                  {SOURCES.map((s, si) => <th key={s.key} className={si === 0 ? "lb-group" : undefined} style={{ textAlign: "right" }}>{s.label}</th>)}
                  <th className="lb-group" style={{ textAlign: "right" }}>Grounded</th>
                  <th style={{ textAlign: "right" }}>Fabric.↓</th>
                  <th style={{ textAlign: "right" }}>Token-F1</th>
                  <th style={{ textAlign: "right" }}>n</th>
                </tr>
              </thead>
              <tbody>
                {BOARD.map((m, i) => (
                  <tr key={m.id}>
                    <td className="num" style={{ color: "var(--fg-dim)" }}>{i + 1}</td>
                    <td><a href={m.site} target="_blank" rel="noreferrer"
                           style={{ color: "var(--fg)", textDecoration: "none", fontWeight: 600 }}>{m.name}</a></td>
                    <td style={{ color: "var(--fg-muted)" }}>{m.family}</td>
                    <td style={{ color: "var(--fg-muted)" }}>{m.stage}</td>
                    <td style={{ textAlign: "right" }}><ScorePill s={m.score} /></td>
                    <td style={{ width: 110, minWidth: 110 }}>
                      <div style={{ height: 7, borderRadius: 999, background: "var(--panel-2)", overflow: "hidden" }}>
                        <div style={{ width: `${m.score * 10}%`, height: "100%", background: scoreColor(m.score) }} />
                      </div>
                    </td>
                    {SOURCES.map((s, si) => (
                      <td key={s.key} className={si === 0 ? "num lb-group" : "num"} style={{ color: "var(--fg-muted)" }}>
                        {m.by_source?.[s.key]?.toFixed(2) ?? "–"}
                      </td>
                    ))}
                    <td className="num lb-group" style={{ color: "var(--fg-muted)" }}>{m.grounded}%</td>
                    <td className="num" style={{ color: "var(--fg-muted)" }}>{m.fabrication}%</td>
                    <td className="num" style={{ color: "var(--fg-muted)" }}>{m.token_f1?.toFixed(3)}</td>
                    <td className="num" style={{ color: "var(--fg-dim)" }}>{m.n}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* How these numbers relate to the experiment reports — same inputs, different scale. */}
            <div className="panel-inset" style={{
              marginTop: 18, padding: "14px 16px",
              borderLeft: "3px solid var(--accent-2)", lineHeight: 1.6, fontSize: "0.88rem",
            }}>
              <span className="tag" style={{ color: "var(--accent-2)" }}>Note</span>
              <p style={{ margin: "6px 0 0", color: "var(--fg-muted)" }}>
                Same 500 questions, same answers, same judge (<span className="mono">gemini-3.1-flash-lite</span>)
                as the experiment reports — scored here on a 0–10 four-dimension rubric
                (correctness&nbsp;+&nbsp;completeness&nbsp;+&nbsp;groundedness&nbsp;+&nbsp;clarity) rather
                than the reports&apos; stricter 0–1 correctness scale, so the two numbers differ and
                near-ties can swap order. Token-F1 and fabrication are identical in both.
              </p>
            </div>

            <p style={{ fontSize: "0.85rem", color: "var(--fg-dim)", marginTop: 14, lineHeight: 1.6 }}>
              <strong>Mean /10</strong> is {RUBRIC10
                ? "the four-dimension rubric score (correctness + completeness + groundedness + clarity), the same scale the live arena uses"
                : "the judge's 1–5 correctness rating rescaled to 0–10"}.
              <strong> Grounded</strong> is the share of answers the judge found free of invented
              claims — an independent signal, not a restatement of correctness (670 answers were
              grounded but wrong, 50 correct but ungrounded). <strong>Fabrication</strong> counts
              answers containing figures absent from the source. <strong>Token-F1</strong> is lexical
              overlap with the reference, shown for completeness — it punishes correct paraphrase
              badly (Gemma RAFT reads 0.145 against a 9.75 judge score), which is precisely why the
              judge and not F1 is the headline.
            </p>
          </div>
        </section>
      )}

      {tab === "judge" && (
        <section id="judge" className="section" style={{ marginTop: 0 }}>
          <div className="panel card">
            <span className="tag">How the judge works</span>
            <h2 style={{ marginTop: 6 }}>An open-book judge, blind to the contestant</h2>
            <p style={{ marginTop: 8 }}>
              Every answer is scored by a Gemini judge (<span className="mono">gemini-3.1-flash-lite</span>)
              that never sees which model produced it, and scores one answer at a time so nothing is
              flattered by comparison. For a <strong>held-out question</strong> the judge is handed the
              <strong> source document and the gold answer</strong>, so its score is checkable against a
              known-good reference rather than a popularity contest. For a question <strong>you
              write</strong> there is no answer key, so it grades from its own knowledge — still blind,
              but a weaker signal, and the arena labels it as such.
            </p>

            <h3 style={{ margin: "22px 0 8px", fontSize: "1.05rem", fontWeight: 600 }}>The rubric</h3>
            <p style={{ marginBottom: 12 }}>
              The live arena scores four dimensions that add up to 10, so a nearly-right answer
              separates cleanly from a hopeless one:
            </p>
            <table>
              <thead><tr><th>Dimension</th><th>Points</th><th>What it measures</th></tr></thead>
              <tbody>
                <tr><td style={{ fontWeight: 600 }}>Correctness</td><td className="mono">0–5</td><td style={{ color: "var(--fg-muted)" }}>Factual agreement with the gold answer</td></tr>
                <tr><td style={{ fontWeight: 600 }}>Completeness</td><td className="mono">0–2</td><td style={{ color: "var(--fg-muted)" }}>Covers the key points, not just one of them</td></tr>
                <tr><td style={{ fontWeight: 600 }}>Groundedness</td><td className="mono">0–2</td><td style={{ color: "var(--fg-muted)" }}>No invented cases, figures or citations</td></tr>
                <tr><td style={{ fontWeight: 600 }}>Clarity</td><td className="mono">0–1</td><td style={{ color: "var(--fg-muted)" }}>Answers what was asked, without padding or contradiction</td></tr>
              </tbody>
            </table>

            <h3 style={{ margin: "22px 0 8px", fontSize: "1.05rem", fontWeight: 600 }}>What keeps it honest</h3>
            <ul style={{ color: "var(--fg-muted)", lineHeight: 1.7, paddingLeft: 20, margin: 0 }}>
              <li><strong>Frozen, decontaminated set</strong> — chunk-level dedup against public legal
                benchmarks, so no evaluation passage was trained on.</li>
              <li><strong>Identical questions for every model</strong>, with deterministic decoding in
                the offline run, making the leaderboard a like-for-like comparison.</li>
              <li><strong>Base models are prompted few-shot</strong> so they show real capability, and
                are treated as the floor rather than quietly excluded.</li>
              <li><strong>The RLAIF reward model is kept out of scoring entirely</strong> — the judge is
                independent of it, so RLAIF gets no home-field advantage from the thing it optimised.</li>
              <li><strong>Grounding is scored separately from correctness</strong>, which is how an
                answer can be honest but incomplete, or fluent and fabricated.</li>
            </ul>

            <h3 style={{ margin: "22px 0 8px", fontSize: "1.05rem", fontWeight: 600 }}>Known limits</h3>
            <p style={{ color: "var(--fg-dim)", fontSize: "0.9rem", lineHeight: 1.65 }}>
              The judge has <strong>not been calibrated against human labels</strong>, so treat small
              differences cautiously — the calibration tool exists, but the human pass has not been
              run. It is a single judge model, so its blind spots are systematic rather than averaged
              away. {RUBRIC10
                ? "The leaderboard has been re-scored with the same four-dimension rubric the live arena uses, so an arena score and a leaderboard mean are now the same measurement on the same scale."
                : "And the leaderboard still uses the offline 1–5 correctness scale, which maps to only five possible values per answer, whereas the live arena uses the finer four-dimension rubric above — so one arena score and one leaderboard mean are not the same measurement."}{" "}
              Full methodology, confidence intervals and paired-significance tests
              live in the evaluation report behind each model&apos;s site.
            </p>
          </div>
        </section>
      )}

      <footer>
        <div className="grad-divider" />
        <div className="badge-line">Arena built &amp; models aligned by Harman Sandhu</div>
        <div className="src">Small language models · live generation, judged by Gemini</div>
      </footer>
    </div>
  );
}
