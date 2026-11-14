import { Link } from 'react-router-dom';
import { Bot, BookOpen, Brain, FileText } from 'lucide-react';
import { Card, PageHeader } from '@/components/ui';

export function AIAssistant() {
  return (
    <>
      <PageHeader title="AI Assistant" subtitle="Choose a focused, transparent analysis tool." />
      <div className="rounded-xl border border-gold-200 bg-gold-50 p-4 mb-5 text-sm text-gold-900">
        This project does not currently provide a general conversational AI service. The available tools use local rule-based analysis or retrieve the reference records already in the database; their output needs human review.
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <Link to="/app/triage"><Card hover className="p-5 h-full"><Brain size={22} className="text-accent-700" /><h2 className="font-semibold text-navy-900 mt-3">Case triage</h2><p className="text-sm text-navy-500 mt-1">Review heuristic category and urgency indicators from a description.</p></Card></Link>
        <Link to="/app/research"><Card hover className="p-5 h-full"><BookOpen size={22} className="text-accent-700" /><h2 className="font-semibold text-navy-900 mt-3">Reference search</h2><p className="text-sm text-navy-500 mt-1">Retrieve keyword matches from the available legal-reference database.</p></Card></Link>
        <Link to="/app/documents"><Card hover className="p-5 h-full"><FileText size={22} className="text-accent-700" /><h2 className="font-semibold text-navy-900 mt-3">Document text review</h2><p className="text-sm text-navy-500 mt-1">Extract text and view pattern-based summaries in your browser.</p></Card></Link>
      </div>
      <div className="mt-6 flex items-start gap-3 text-sm text-navy-500"><Bot size={18} className="mt-0.5 shrink-0" /><p>No AI agent makes autonomous legal decisions, verifies current law, or provides legal advice through this page.</p></div>
    </>
  );
}
