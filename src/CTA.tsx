import { useEffect, useRef, useState } from "react";
import { openGetStarted } from "./clients";

export function CTA() {
  const ref = useRef<HTMLElement>(null);
  const [chasing, setChasing] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setChasing(true);
          obs.disconnect();
        }
      },
      { threshold: 0.25, rootMargin: "0px 0px -10% 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={ref} className="cta" id="cta">
      <div className={"cta-chase" + (chasing ? " is-chasing" : "")} aria-hidden>
        <div className="cta-chase-claude">
          <ClaudeSparkle />
        </div>
        <div className="cta-chase-car">
          <CopCar />
        </div>
      </div>
      <div className="wrap cta-inner">
        <div>
          <span className="eyebrow">sixty seconds</span>
          <h2 style={{ marginTop: 14 }}>
            One check on every turn.
            <br />
            Keep main clean.
          </h2>
          <p
            style={{
              color: "var(--ink-2)",
              fontSize: 16,
              lineHeight: 1.55,
              maxWidth: 520,
              margin: 0,
            }}
          >
            Free, self-hosted, MIT licensed. Drops in as a plugin to whichever
            agent you already use.
          </p>
        </div>
        <div className="cta-actions">
          <a
            className="btn btn-lg"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              openGetStarted();
            }}
          >
            Get started <span className="arrow">→</span>
          </a>
          <a
            className="btn btn-ghost btn-lg"
            href="https://github.com/code-highway-patrol/chp-web"
            target="_blank"
            rel="noreferrer"
          >
            View on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}

function ClaudeSparkle() {
  return (
    <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
      <path
        d="M16 1.5
           C16.7 9.4 16.7 9.4 24.6 10.1
           C29.5 10.5 29.5 10.5 24.6 10.9
           C16.7 11.6 16.7 11.6 16 19.5
           C15.3 11.6 15.3 11.6 7.4 10.9
           C2.5 10.5 2.5 10.5 7.4 10.1
           C15.3 9.4 15.3 9.4 16 1.5 Z"
        fill="#D97757"
        stroke="#1a1612"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <path
        d="M22 18
           C22.4 22.5 22.4 22.5 26.9 22.9
           C22.4 23.3 22.4 23.3 22 27.8
           C21.6 23.3 21.6 23.3 17.1 22.9
           C21.6 22.5 21.6 22.5 22 18 Z"
        fill="#D97757"
        stroke="#1a1612"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CopCar() {
  return (
    <svg width="62" height="30" viewBox="0 0 84 40" fill="none">
      <ellipse cx="42" cy="37" rx="38" ry="2" fill="#000" opacity="0.25" />
      <rect
        x="6"
        y="4"
        width="72"
        height="32"
        rx="6"
        fill="#161616"
        stroke="#f5f5f5"
        strokeWidth="0.8"
      />
      <rect x="6" y="18" width="72" height="4" fill="#f5f5f5" opacity="0.95" />
      <path d="M12 8 L22 11 L22 29 L12 32 Z" fill="#3d4d5e" />
      <path d="M72 8 L62 11 L62 29 L72 32 Z" fill="#3d4d5e" />
      <rect x="32" y="12" width="20" height="16" rx="2" fill="#0a0a0a" />
      <circle className="cta-light cta-light-red" cx="38" cy="20" r="3" fill="#ff2a3c" />
      <circle className="cta-light cta-light-blue" cx="46" cy="20" r="3" fill="#2c66ff" />
      <rect x="26" y="2" width="4" height="3" fill="#161616" />
      <rect x="26" y="35" width="4" height="3" fill="#161616" />
      <rect x="76" y="8" width="3" height="5" rx="1" fill="#fff5b0" />
      <rect x="76" y="27" width="3" height="5" rx="1" fill="#fff5b0" />
      <rect x="5" y="8" width="3" height="5" rx="1" fill="#a02020" />
      <rect x="5" y="27" width="3" height="5" rx="1" fill="#a02020" />
    </svg>
  );
}
