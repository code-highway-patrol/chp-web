import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const principles = [
  {
    title: "No noise",
    body: "Emoji, banner comments, and AI-tell phrases get stripped before they hit the diff. The code looks like a senior engineer wrote it because it had to.",
  },
  {
    title: "No speculation",
    body: "Premature abstractions, unreachable error paths, and feature-flag scaffolding are flagged at review time. Three similar lines beats a factory you don't need yet.",
  },
  {
    title: "Strict by default",
    body: "Project conventions live in CLAUDE.md, skills, and hooks — not in a wiki nobody reads. The agent is held to the same bar as the humans on the PR.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-24 px-6 py-20 sm:px-10 sm:py-28">
      <section className="flex flex-col gap-6">
        <p className="text-muted-foreground font-mono text-sm tracking-tight uppercase">
          Code Highway Patrol
        </p>
        <h1 className="max-w-2xl text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
          Production-grade conventions, enforced on every line of AI-generated code.
        </h1>
        <p className="text-muted-foreground max-w-2xl text-lg leading-relaxed">
          CHP is the layer between your AI coding agent and your main branch. It catches the things
          linters miss: emoji noise, half-finished diffs, speculative abstractions, and copy that
          screams &ldquo;a model wrote this.&rdquo;
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="#principles" className={buttonVariants({ size: "lg" })}>
            See what it catches
          </Link>
          <Link
            href="https://github.com/code-highway-patrol"
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ size: "lg", variant: "outline" })}
          >
            GitHub
          </Link>
        </div>
      </section>

      <section id="principles" className="flex flex-col gap-8">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          What the patrol enforces
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {principles.map((p) => (
            <Card key={p.title}>
              <CardHeader>
                <CardTitle>{p.title}</CardTitle>
                <CardDescription>{p.body}</CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-border text-muted-foreground mt-auto flex items-center justify-between border-t pt-6 text-sm">
        <span>Code Highway Patrol</span>
        <Link
          href="https://github.com/code-highway-patrol/chp-web"
          className="hover:text-foreground transition-colors"
          target="_blank"
          rel="noreferrer"
        >
          chp-web on GitHub
        </Link>
      </footer>
    </main>
  );
}
