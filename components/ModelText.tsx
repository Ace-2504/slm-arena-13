"use client";
import React from "react";

/**
 * Render a model's raw output the way it was meant to read.
 *
 * Small models emit light markdown — Gemma in particular writes `**bold**`, `*italic*` and
 * `* bullet` lists — and the RAFT fine-tunes wrap their evidence in `##begin_quote## …
 * ##end_quote##`. Printing that verbatim shows the markers as literal characters.
 *
 * Deliberately tiny and dependency-free: no markdown library, and no dangerouslySetInnerHTML,
 * so untrusted model output can never inject markup.
 */

// Deliberately tolerant. These markers come out of a small model's sampler, so they arrive
// mangled surprisingly often — observed in the wild: "##end_ quote##", "##end_quotechloro##".
// Matching only the exact token left that debris on screen.
const QUOTE_OPEN = /##\s*begin[_\s]*quote[^#\n]{0,24}##/gi;
const QUOTE_CLOSE = /##\s*end[_\s]*quote[^#\n]{0,24}##/gi;
// A marker whose closing "##" the model dropped entirely.
const QUOTE_STRAY = /##\s*(?:begin|end)[_\s]*quote[^#\n]{0,24}(?=\s|$)/gi;

function inline(text: string, key: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  // **bold** first, so a single * never eats a double one. `code` and *italic* after.
  const re = /\*\*([^*]+)\*\*|__([^_]+)__|\*([^*\n]+)\*|`([^`\n]+)`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${key}-i${i++}`;
    if (m[1] !== undefined || m[2] !== undefined) {
      out.push(<strong key={k}>{m[1] ?? m[2]}</strong>);
    } else if (m[3] !== undefined) {
      out.push(<em key={k}>{m[3]}</em>);
    } else if (m[4] !== undefined) {
      out.push(
        <code key={k} style={{ background: "var(--panel-2)", padding: "0 4px", borderRadius: 4 }}>
          {m[4]}
        </code>
      );
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export default function ModelText({ text }: { text: string }) {
  if (!text) return null;

  // Turn the RAFT evidence markers into a real quotation.
  const quoted = text
    .replace(QUOTE_OPEN, "␟")
    .replace(QUOTE_CLOSE, "␟")
    .replace(QUOTE_STRAY, "");
  const segments = quoted.split("␟");

  return (
    <>
      {segments.map((seg, si) => {
        // odd segments sat between the begin/end markers -> evidence quote
        const isQuote = si % 2 === 1;
        const lines = seg.split("\n");
        const body = lines.map((line, li) => {
          const key = `s${si}-l${li}`;
          const bullet = /^\s*[*-]\s+(.*)$/.exec(line);
          if (bullet) {
            return (
              <span key={key} style={{ display: "flex", gap: 8, paddingLeft: 2 }}>
                <span style={{ color: "var(--accent)" }}>•</span>
                <span>{inline(bullet[1], key)}</span>
              </span>
            );
          }
          if (!line.trim()) return <span key={key} style={{ display: "block", height: "0.5em" }} />;
          return <span key={key} style={{ display: "block" }}>{inline(line, key)}</span>;
        });

        if (!isQuote) return <React.Fragment key={si}>{body}</React.Fragment>;
        return (
          <span key={si} style={{
            display: "block", borderLeft: "2px solid var(--accent-2)", paddingLeft: 10,
            margin: "6px 0", color: "var(--fg-muted)", fontStyle: "italic",
          }}>
            {body}
          </span>
        );
      })}
    </>
  );
}
