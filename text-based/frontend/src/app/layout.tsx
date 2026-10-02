import './globals.css';
import Link from 'next/link';
import { Shield, UserCheck, Briefcase, FileText } from 'lucide-react';

export const metadata = {
  title: 'RegShield | AI Compliance Automation for Wealth Management',
  description: 'Instant document synthesis and 4-bucket regulatory review powered by AWS Bedrock',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-slate-900 text-slate-100 selection:bg-cyan-500 selection:text-white">
        {/* Navigation Bar */}
        <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur border-b border-slate-800 px-6 py-3.5 shadow-sm">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg tracking-tight text-white">Reg<span className="text-cyan-400">Shield</span></span>
                  <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">AWS Bedrock Core</span>
                </div>
                <p className="text-xs text-slate-400">Autonomous Compliance &amp; Onboarding OS</p>
              </div>
            </Link>

            <nav className="flex items-center gap-2 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 text-sm font-medium">
              <Link
                href="/advisor"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/70 transition-all active:scale-95"
              >
                <Briefcase className="w-4 h-4 text-cyan-400" />
                <span>Advisor Portal</span>
              </Link>
              <div className="w-px h-5 bg-slate-700 mx-1" />
              <Link
                href="/reviewer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/70 transition-all active:scale-95"
              >
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span>Back-Office Reviewer</span>
              </Link>
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
