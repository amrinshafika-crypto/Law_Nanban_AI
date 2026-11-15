import { Link } from 'react-router-dom';
import { Bot, BookOpen, Brain, FileText } from 'lucide-react';
import { Card, PageHeader } from '@/components/ui';

export function AIAssistant() {
  return (
    <>
      <PageHeader title="AI Assistant" subtitle="Choose an authenticated, focused professional AI workflow." />
      <div className="rounded-xl border border-gold-200 bg-gold-50 p-4 mb-5 text-sm text-gold-900">
        Professional AI requests run through a server-side Groq integration after the account's professional role is checked. Research is limited to the reference records supplied to the agent; all outputs need human review.
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <Link to="/app/triage"><Card hover className="p-5 h-full"><Brain size={22} className="text-accent-700" /><h2 className="font-semibold text-navy-900 mt-3">Case triage</h2><p className="text-sm text-navy-500 mt-1">Combine fact-pattern checks with an AI triage analysis.</p></Card></Link>
        <Link to="/app/research"><Card hover className="p-5 h-full"><BookOpen size={22} className="text-accent-700" /><h2 className="font-semibold text-navy-900 mt-3">Legal research</h2><p className="text-sm text-navy-500 mt-1">Retrieve reference records and ask AI to analyze those supplied sources.</p></Card></Link>
        <Link to="/app/documents"><Card hover className="p-5 h-full"><FileText size={22} className="text-accent-700" /><h2 className="font-semibold text-navy-900 mt-3">Document analysis</h2><p className="text-sm text-navy-500 mt-1">Extract document text and run professional AI review.</p></Card></Link>
      </div>
      <div className="mt-6 flex items-start gap-3 text-sm text-navy-500"><Bot size={18} className="mt-0.5 shrink-0" /><p>Drafting is available in the Drafting workspace. Case summaries and strategy are available from each case and the Professional Dashboard. No AI output verifies current law or replaces advocate review.</p></div>
    </>
  );
}
