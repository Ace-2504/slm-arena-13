"use client";
import { useEffect, useState } from "react";
import { THEMES, DEFAULT_THEME, STORAGE_KEY } from "@/lib/themes";

export default function ThemePicker() {
  const [active, setActive] = useState(DEFAULT_THEME);
  useEffect(() => {
    setActive(document.documentElement.getAttribute("data-theme") ?? DEFAULT_THEME);
  }, []);
  function choose(id: string) {
    setActive(id);
    document.documentElement.setAttribute("data-theme", id);
    try { localStorage.setItem(STORAGE_KEY, id); } catch {}
  }
  return (
    <div role="radiogroup" aria-label="Color theme"
      style={{ display: "inline-flex", gap: 6, alignItems: "center", border: "1px solid var(--border)",
        background: "var(--panel)", borderRadius: 999, padding: "6px 8px" }}>
      {THEMES.map((t) => (
        <button key={t.id} role="radio" aria-checked={t.id === active} aria-label={t.name} title={t.name}
          onClick={() => choose(t.id)}
          style={{ display: "grid", placeItems: "center", borderRadius: "50%", border: 0,
            background: "transparent", width: 20, height: 20, cursor: "pointer", padding: 0 }}>
          <span style={{ width: 14, height: 14, borderRadius: "50%",
            background: `conic-gradient(${t.accents[0]} 0 33.3%, ${t.accents[1]} 0 66.6%, ${t.accents[2]} 0)`,
            boxShadow: t.id === active ? "0 0 0 2px var(--bg), 0 0 0 3.5px var(--fg)" : "0 0 0 1px rgba(0,0,0,.25)" }} />
        </button>
      ))}
    </div>
  );
}
