import { BadgeLogo } from "./BadgeLogo";
import { GithubMark } from "./GithubMark";

export function Footer() {
  return (
    <footer className="f">
      <div
        className="wrap f-bottom"
        style={{ borderTop: "none", paddingTop: 32 }}
      >
        <a
          className="brand"
          href="https://github.com/code-highway-patrol/chp"
          target="_blank"
          rel="noreferrer"
        >
          <BadgeLogo size={28} title="Code Highway Patrol" />
          <div className="brand-name">Code Highway Patrol</div>
        </a>
        <div className="f-made">
          <span className="f-made-label">made for</span>
          <a
            className="f-cognition"
            href="https://cognition.ai"
            target="_blank"
            rel="noreferrer"
            aria-label="Cognition"
          >
            <img src="/cognition.svg" alt="" width="20" height="20" />
            <span>Cognition</span>
          </a>
          <span className="f-made-label">at</span>
          <a
            className="f-made-link"
            href="https://lahacks.com"
            target="_blank"
            rel="noreferrer"
          >
            LA Hacks
          </a>
          <span className="f-made-label">·</span>
          <a
            className="f-ucla-link"
            href="https://www.ucla.edu"
            target="_blank"
            rel="noreferrer"
            aria-label="UCLA"
          >
            <img src="/ucla.svg" alt="UCLA" width="56" height="18" />
          </a>
        </div>
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          <a
            href="https://github.com/code-highway-patrol/chp"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
            style={{
              color: "var(--ink-2)",
              fontSize: 13,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <GithubMark size={14} />
            GitHub
          </a>
          <span style={{ color: "var(--ink-3)", fontSize: 12 }}>MIT</span>
        </div>
      </div>
    </footer>
  );
}
