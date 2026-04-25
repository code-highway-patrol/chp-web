import { cldFetch } from "./cloudinary/config";

export type ClientId =
  | "claude"
  | "codex"
  | "cursor"
  | "windsurf"
  | "antigravity";

export type Client = {
  id: ClientId;
  label: string;
  icon: string;
  cmd: [string, string, string];
  after?: [string, string, string];
};

const favicon = (domain: string) =>
  cldFetch(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`);

export const CLIENTS: Client[] = [
  {
    id: "claude",
    label: "Claude Code",
    icon: favicon("claude.ai"),
    cmd: ["/plugin", "marketplace add", "chp-labs/chp"],
    after: ["/plugin", "install", "chp@chp-labs"],
  },
  {
    id: "codex",
    label: "Codex",
    icon: favicon("openai.com"),
    cmd: ["codex", "plugin marketplace add", "chp-labs/chp"],
    after: ["codex", "plugin install", "chp@chp-labs"],
  },
  {
    id: "cursor",
    label: "Cursor",
    icon: favicon("cursor.com"),
    cmd: ["cursor", "--install-extension", "chp-labs.chp"],
  },
  {
    id: "windsurf",
    label: "Windsurf",
    icon: favicon("windsurf.com"),
    cmd: ["windsurf", "--install-extension", "chp-labs.chp"],
  },
  {
    id: "antigravity",
    label: "Antigravity",
    icon: favicon("antigravity.google"),
    cmd: ["antigravity", "plugin install", "chp-labs/chp"],
  },
];

export const OPEN_MODAL_EVENT = "chp:open-modal";

export function openGetStarted() {
  window.dispatchEvent(new CustomEvent(OPEN_MODAL_EVENT));
}
