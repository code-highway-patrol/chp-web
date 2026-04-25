import { useEffect, useRef, useState } from "react";
import { CLIENTS, type ClientId } from "./clients";

type Props = {
  value: ClientId;
  onChange: (id: ClientId) => void;
};

export function ClientPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const selected = CLIENTS.find((c) => c.id === value) ?? CLIENTS[0];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const list = CLIENTS.filter((c) =>
    c.label.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="client-picker" ref={ref}>
      <button
        className={"client-trigger" + (open ? " open" : "")}
        onClick={() => {
          setOpen((o) => !o);
          setQ("");
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="glyph">
          <img src={selected.icon} alt="" />
        </span>
        <span className="label">{selected.label}</span>
        <span className="chev">▾</span>
      </button>
      {open && (
        <div className="client-menu" role="listbox">
          <div className="client-search">
            <span className="icon">⌕</span>
            <input
              autoFocus
              placeholder="Search…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          {list.length === 0 ? (
            <div className="client-empty">no client matches “{q}”</div>
          ) : (
            list.map((c) => (
              <div
                key={c.id}
                role="option"
                aria-selected={c.id === value}
                className={"client-item" + (c.id === value ? " sel" : "")}
                onClick={() => {
                  onChange(c.id);
                  setOpen(false);
                }}
              >
                <span className="glyph">
                  <img src={c.icon} alt="" />
                </span>
                <span className="name">{c.label}</span>
                <span className="check">✓</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
