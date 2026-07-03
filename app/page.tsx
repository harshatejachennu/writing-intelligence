export default function Home() {
  return (
    <main className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold">Writing Intelligence</h1>
        <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-400">
          A workbench that treats good writing as a set of transferable functions.
          Phase 1 ships the <strong>Passage Analyzer</strong>: paste any passage and get a
          structured, evidence-cited breakdown of how it works.
        </p>
      </section>

      <section className="rounded-lg border border-slate-200 p-5 dark:border-slate-800">
        <h2 className="font-medium">Manual Mode is the default</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          No API key required. The app renders the exact prompt; you paste it into
          Claude, ChatGPT, or Gemini, then paste the reply back. It is validated against
          the same schema an API call would use and saved identically. Add an API key later
          to run any step automatically.
        </p>
        <a
          href="/analyze"
          className="mt-4 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          Analyze a passage →
        </a>
      </section>
    </main>
  );
}
