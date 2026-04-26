import rawResults from "./virustotal-results.json";
import { cldFetch } from "../cloudinary/config";

type ScanStats = {
  malicious: number;
  suspicious: number;
  harmless: number;
  undetected: number;
  timeout: number;
};
type ScanRecord = {
  slug: string;
  sha256: string;
  contentHash: string;
  scannedAt: string;
  stats: ScanStats;
  permalink: string;
};

const RESULTS = rawResults as Record<string, ScanRecord>;

function findRecord(slug: string): ScanRecord | null {
  for (const v of Object.values(RESULTS)) {
    if (v.slug === slug) return v;
  }
  return null;
}

function verdict(stats: ScanStats) {
  const total =
    stats.malicious + stats.suspicious + stats.harmless + stats.undetected + stats.timeout;
  const flagged = stats.malicious + stats.suspicious;
  if (flagged === 0) return { kind: "clean" as const, total, flagged };
  return { kind: "flagged" as const, total, flagged };
}

const VT_LOGO = cldFetch(
  "https://www.google.com/s2/favicons?domain=virustotal.com&sz=128",
);

export function VirusTotalBadge({
  slug,
  variant = "card",
}: {
  slug: string;
  variant?: "card" | "detail";
}) {
  const rec = findRecord(slug);
  if (!rec) return null;
  const v = verdict(rec.stats);
  const label =
    v.kind === "clean"
      ? `clean · ${v.total} engines`
      : `${v.flagged}/${v.total} flagged`;
  const className =
    "vt-badge vt-badge-" + variant + (v.kind === "clean" ? " vt-clean" : " vt-flagged");
  // The card is itself a <Link>, so we can't nest an <a>. Use a button +
  // window.open so a click opens VirusTotal in a new tab without navigating
  // the card's parent link.
  return (
    <button
      type="button"
      className={className}
      title={`VirusTotal scanned ${new Date(rec.scannedAt).toLocaleDateString()} — ${label}`}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        window.open(rec.permalink, "_blank", "noopener,noreferrer");
      }}
    >
      <img className="vt-badge-logo" src={VT_LOGO} alt="VirusTotal" />
      <span className="vt-badge-text">
        {variant === "detail" && <span className="vt-prefix">Virus Scan</span>}
        {v.kind === "clean" ? (
          <>
            <span className="vt-check" aria-hidden>
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 8.5l3.5 3.5L13 5" />
              </svg>
            </span>
            <span className="vt-label">clean</span>
            <span className="vt-count">
              {variant === "detail" ? `${v.total} engines` : v.total}
            </span>
          </>
        ) : (
          <>
            <span className="vt-label">{v.flagged} flagged</span>
            <span className="vt-count">/{v.total}</span>
          </>
        )}
      </span>
    </button>
  );
}
