import { StaffShell } from "@/components/staff-shell";
import { AI_SOURCE_LABELS, type AiVisitSource } from "@/lib/ai-traffic";
import { loadAiInsights } from "@/lib/ai-visibility-data";
import { requireStaffSession } from "@/lib/staff-auth";
import "@/app/staff-ai.css";

export const dynamic = "force-dynamic";

const dateTime = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Bangkok",
});

const dateOnly = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "Asia/Bangkok",
});

function sourceLabel(source: string) {
  return AI_SOURCE_LABELS[source as AiVisitSource] ?? source;
}

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

export default async function StaffAiSearchPage() {
  await requireStaffSession();
  const insights = await loadAiInsights(30);
  const { visits, checks, guests } = insights;
  const answerTotal = visits.bySource.reduce((sum, row) => sum + row.answer, 0);
  const referralTotal = visits.bySource.reduce((sum, row) => sum + row.referral, 0);

  return (
    <StaffShell current="ai">
      <section className="staff-main staff-ai" aria-labelledby="staff-ai-title">
        <div className="staff-header staff-header--compact">
          <div>
            <h1 id="staff-ai-title">AI search</h1>
            <p>
              How ChatGPT and other assistants find the guesthouse. AI companies do not
              share what people type, so this combines three signals: their visits to the
              site, a regular test of likely questions, and what guests tell us at checkout.
            </p>
          </div>
        </div>

        {!insights.ready ? (
          <p className="form-message form-message--setup" role="status">
            Add Supabase environment variables to see AI search data.
          </p>
        ) : null}

        <section className="staff-ai__panel" aria-labelledby="staff-ai-visits">
          <header className="staff-ai__panel-header">
            <h2 id="staff-ai-visits">Assistants on the site</h2>
            <span>Last {insights.days} days</span>
          </header>
          <p className="staff-ai__lede">
            {answerTotal === 0 && referralTotal === 0
              ? "No assistant answers or click-throughs recorded yet. Visits are logged from now on."
              : `${plural(answerTotal, "time", "times")} an assistant read a page to answer someone's question, and ${plural(referralTotal, "guest", "guests")} clicked through from an answer.`}
          </p>

          {visits.bySource.length > 0 ? (
            <table className="staff-ai__table">
              <thead>
                <tr>
                  <th scope="col">Assistant</th>
                  <th scope="col">Answered a question</th>
                  <th scope="col">Guests clicked through</th>
                  <th scope="col">Search index crawls</th>
                  <th scope="col">Training crawls</th>
                </tr>
              </thead>
              <tbody>
                {visits.bySource.map((row) => (
                  <tr key={row.source}>
                    <th scope="row">{sourceLabel(row.source)}</th>
                    <td>{row.answer}</td>
                    <td>{row.referral}</td>
                    <td>{row.index}</td>
                    <td>{row.training}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          <div className="staff-ai__columns">
            <div>
              <h3>Pages read to answer questions</h3>
              <p className="staff-ai__hint">The page tells you what was asked: /location means a location question.</p>
              {visits.answerPages.length > 0 ? (
                <ol className="staff-ai__list">
                  {visits.answerPages.map((page) => (
                    <li key={page.path}>
                      <code>{page.path}</code>
                      <span>{page.count}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="staff-ai__empty">None yet.</p>
              )}
            </div>
            <div>
              <h3>Where click-throughs landed</h3>
              <p className="staff-ai__hint">Guests who followed a link in an assistant&apos;s answer.</p>
              {visits.referralPages.length > 0 ? (
                <ol className="staff-ai__list">
                  {visits.referralPages.map((page) => (
                    <li key={page.path}>
                      <code>{page.path}</code>
                      <span>{page.count}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="staff-ai__empty">None yet.</p>
              )}
            </div>
          </div>

          {visits.recent.length > 0 ? (
            <details className="staff-ai__details">
              <summary>Recent activity ({visits.recent.length})</summary>
              <ul className="staff-ai__recent">
                {visits.recent.map((visit) => (
                  <li key={`${visit.at}-${visit.path}`}>
                    <time dateTime={visit.at}>{dateTime.format(new Date(visit.at))}</time>
                    <span>
                      {sourceLabel(visit.source)}{" "}
                      {visit.kind === "answer" ? "read" : "sent a guest to"}{" "}
                      <code>{visit.path}</code>
                      {visit.country ? ` · ${visit.country}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </section>

        <section className="staff-ai__panel" aria-labelledby="staff-ai-checks">
          <header className="staff-ai__panel-header">
            <h2 id="staff-ai-checks">Question test</h2>
            <span>
              {checks.mentionRate === null
                ? "Not run yet"
                : `Named in ${checks.mentionRate}% of answers`}
            </span>
          </header>
          <p className="staff-ai__lede">
            Each day a few likely traveller questions are asked through OpenAI&apos;s web
            search, so every question is retested about once a week.
            {checks.neverChecked > 0
              ? ` ${plural(checks.neverChecked, "question has", "questions have")} not been tested yet.`
              : ""}
          </p>

          {checks.latest.length > 0 ? (
            <ul className="staff-ai__checks">
              {checks.latest.map((check) => (
                <li key={check.prompt}>
                  <span
                    className={`staff-ai__badge staff-ai__badge--${check.error ? "error" : check.cited ? "cited" : check.mentioned ? "named" : "missing"}`}
                  >
                    {check.error
                      ? "Failed"
                      : check.cited
                        ? "Linked"
                        : check.mentioned
                          ? "Named"
                          : "Not named"}
                  </span>
                  <div>
                    <p className="staff-ai__prompt">{check.prompt}</p>
                    <p className="staff-ai__meta">
                      Tested {dateOnly.format(new Date(check.checkedAt))}
                      {check.error ? ` · ${check.error}` : ""}
                    </p>
                    {check.mentioned && check.excerpt ? (
                      <p className="staff-ai__excerpt">{check.excerpt}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          {checks.topDomains.length > 0 ? (
            <>
              <h3>Sources the answers relied on</h3>
              <p className="staff-ai__hint">
                Strong listings and reviews on these sites make the guesthouse more likely to
                be recommended.
              </p>
              <ol className="staff-ai__list staff-ai__list--inline">
                {checks.topDomains.map((entry) => (
                  <li key={entry.domain}>
                    <code>{entry.domain}</code>
                    <span>{entry.count}</span>
                  </li>
                ))}
              </ol>
            </>
          ) : null}
        </section>

        <section className="staff-ai__panel" aria-labelledby="staff-ai-guests">
          <header className="staff-ai__panel-header">
            <h2 id="staff-ai-guests">What guests told us</h2>
            <span>{plural(guests.totalAnswered, "answer", "answers")}</span>
          </header>
          <p className="staff-ai__lede">
            From the optional &ldquo;How did you find us?&rdquo; question at checkout.
          </p>
          {guests.counts.length > 0 ? (
            <ol className="staff-ai__list">
              {guests.counts.map((entry) => (
                <li key={entry.label}>
                  <span>{entry.label}</span>
                  <span>{entry.count}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="staff-ai__empty">No answers yet.</p>
          )}
          {guests.answers.length > 0 ? (
            <>
              <h3>In their words</h3>
              <ul className="staff-ai__recent">
                {guests.answers.map((answer) => (
                  <li key={`${answer.at}-${answer.detail}`}>
                    <time dateTime={answer.at}>{dateOnly.format(new Date(answer.at))}</time>
                    <span>
                      {answer.label}: &ldquo;{answer.detail}&rdquo;
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>
      </section>
    </StaffShell>
  );
}
