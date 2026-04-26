import type { ReactNode } from "react";

// Minimal markdown renderer for README/guidance files. Handles the subset we
// actually ship in statues.json: headings, paragraphs, lists (bulleted +
// ordered), code blocks (fenced), inline code, bold, italic, links,
// blockquotes, horizontal rules, and pipe-delimited tables. No HTML
// passthrough — everything goes through React, so we never dangerouslySetInnerHTML.

type Block =
  | { kind: "heading"; level: number; text: string }
  | { kind: "para"; text: string }
  | { kind: "code"; lang: string; body: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "quote"; text: string }
  | { kind: "hr" }
  | { kind: "table"; header: string[]; rows: string[][] };

function tokenize(src: string): Block[] {
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  const out: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        body.push(lines[i]);
        i++;
      }
      i++;
      out.push({ kind: "code", lang, body: body.join("\n") });
      continue;
    }

    if (/^#{1,6}\s/.test(line)) {
      const m = line.match(/^(#{1,6})\s+(.*)$/);
      if (m) {
        out.push({ kind: "heading", level: m[1].length, text: m[2].trim() });
        i++;
        continue;
      }
    }

    if (/^(\s*)([-*+])\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^(\s*)([-*+])\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^(\s*)([-*+])\s+/, ""));
        i++;
      }
      out.push({ kind: "ul", items });
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      out.push({ kind: "ol", items });
      continue;
    }

    if (line.startsWith("> ")) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        buf.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      out.push({ kind: "quote", text: buf.join(" ") });
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      out.push({ kind: "hr" });
      i++;
      continue;
    }

    // Pipe table: header line, separator line, then body rows.
    if (line.includes("|") && i + 1 < lines.length && /^\s*\|?\s*[-:]+\s*(\|\s*[-:]+\s*)+\|?\s*$/.test(lines[i + 1])) {
      const splitRow = (row: string) =>
        row.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
      const header = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim() !== "") {
        rows.push(splitRow(lines[i]));
        i++;
      }
      out.push({ kind: "table", header, rows });
      continue;
    }

    if (line.trim() === "") {
      i++;
      continue;
    }

    const buf: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" && !/^(```|#{1,6}\s|>\s|---+$|(\s*)([-*+])\s|\s*\d+\.\s)/.test(lines[i])) {
      buf.push(lines[i]);
      i++;
    }
    out.push({ kind: "para", text: buf.join(" ") });
  }
  return out;
}

// Inline parsing: code, bold, italic, links — escape everything else.
function inline(src: string, keyPrefix: string): ReactNode[] {
  const tokens: ReactNode[] = [];
  let key = 0;
  const k = () => `${keyPrefix}-${key++}`;

  // Tokenize with a single regex pass; alternation order matters.
  const re =
    /`([^`]+)`|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*\n]+)\*|_([^_\n]+)_|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    if (m.index > lastIndex) tokens.push(src.slice(lastIndex, m.index));
    if (m[1] != null) tokens.push(<code key={k()} className="md-inline-code">{m[1]}</code>);
    else if (m[2] != null) tokens.push(<strong key={k()}>{m[2]}</strong>);
    else if (m[3] != null) tokens.push(<strong key={k()}>{m[3]}</strong>);
    else if (m[4] != null) tokens.push(<em key={k()}>{m[4]}</em>);
    else if (m[5] != null) tokens.push(<em key={k()}>{m[5]}</em>);
    else if (m[6] != null && m[7] != null) {
      const href = m[7];
      const safe = /^(https?:|mailto:|#|\/)/.test(href) ? href : "#";
      tokens.push(
        <a
          key={k()}
          href={safe}
          target={safe.startsWith("http") ? "_blank" : undefined}
          rel={safe.startsWith("http") ? "noreferrer noopener" : undefined}
        >
          {m[6]}
        </a>,
      );
    }
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < src.length) tokens.push(src.slice(lastIndex));
  return tokens;
}

export function Markdown({ source }: { source: string }) {
  const blocks = tokenize(source);
  return (
    <div className="md">
      {blocks.map((b, i) => {
        switch (b.kind) {
          case "heading": {
            const lvl = Math.min(6, Math.max(1, b.level));
            const inner = inline(b.text, `h${i}`);
            if (lvl === 1) return <h1 key={i}>{inner}</h1>;
            if (lvl === 2) return <h2 key={i}>{inner}</h2>;
            if (lvl === 3) return <h3 key={i}>{inner}</h3>;
            if (lvl === 4) return <h4 key={i}>{inner}</h4>;
            if (lvl === 5) return <h5 key={i}>{inner}</h5>;
            return <h6 key={i}>{inner}</h6>;
          }
          case "para":
            return <p key={i}>{inline(b.text, `p${i}`)}</p>;
          case "code":
            return (
              <pre key={i} className={`md-code md-lang-${b.lang || "plain"}`}>
                <code>{b.body}</code>
              </pre>
            );
          case "ul":
            return (
              <ul key={i}>
                {b.items.map((it, j) => (
                  <li key={j}>{inline(it, `li${i}-${j}`)}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i}>
                {b.items.map((it, j) => (
                  <li key={j}>{inline(it, `oli${i}-${j}`)}</li>
                ))}
              </ol>
            );
          case "quote":
            return <blockquote key={i}>{inline(b.text, `q${i}`)}</blockquote>;
          case "hr":
            return <hr key={i} />;
          case "table":
            return (
              <table key={i} className="md-table">
                <thead>
                  <tr>
                    {b.header.map((h, j) => (
                      <th key={j}>{inline(h, `th${i}-${j}`)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {b.rows.map((row, r) => (
                    <tr key={r}>
                      {row.map((c, j) => (
                        <td key={j}>{inline(c, `td${i}-${r}-${j}`)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            );
        }
      })}
    </div>
  );
}
