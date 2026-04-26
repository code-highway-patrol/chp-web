import { Link } from "react-router-dom";

export function NewStatuePage() {
  return (
    <main className="new-statue">
      <div className="wrap">
        <Link to="/marketplace" className="detail-back">
          ← marketplace
        </Link>
        <h1 className="detail-title">Contribute a statue</h1>
        <p className="market-sub" style={{ maxWidth: 640 }}>
          The marketplace is a static catalog bundled with the
          site — there is no server database. Each entry is a JSON object in{" "}
          <code>src/marketplace/statues.json</code> with the same fields you
          would keep on disk under{" "}
          <code>docs/chp/laws/&lt;name&gt;/</code>:{" "}
          <code>guidance.md</code>-style markdown in <code>body</code>, and the
          law definition in <code>lawJson</code> (stringified JSON object).
        </p>
        <ol className="market-sub" style={{ maxWidth: 640, lineHeight: 1.6 }}>
          <li>
            Add an object to the array in{" "}
            <code>src/marketplace/statues.json</code> (copy an existing entry
            and change <code>slug</code>, <code>title</code>,{" "}
            <code>body</code>, <code>lawJson</code>, <code>tags</code>, etc.).
          </li>
          <li>
            Keep <code>slug</code> URL-safe and unique; it becomes{" "}
            <code>/marketplace/&lt;slug&gt;</code>.
          </li>
          <li>Run the app or build to verify the new card and detail page.</li>
          <li>Open a pull request with your changes.</li>
        </ol>
        <p className="market-sub" style={{ maxWidth: 640 }}>
          Stars on a detail page are saved only in this browser&apos;s{" "}
          <code>localStorage</code> (bookmarks), not synced to a server.
        </p>
      </div>
    </main>
  );
}
