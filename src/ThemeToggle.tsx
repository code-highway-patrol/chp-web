import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

function readStored(): Theme {
  if (typeof document === "undefined") return "system";
  const stored = localStorage.getItem("chp-theme");
  return stored === "light" || stored === "dark" ? stored : "system";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(readStored);

  useEffect(() => {
    const body = document.body;
    body.classList.remove("light", "dark");
    if (theme === "light") body.classList.add("light");
    if (theme === "dark") body.classList.add("dark");
    if (theme === "system") localStorage.removeItem("chp-theme");
    else localStorage.setItem("chp-theme", theme);
  }, [theme]);

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <button
      className="theme-toggle"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <svg className="moon" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d="M13 9.5A5 5 0 0 1 6.5 3a.5.5 0 0 0-.74-.55A6 6 0 1 0 13.55 10.24.5.5 0 0 0 13 9.5Z"
          fill="currentColor"
        />
      </svg>
      <svg className="sun" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="3" fill="currentColor" />
        <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
          <path d="M8 1.5v1.7M8 12.8v1.7M1.5 8h1.7M12.8 8h1.7M3.4 3.4l1.2 1.2M11.4 11.4l1.2 1.2M3.4 12.6l1.2-1.2M11.4 4.6l1.2-1.2" />
        </g>
      </svg>
    </button>
  );
}
