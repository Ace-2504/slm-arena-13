"use client";

import { Fragment, useState } from "react";
import FineTunePie from "@/components/FineTunePie";

/**
 * Cost to build — what the thirteen models actually cost.
 *
 * Modal figures are invoiced totals read off the four workspace dashboards, not wall-clock
 * multiplied by an assumed GPU rate. Gemini is the combined API spend for every dataset
 * generation and judging call, in rupees, as billed.
 */

const MODAL_TOTAL = 116.39;

const PHASES: { phase: string; detail: string; cost: number }[] = [
  { phase: "125M pretraining", detail: "four legs — v1, extension, e2, e4 — from random weights", cost: 70.14 },
  { phase: "Fine-tuning", detail: "QA-SFT + RAFT across the 125M, 500M and Gemma 2B families", cost: 19.94 },
  { phase: "Evaluation", detail: "13 models × 500 held-out questions, generation + judging", cost: 19.19 },
  { phase: "Alignment", detail: "DPO and RLAIF (reward model + PPO) on all three families", cost: 5.23 },
  { phase: "Earlier SFT study", detail: "the 125M data-scaling run that preceded this build", cost: 1.66 },
  { phase: "Probes & smoke tests", detail: "capability probes and pipeline dry-runs", cost: 0.18 },
  { phase: "Image builds & exports", detail: "container builds, checkpoint downloads", cost: 0.05 },
];

const GEMINI_INR = 2215;

function Bar({ pct }: { pct: number }) {
  return (
    <div style={{ height: 7, borderRadius: 999, background: "var(--panel-2)", overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: "var(--accent)" }} />
    </div>
  );
}

export default function CostToBuild() {
  const [openFt, setOpenFt] = useState(false);

  return (
    <div className="panel card breakout">
      <span className="tag">Cost to build</span>
      <h2 style={{ marginTop: 6 }}>What the thirteen models cost</h2>
      <p style={{ margin: "6px 0 20px" }}>
        Two bills built this: <strong>Modal</strong> for every GPU hour across four workspaces, and
        the <strong>Gemini API</strong> for generating the training data and running the judge.
      </p>

      <div className="statgrid" style={{ marginBottom: 26 }}>
        <div className="panel stat">
          <div className="value mono">${MODAL_TOTAL.toFixed(2)}</div>
          <div className="tag label">Modal · GPU</div>
        </div>
        <div className="panel stat">
          <div className="value mono">₹{GEMINI_INR.toLocaleString("en-IN")}</div>
          <div className="tag label">Gemini API</div>
        </div>
        <div className="panel stat">
          <div className="value mono">13</div>
          <div className="tag label">Models built</div>
        </div>
        <div className="panel stat">
          <div className="value mono">1</div>
          <div className="tag label">Modal accounts</div>
        </div>
      </div>

      <h3 style={{ margin: "0 0 10px", fontSize: "1.05rem", fontWeight: 600 }}>Where the GPU money went</h3>
      <div style={{ overflowX: "auto" }}>
        <table className="lb-table" style={{ minWidth: 620 }}>
          <thead>
            <tr>
              <th>Phase</th>
              <th style={{ textAlign: "right" }}>Cost</th>
              <th></th>
              <th style={{ textAlign: "right" }}>Share</th>
            </tr>
          </thead>
          <tbody>
            {PHASES.map((p) => {
              const pct = (p.cost / MODAL_TOTAL) * 100;
              const expandable = p.phase === "Fine-tuning";
              return (
                <Fragment key={p.phase}>
                  <tr
                    className={expandable ? "row-expand" : undefined}
                    onClick={expandable ? () => setOpenFt((v) => !v) : undefined}
                    tabIndex={expandable ? 0 : undefined}
                    role={expandable ? "button" : undefined}
                    aria-expanded={expandable ? openFt : undefined}
                    onKeyDown={expandable ? (e) => {
                      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpenFt((v) => !v); }
                    } : undefined}
                  >
                    <td>
                      <div style={{ fontWeight: 600 }}>
                        {expandable && <span className={openFt ? "chev open" : "chev"}>▶</span>}{expandable ? " " : ""}
                        {p.phase}
                      </div>
                      <div style={{ color: "var(--fg-muted)", fontSize: "0.85rem", marginTop: 2 }}>
                        {p.detail}
                        {expandable && (
                          <span style={{ color: "var(--accent)" }}> — click for the per-model split</span>
                        )}
                      </div>
                    </td>
                    <td className="num" style={{ fontWeight: 600 }}>${p.cost.toFixed(2)}</td>
                    <td style={{ width: 130, minWidth: 130 }}><Bar pct={pct} /></td>
                    <td className="num" style={{ color: "var(--fg-muted)" }}>{pct.toFixed(1)}%</td>
                  </tr>
                  {expandable && openFt && (
                    <tr>
                      <td colSpan={4} style={{ padding: "16px 0 22px" }}>
                        <FineTunePie />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            <tr>
              <td style={{ fontWeight: 700 }}>Total invoiced</td>
              <td className="num" style={{ fontWeight: 700 }}>${MODAL_TOTAL.toFixed(2)}</td>
              <td></td>
              <td className="num" style={{ color: "var(--fg-muted)" }}>100%</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p style={{ color: "var(--fg-muted)", fontSize: "0.9rem", lineHeight: 1.65, marginTop: 14 }}>
        Pretraining the 125M from scratch is <strong>60% of everything</strong>. Fine-tuning three
        families to five stages each came to $19.94 — barely a quarter of the pretraining bill.
        Evaluation cost <strong>nearly four times</strong> all the alignment work combined, which is
        the line most projects never publish.
      </p>

      <h3 style={{ margin: "28px 0 10px", fontSize: "1.05rem", fontWeight: 600 }}>Gemini API</h3>
      <div style={{ overflowX: "auto" }}>
        <table className="lb-table" style={{ minWidth: 620 }}>
          <thead>
            <tr>
              <th>Work</th>
              <th style={{ textAlign: "right" }}>Cost</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div style={{ fontWeight: 600 }}>Dataset generation and judging</div>
                <div style={{ color: "var(--fg-muted)", fontSize: "0.85rem", marginTop: 2 }}>
                  QA and RAFT training pairs, preference triplets, and every judge call behind the
                  leaderboard and this arena
                </div>
              </td>
              <td className="num" style={{ fontWeight: 700 }}>₹{GEMINI_INR.toLocaleString("en-IN")}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
