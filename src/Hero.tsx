import { useState } from "react";
import { ClientPicker } from "./ClientPicker";
import { InstallCmd } from "./InstallCmd";
import { Cuffs } from "./Cuffs";
import { Donut } from "./Donut";
import type { ClientId } from "./clients";

export function Hero() {
  const [client, setClient] = useState<ClientId>("windsurf");
  const [showDonut] = useState(() => Math.random() < 0.5);

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
            CHP enforces your codebase rules on every agent turn with
            heuristic and programmatic checks at the line.
          </p>

          <div className="install">
            <div className="install-row">
              <ClientPicker value={client} onChange={setClient} />
              <InstallCmd client={client} />
            </div>
          </div>

        </div>
        <div>{showDonut ? <Donut /> : <Cuffs />}</div>
      </div>
    </section>
  );
}
