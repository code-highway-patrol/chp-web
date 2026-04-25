import { ThemeToggle } from "./ThemeToggle";
import { openGetStarted } from "./clients";
import { BadgeLogo } from "./BadgeLogo";

export function Nav() {
  return (
    <nav className="nav">
      <div className="wrap nav-inner">
        <a className="brand" href="#">
          <BadgeLogo size={28} title="Code Highway Patrol" />
          <div className="brand-name">Code Highway Patrol</div>
        </a>
        <div className="nav-links" />
        <div className="nav-cta">
          <ThemeToggle />
          <a
            className="btn"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              openGetStarted();
            }}
          >
            Get started <span className="arrow">→</span>
          </a>
        </div>
      </div>
    </nav>
  );
}
