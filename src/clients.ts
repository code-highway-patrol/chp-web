import { cldFetch } from "./cloudinary/config";

export type ClientId =
  | "claude"
  | "codex"
  | "windsurf";

export type Client = {
  id: ClientId;
  label: string;
  icon: string;
  /** First segment renders as the binary, second as the arg, the rest as the
   *  flag/url tail. Lets us mix structured slash commands and one-liners. */
  cmd: string[];
  after?: string[];
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
    id: "windsurf",
    label: "Windsurf",
    icon: favicon("windsurf.com"),
    cmd: [
      "curl",
      "-fsSL",
      "https://raw.githubusercontent.com/code-highway-patrol/chp/main/scripts/install-windsurf.sh",
      "| bash",
    ],
  },
];

export const OPEN_MODAL_EVENT = "chp:open-modal";

export function openGetStarted() {
  window.dispatchEvent(new CustomEvent(OPEN_MODAL_EVENT));
}
