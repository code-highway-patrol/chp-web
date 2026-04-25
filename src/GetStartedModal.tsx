import { useEffect, useState } from "react";
import { ClientPicker } from "./ClientPicker";
import { InstallCmd } from "./InstallCmd";
import { OPEN_MODAL_EVENT, type ClientId } from "./clients";

export function GetStartedModal() {
  const [open, setOpen] = useState(false);
  const [client, setClient] = useState<ClientId>("windsurf");

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(OPEN_MODAL_EVENT, handler);
    return () => window.removeEventListener(OPEN_MODAL_EVENT, handler);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", onKey);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal" onClick={() => setOpen(false)}>
      <div className="modal-bg" />
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button
          className="modal-close"
          onClick={() => setOpen(false)}
          aria-label="Close"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M2 2L12 12M12 2L2 12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div className="modal-card-inner">
          <div className="modal-eyebrow">three steps / sixty seconds</div>
          <h2 className="modal-title">
            Put a check on every
            <br />
            agent turn.
          </h2>

          <ol className="modal-steps">
            <li>
              <span className="modal-step-num">01</span>
              <div>
                <div className="modal-step-title">
                  Pick your agent and run the install
                </div>
                <div className="modal-step-body">
                  CHP installs as a plugin. Pick from the menu and copy the
                  command.
                </div>
                <div className="modal-installer">
                  <ClientPicker value={client} onChange={setClient} />
                  <InstallCmd client={client} />
                </div>
              </div>
            </li>
            <li>
              <span className="modal-step-num">02</span>
              <div>
                <div className="modal-step-title">Tell your agent the rules</div>
                <div className="modal-step-body">
                  Drop a <code className="modal-code">.chprc</code> file at
                  your repo root. Plain English, plain rules.
                </div>
                <pre className="modal-codeblock">{`# .chprc
- no any in TypeScript, ever
- every async fn must have a timeout
- match the existing test style in __tests__/`}</pre>
              </div>
            </li>
            <li>
              <span className="modal-step-num">03</span>
              <div>
                <div className="modal-step-title">Watch it work</div>
                <div className="modal-step-body">
                  Your agent codes. CHP holds every turn at the line, runs the
                  checks, and either signs it through or hands back a fix-it
                  ticket. You will see the verdicts inline.
                </div>
              </div>
            </li>
          </ol>

          <div className="modal-foot">
            <span>free, self-hosted, MIT</span>
            <a
              className="btn btn-ghost"
              href="https://github.com/code-highway-patrol/chp-web"
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
            >
              View on GitHub →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
