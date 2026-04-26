import { useState, useRef, useEffect } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import { openGetStarted } from "./clients";
import { BadgeLogo } from "./BadgeLogo";
import { useAuth } from "./auth/useAuth";

export function Nav() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  const initial = user?.email?.[0]?.toUpperCase() ?? "U";

  return (
    <nav className="nav">
      <div className="wrap nav-inner">
        <Link className="brand" to="/">
          <BadgeLogo size={28} title="Code Highway Patrol" />
          <div className="brand-name">Code Highway Patrol</div>
        </Link>
        <div className="nav-links">
          <NavLink to="/" end>About</NavLink>
          <NavLink to="/marketplace">Marketplace</NavLink>
          <NavLink to="/marketplace/new">Contribute</NavLink>
        </div>
        <div className="nav-cta">
          <ThemeToggle />
          {user ? (
            <div className="nav-user" ref={menuRef}>
              <button
                className="nav-avatar"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Account menu"
              >
                {initial}
              </button>
              {menuOpen && (
                <div className="nav-user-menu">
                  <div className="nav-user-email">{user.email}</div>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      navigate("/marketplace/new");
                    }}
                  >
                    Contribute a statue
                  </button>
                  <button
                    onClick={async () => {
                      setMenuOpen(false);
                      await signOut();
                      navigate("/");
                    }}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link className="nav-signin" to="/auth">
              Sign in
            </Link>
          )}
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
