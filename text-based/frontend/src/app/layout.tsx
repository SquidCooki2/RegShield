import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'RegShield',
  description: 'Automated compliance onboarding and review',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col bg-[#0b0f17] text-slate-200">
        {/* Sleek Top Bar */}
        <header className="sticky top-0 z-50 bg-[#0b0f17]/95 backdrop-blur-sm border-b border-slate-800/80 px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            {/* Logo without compliance OS */}
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded bg-slate-100 text-slate-900 font-bold flex items-center justify-center text-xs tracking-tight">
                RS
              </div>
              <span className="font-semibold text-sm tracking-tight text-white">RegShield</span>
            </Link>

            {/* Clean Segmented Nav */}
            <nav className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-md border border-slate-800 text-xs font-medium">
              <Link
                href="/advisor"
                className="px-3 py-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
              >
                Advisor Intake
              </Link>
              <div className="w-px h-3.5 bg-slate-800" />
              <Link
                href="/reviewer"
                className="px-3 py-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
              >
                Reviewer Queue
              </Link>
            </nav>
          </div>
        </header>

        {/* Workspace Body */}
        <main className="flex-1 flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
