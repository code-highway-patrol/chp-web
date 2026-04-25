import { useState } from "react";
import { CLIENTS, type ClientId } from "./clients";

type Props = { client: ClientId };

export function InstallCmd({ client }: Props) {
  const [copied, setCopied] = useState(false);
  const a = CLIENTS.find((c) => c.id === client) ?? CLIENTS[0];
  const lines: [string, string, string][] = [a.cmd];
  if (a.after) lines.push(a.after);
  const plain = lines.map((l) => l.join(" ")).join("\n");

  return (
    <div className="install-cmd">
      <div className="cmd-lines">
        {lines.map((c, i) => (
          <div className="cmd-row" key={i}>
            <span className="prompt">{c[0].startsWith("/") ? ">" : "$"}</span>
            <span className="cmd-text">
              {c[0]} <span className="arg">{c[1]}</span>{" "}
              <span className="flag">{c[2]}</span>
            </span>
          </div>
        ))}
      </div>
      <button
        className={"copy" + (copied ? " copied" : "")}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(plain);
          } catch {
            /* clipboard blocked */
          }
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
