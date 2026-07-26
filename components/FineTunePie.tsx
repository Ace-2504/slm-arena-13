"use client";

import { useState } from "react";

/**
 * Fine-tuning spend, split per model.
 *
 * Six slices, summing to the $19.94 fine-tuning row: every SFT and RAFT run that was
 * invoiced. The 500M RAFT run is included even though it has no site of its own — it was
 * trained and billed, so leaving it out would break the total.
 */

export type Slice = { model: string; stage: string; cost: number };

export const FT_SLICES: Slice[] = [
  { model: "Gemma 2B", stage: "QA-SFT", cost: 9.84 },
  { model: "Gemma 2B", stage: "RAFT", cost: 6.82 },
  { model: "SLM-500M", stage: "RAFT", cost: 1.74 },
  { model: "SLM-500M", stage: "QA-SFT", cost: 0.93 },
  { model: "SLM-125M", stage: "RAFT", cost: 0.41 },
  { model: "SLM-125M", stage: "QA-SFT", cost: 0.20 },
];

const R = 104;
const CX = 118;
const CY = 118;

function arc(startFrac: number, endFrac: number, r: number) {
  // start at 12 o'clock, sweep clockwise
  const a0 = startFrac * 2 * Math.PI - Math.PI / 2;
  const a1 = endFrac * 2 * Math.PI - Math.PI / 2;
  const x0 = CX + r * Math.cos(a0), y0 = CY + r * Math.sin(a0);
  const x1 = CX + r * Math.cos(a1), y1 = CY + r * Math.sin(a1);
  const large = endFrac - startFrac > 0.5 ? 1 : 0;
  return `M ${CX} ${CY} L ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`;
}

export default function FineTunePie({ slices = FT_SLICES }: { slices?: Slice[] }) {
  const [hot, setHot] = useState<number | null>(null);
  const total = slices.reduce((a, s) => a + s.cost, 0);

  let acc = 0;
  const geom = slices.map((s, i) => {
    const start = acc / total;
    acc += s.cost;
    const end = acc / total;
    const mid = ((start + end) / 2) * 2 * Math.PI - Math.PI / 2;
    return { ...s, i, start, end, pct: (s.cost / total) * 100, mid };
  });

  return (
    <div className="viz ft-pie">
      <div className="ft-pie-grid">
        {/* the pie */}
        <div style={{ position: "relative", flex: "0 0 auto" }}>
          <svg width={236} height={236} viewBox="0 0 236 236" role="img"
               aria-label={`Fine-tuning spend by model: ${geom.map(g => `${g.model} ${g.stage} $${g.cost.toFixed(2)}`).join(", ")}`}>
            {geom.map((g) => (
              <path
                key={g.i}
                d={arc(g.start, g.end, hot === g.i ? R + 5 : R)}
                fill={`var(--series-${g.i + 1})`}
                stroke="var(--panel)"
                strokeWidth={2}
                style={{ transition: "d 120ms ease", cursor: "default" }}
                onMouseEnter={() => setHot(g.i)}
                onMouseLeave={() => setHot(null)}
              />
            ))}
          </svg>

          {hot !== null && (
            <div className="ft-tip" role="status">
              <span className="mono" style={{ fontWeight: 700 }}>{geom[hot].model}</span>
              <span style={{ color: "var(--fg-muted)" }}> · {geom[hot].stage}</span>
              <div className="mono" style={{ marginTop: 2 }}>
                ${geom[hot].cost.toFixed(2)} · {geom[hot].pct.toFixed(1)}%
              </div>
            </div>
          )}
        </div>

        {/* legend — also the table view: identity is never colour alone */}
        <ul className="ft-legend">
          {geom.map((g) => (
            <li key={g.i}
                onMouseEnter={() => setHot(g.i)}
                onMouseLeave={() => setHot(null)}
                style={{ opacity: hot === null || hot === g.i ? 1 : 0.55 }}>
              <span className="ft-chip" style={{ background: `var(--series-${g.i + 1})` }} />
              <span className="ft-name">
                {g.model} <span style={{ color: "var(--fg-muted)" }}>· {g.stage}</span>
              </span>
              <span className="mono ft-val">${g.cost.toFixed(2)}</span>
              <span className="mono ft-pct">{g.pct.toFixed(1)}%</span>
            </li>
          ))}
          <li className="ft-total">
            <span className="ft-chip" style={{ background: "transparent" }} />
            <span className="ft-name" style={{ fontWeight: 700 }}>Total fine-tuning</span>
            <span className="mono ft-val" style={{ fontWeight: 700 }}>${total.toFixed(2)}</span>
            <span className="mono ft-pct">100%</span>
          </li>
        </ul>
      </div>

      <p className="ft-foot">
        Gemma 2B is <strong>84%</strong> of the fine-tuning bill — it ran on an A100-40GB while the
        125M and 500M fine-tunes ran on an L4, and it is fifteen times the size of the 125M. The
        500M RAFT run has no site of its own but was trained and billed, so it is counted here.
      </p>
    </div>
  );
}
