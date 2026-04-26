import { useState } from "react";
import { CLIENTS, type ClientId } from "./clients";

type Props = { client: ClientId };

export function InstallCmd({ client }: Props) {
  const [copied, setCopied] = useState(false);
  const a = CLIENTS.find((c) => c.id === client) ?? CLIENTS[0];
  const lines: string[][] = [a.cmd];
  if (a.after) lines.push(a.after);
  const plain = lines.map((l) => l.join(" ")).join("\n");

  return (
    <div className="install-cmd">
      <div className="cmd-lines">
        {lines.map((c, i) => {
          const [bin, arg, ...rest] = c;
          const tail = rest.join(" ");
          return (
            <div className="cmd-row" key={i}>
              <span className="prompt">{bin.startsWith("/") ? ">" : "$"}</span>
              <span className="cmd-text">
                {bin}
                {arg && (
                  <>
                    {" "}<span className="arg">{arg}</span>
                  </>
                )}
                {tail && (
                  <>
                    {" "}<span className="flag">{tail}</span>
                  </>
                )}
              </span>
            </div>
          );
        })}
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
