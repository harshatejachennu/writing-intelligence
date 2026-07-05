import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Writing Intelligence",
  description: "Technique-level analysis, generation, and critique of writing.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="mx-auto max-w-5xl px-4 py-6">
          <header className="mb-8 flex items-baseline justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
            <a href="/" className="text-lg font-semibold tracking-tight">
              Writing Intelligence
            </a>
            <nav className="flex gap-4 text-sm text-slate-500">
              <a href="/analyze" className="hover:text-slate-900 dark:hover:text-slate-100">
                Analyze
              </a>
              <a href="/generate" className="hover:text-slate-900 dark:hover:text-slate-100">
                Generate
              </a>
              <a href="/critique" className="hover:text-slate-900 dark:hover:text-slate-100">
                Critique
              </a>
              <a href="/compare" className="hover:text-slate-900 dark:hover:text-slate-100">
                Compare
              </a>
              <a href="/inspiration" className="hover:text-slate-900 dark:hover:text-slate-100">
                Inspiration
              </a>
              <a href="/library" className="hover:text-slate-900 dark:hover:text-slate-100">
                Library
              </a>
              <a href="/corpus" className="hover:text-slate-900 dark:hover:text-slate-100">
                Corpus
              </a>
              <a href="/voice" className="hover:text-slate-900 dark:hover:text-slate-100">
                Voice
              </a>
              <a href="/history" className="hover:text-slate-900 dark:hover:text-slate-100">
                History
              </a>
              <a href="/dataset" className="hover:text-slate-900 dark:hover:text-slate-100">
                Dataset
              </a>
              <a href="/settings" className="hover:text-slate-900 dark:hover:text-slate-100">
                Settings
              </a>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
