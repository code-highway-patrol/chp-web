import { useEffect, useRef, useState } from "react";
import { openGetStarted } from "./clients";
import { cldFetch } from "./cloudinary/config";
import { GithubMark } from "./GithubMark";

const AI_LOGOS = [
  { name: "Claude", url: cldFetch("https://www.google.com/s2/favicons?domain=claude.ai&sz=128") },
  { name: "ChatGPT", url: cldFetch("https://www.google.com/s2/favicons?domain=openai.com&sz=128") },
  { name: "Gemini", url: cldFetch("https://www.google.com/s2/favicons?domain=gemini.google.com&sz=128") },
  { name: "Grok", url: cldFetch("https://www.google.com/s2/favicons?domain=x.ai&sz=128") },
];

export function CTA() {
  const ref = useRef<HTMLElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);
  const [chasing, setChasing] = useState(false);
  const [logoIdx, setLogoIdx] = useState(0);

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

  useEffect(() => {
    if (!chasing) return;
    const el = targetRef.current;
    if (!el) return;
    const onIter = (e: AnimationEvent) => {
      if (e.animationName === "cta-chase-run") {
        setLogoIdx((i) => (i + 1) % AI_LOGOS.length);
      }
    };
    el.addEventListener("animationiteration", onIter);
    return () => el.removeEventListener("animationiteration", onIter);
  }, [chasing]);

  const current = AI_LOGOS[logoIdx];

  return (
    <section ref={ref} className="cta" id="cta">
      <div className={"cta-chase" + (chasing ? " is-chasing" : "")} aria-hidden>
        <div className="cta-chase-target" ref={targetRef}>
          <img
            key={current.name}
            className="cta-chase-logo"
            src={current.url}
            alt=""
            width={32}
            height={32}
          />
        </div>
        <div className="cta-chase-car">
          <span className="cta-chase-glow" aria-hidden />
          <span className="cta-chase-trail" aria-hidden />
          <CopCar />
        </div>
      </div>
      <div className="wrap cta-inner">
        <div>
          <h2>
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
        <div className="cta-actions cta-actions-stack">
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
            href="https://github.com/code-highway-patrol/chp"
            target="_blank"
            rel="noreferrer"
          >
            <GithubMark size={16} className="gh-icon" />
            View on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}

function CopCar() {
  return (
    <svg width="84" height="40" viewBox="0 0 84 40" fill="none">
      <ellipse cx="42" cy="38" rx="38" ry="1.8" fill="#000" opacity="0.4" />
      <rect
        x="6"
        y="4"
        width="72"
        height="32"
        rx="6"
        fill="#f7f5f1"
        stroke="#0a0907"
        strokeWidth="1.4"
      />
      <path
        d="M62 4 L72 4 Q78 4 78 10 L78 30 Q78 36 72 36 L62 36 Z"
        fill="#0d0a07"
      />
      <path
        d="M22 4 L12 4 Q6 4 6 10 L6 30 Q6 36 12 36 L22 36 Z"
        fill="#0d0a07"
      />
      <rect x="22" y="18" width="40" height="4" fill="#e89a3c" />
      <path d="M62 8 L56 12 L56 28 L62 32 Z" fill="#2f3d4e" />
      <path d="M22 8 L28 12 L28 28 L22 32 Z" fill="#2f3d4e" />
      <line
        x1="42"
        y1="11"
        x2="42"
        y2="29"
        stroke="#7a7368"
        strokeWidth="0.6"
        opacity="0.7"
      />
      <rect x="32" y="12" width="20" height="16" rx="2" fill="#050403" />
      <circle
        className="cta-light cta-light-red"
        cx="38"
        cy="20"
        r="7"
        fill="#ff2a3c"
        opacity="0.32"
      />
      <circle
        className="cta-light cta-light-red"
        cx="38"
        cy="20"
        r="3.6"
        fill="#ff5060"
      />
      <circle
        className="cta-light cta-light-blue"
        cx="46"
        cy="20"
        r="7"
        fill="#2c66ff"
        opacity="0.32"
      />
      <circle
        className="cta-light cta-light-blue"
        cx="46"
        cy="20"
        r="3.6"
        fill="#5a8aff"
      />
      <rect x="54" y="1.5" width="4" height="3.5" rx="0.6" fill="#0d0a07" />
      <rect x="54" y="35" width="4" height="3.5" rx="0.6" fill="#0d0a07" />
      <rect x="76" y="9" width="2.5" height="4" rx="0.8" fill="#fff5b0" />
      <rect x="76" y="27" width="2.5" height="4" rx="0.8" fill="#fff5b0" />
      <rect x="5.5" y="9" width="2.5" height="4" rx="0.8" fill="#a02020" />
      <rect x="5.5" y="27" width="2.5" height="4" rx="0.8" fill="#a02020" />
    </svg>
  );
}
