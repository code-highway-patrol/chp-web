import { Link } from "react-router-dom";

export function NewStatuePage() {
  return (
    <main className="new-statue">
      <div className="wrap">
        <Link to="/marketplace" className="detail-back">
          ← marketplace
        </Link>
        <h1 className="detail-title">Contribute a statue</h1>
        <p className="market-sub" style={{ maxWidth: 720 }}>
          The marketplace is a static catalog bundled with the site — there is
          no server database. Each entry is a JSON object in{" "}
          <code>src/marketplace/statues.json</code>. Statues come in two
          shapes; pick whichever fits.
        </p>

        <h2
          className="market-sub"
          style={{ maxWidth: 720, marginTop: 24, fontSize: 18, color: "var(--ink)" }}
        >
          Single law
        </h2>
        <p className="market-sub" style={{ maxWidth: 720 }}>
          Use this for one rule. Mirrors the on-disk layout of a single CHP law
          folder.
        </p>
        <pre className="modal-codeblock" style={{ maxWidth: 720 }}>{`{
  "slug": "no-eval",
  "title": "Block eval()",
  "tags": ["security", "javascript"],
  "authorName": "you",
  "authorId": "gh:you",
  "createdAt": "2026-04-25T00:00:00Z",
  "stars": 0,
  "body": "- Never call eval()\\n- Use JSON.parse for data, function refs for dispatch",
  "lawJson": "{\\n  \\"name\\": \\"no-eval\\",\\n  \\"severity\\": \\"error\\",\\n  \\"hooks\\": [\\"pre-tool\\"],\\n  \\"enabled\\": true\\n}"
}`}</pre>

        <h2
          className="market-sub"
          style={{ maxWidth: 720, marginTop: 24, fontSize: 18, color: "var(--ink)" }}
        >
          Law pack (multiple laws)
        </h2>
        <p className="market-sub" style={{ maxWidth: 720 }}>
          Use this when the rules are related and ship together. The detail
          page renders <code>files[]</code> as a GitHub-style file tree. Each
          law is a folder with the same three files CHP keeps on disk:{" "}
          <code>law.json</code>, <code>verify.sh</code>, and{" "}
          <code>guidance.md</code>.
        </p>
        <pre className="modal-codeblock" style={{ maxWidth: 720 }}>{`{
  "slug": "programming-best-practices",
  "title": "Programming Best Practices",
  "description": "Concrete CHP laws for JS/TS",
  "tags": ["javascript", "typescript"],
  "authorName": "dereknguyen269",
  "authorId": "gh:dereknguyen269",
  "createdAt": "2026-04-25T00:00:00Z",
  "stars": 0,
  "files": [
    { "path": "no-eval/law.json", "content": "{...}", "size": 312 },
    { "path": "no-eval/guidance.md", "content": "# no-eval...", "size": 540 },
    { "path": "no-eval/verify.sh", "content": "#!/usr/bin/env bash...", "size": 220 }
  ],
  "laws": [
    { "name": "no-eval", "hooks": ["pre-commit","pre-tool"], "severity": "error",
      "intent": "Block eval() — arbitrary code exec risk." }
  ]
}`}</pre>

        <ol
          className="market-sub"
          style={{ maxWidth: 720, lineHeight: 1.6, marginTop: 16 }}
        >
          <li>
            Add an object to the array in{" "}
            <code>src/marketplace/statues.json</code>.
          </li>
          <li>
            Keep <code>slug</code> URL-safe and unique; it becomes{" "}
            <code>/marketplace/&lt;slug&gt;</code>.
          </li>
          <li>
            For law packs, every <code>law.json</code> must have its{" "}
            <code>name</code> field match the folder name in its{" "}
            <code>path</code>.
          </li>
          <li>Run the app or build to verify the new card and detail page.</li>
          <li>Open a pull request with your changes.</li>
        </ol>
        <p className="market-sub" style={{ maxWidth: 720 }}>
          Stars on a detail page are saved only in this browser&apos;s{" "}
          <code>localStorage</code> (bookmarks), not synced to a server.
        </p>
      </div>
    </main>
  );
}
