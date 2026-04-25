import { useState } from "react";
import { ClientPicker } from "./ClientPicker";
import { InstallCmd } from "./InstallCmd";
import { Cuffs } from "./Cuffs";
import type { ClientId } from "./clients";

export function Hero() {
  const [client, setClient] = useState<ClientId>("windsurf");

  return (
    <section className="hero">
      <div className="wrap hero-grid">
        <div>
          <span className="eyebrow">code highway patrol</span>
          <h1>
            Make your agent
            <br />
            obey the <span className="stripe">law</span>
            <br />
            of your codebase.
          </h1>
          <p className="lede">
            CHP rides shotgun on every agent turn, enforcing consistency at
            both the programmatic and agentic level so what ships is
            production-ready: cleaner diffs, easier to follow, easier to debug.
          </p>

          <div className="install">
            <div className="install-row">
              <ClientPicker value={client} onChange={setClient} />
              <InstallCmd client={client} />
            </div>
          </div>

          <div className="hero-meta">
            <div className="meta-cell">
              <div className="meta-num">~340ms</div>
              <div className="meta-lbl">avg. turn check</div>
            </div>
            <div className="meta-cell">
              <div className="meta-num">11×</div>
              <div className="meta-lbl">cheaper than structured coding tools</div>
            </div>
            <div className="meta-cell">
              <div className="meta-num">0-config</div>
              <div className="meta-lbl">drop-in agent hook</div>
            </div>
          </div>
        </div>
        <div>
          <Cuffs />
        </div>
      </div>
    </section>
  );
}
