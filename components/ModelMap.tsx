"use client";

/**
 * The build, laid out: every training stage across every size. Each cell links to that model's
 * own site. Sizes that never shipped a stage (the 500M has no standalone QA-SFT or RAFT site)
 * render as an em-dash rather than a dead link.
 */
type Model = { id: string; name: string; family: string; stage: string; site: string };

const FAMILIES = ["125M", "500M", "Gemma 2B"];
const STAGES: { key: string; label: string; note: string }[] = [
  { key: "Base", label: "Base model", note: "next-token only" },
  { key: "QA SFT", label: "QA SFT", note: "supervised fine-tune" },
  { key: "RAFT", label: "RAFT", note: "retrieval-augmented" },
  { key: "DPO", label: "DPO", note: "direct preference" },
  { key: "RLAIF", label: "RLAIF", note: "reward model + PPO" },
];

export default function ModelMap({ models }: { models: Model[] }) {
  const at = (fam: string, stage: string) =>
    models.find((m) => m.family === fam && m.stage === stage);

  return (
    <div className="panel card">
      <span className="tag">The build · {models.length} models in this arena</span>
      <h2 style={{ marginTop: 6 }}>One pipeline, three sizes</h2>
      <p style={{ margin: "6px 0 16px" }}>
        Each row is a training stage, each column a model size. 125M and 500M were trained from
        scratch; Gemma&nbsp;2&nbsp;B is Google&apos;s pretrained base. Click any cell to open that
        model&apos;s own site — training details, cost, architecture and evaluation.
      </p>

      <div style={{ overflowX: "auto" }}>
        <table style={{ minWidth: 520 }}>
          <thead>
            <tr>
              <th style={{ width: "26%" }}>Stage</th>
              {FAMILIES.map((f) => (
                <th key={f} style={{ textAlign: "center" }}>{f}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {STAGES.map((st) => (
              <tr key={st.key}>
                <td style={{ verticalAlign: "top" }}>
                  <div style={{ fontWeight: 600 }}>{st.label}</div>
                  <div className="mono" style={{ fontSize: "0.75rem", color: "var(--fg-dim)" }}>{st.note}</div>
                </td>
                {FAMILIES.map((fam) => {
                  const m = at(fam, st.key);
                  return (
                    <td key={fam} style={{ textAlign: "center" }}>
                      {m ? (
                        <a href={m.site} target="_blank" rel="noreferrer"
                           className="badge" style={{ textDecoration: "none", display: "inline-block",
                             padding: "5px 10px", color: "var(--fg)" }}>
                          {fam} · {st.key === "Base" ? "base" : st.key.toLowerCase()}
                        </a>
                      ) : (
                        <span style={{ color: "var(--fg-dim)" }} title="not published for this size">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: "0.82rem", color: "var(--fg-dim)", marginTop: 12 }}>
        The 500M line ships only base, DPO and RLAIF — its QA-SFT and RAFT checkpoints were trained
        but never published as their own sites, so those cells are empty.
      </p>
    </div>
  );
}
