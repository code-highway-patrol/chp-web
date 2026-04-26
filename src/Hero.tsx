import { useState } from "react";
import { ClientPicker } from "./ClientPicker";
import { InstallCmd } from "./InstallCmd";
import { Donut } from "./Donut";
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
            CHP runs your codebase rules against every change your AI
            agent proposes, before it lands.
          </p>

          <div className="install">
            <div className="install-row">
              <ClientPicker value={client} onChange={setClient} />
              <InstallCmd client={client} />
            </div>
          </div>

        </div>
        <div><Donut /></div>
      </div>
    </section>
  );
}
