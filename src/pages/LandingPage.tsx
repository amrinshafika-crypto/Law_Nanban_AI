import { Link } from 'react-router-dom';
import { Scale, Brain, FileText, BookOpen, HeartHandshake, Calendar, Bot, ShieldCheck, ArrowRight, ScaleIcon } from 'lucide-react';
import { Logo } from '@/components/Logo';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-navy-50">
      {/* Nav */}
      <header className="sticky top-0 z-30 glass border-b border-navy-100">
        <div className="max-w-6xl mx-auto px-4 lg:px-6 h-16 flex items-center justify-between">
          <Logo size={36} />
          <div className="flex items-center gap-3">
            <Link to="/portal" className="btn-ghost text-sm">Citizen Portal</Link>
            <Link to="/signin" className="btn-primary text-sm">Sign in</Link>
            <Link to="/signup" className="btn-gold text-sm">Get started</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-navy-900 text-white">
        <div className="absolute inset-0 bg-grid-pattern bg-[length:32px_32px] opacity-20" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-4 lg:px-6 py-20 lg:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-xs font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse-soft" />
              Bharat Agentic AI Hackathon 2026 · Timely Justice
            </div>
            <h1 className="font-serif text-4xl lg:text-5xl font-semibold tracking-tight leading-[1.1]">
              Justice through <span className="text-gold-400">Intelligence.</span>
              <br />Access to justice for everyone.
            </h1>
            <p className="mt-5 text-lg text-navy-200 leading-relaxed max-w-2xl">
              Law Nanban AI coordinates specialised AI agents to reduce legal case backlogs,
              organise court workflows, and make legal assistance accessible to every citizen —
              in Tamil and English.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/signup" className="btn-gold text-base px-6 py-3">
                Get started <ArrowRight size={18} />
              </Link>
              <Link to="/portal" className="btn text-base px-6 py-3 bg-white/10 text-white hover:bg-white/20">
                Citizen Portal
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Two experiences */}
      <section className="max-w-6xl mx-auto px-4 lg:px-6 py-16 lg:py-20">
        <div className="text-center mb-12">
          <h2 className="font-serif text-3xl font-semibold text-navy-900">Two ways to use Law Nanban</h2>
          <p className="text-navy-500 mt-2">Choose the experience that fits your needs.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <Link to="/signup" className="card card-hover p-8 group">
            <div className="w-14 h-14 rounded-xl bg-navy-100 flex items-center justify-center mb-4">
              <Scale className="text-navy-700" size={28} />
            </div>
            <h3 className="font-serif text-xl font-semibold text-navy-900">For Legal Professionals</h3>
            <p className="text-sm text-navy-500 mt-2 mb-4">
              Case management, AI-powered triage, document intelligence, legal research,
              hearing scheduling, and analytics — all in one workspace.
            </p>
            <ul className="space-y-2 text-sm text-navy-600">
              {['Smart case triage with explainable priority', 'Document intelligence & summarisation', 'Legal research grounded in Indian law', 'Hearing calendar with conflict detection'].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-success-600 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-5 flex items-center gap-1 text-accent-600 font-medium text-sm group-hover:gap-2 transition-all">
              Open professional workspace <ArrowRight size={16} />
            </div>
          </Link>

          <Link to="/portal" className="card card-hover p-8 group">
            <div className="w-14 h-14 rounded-xl bg-gold-100 flex items-center justify-center mb-4">
              <HeartHandshake className="text-gold-700" size={28} />
            </div>
            <h3 className="font-serif text-xl font-semibold text-navy-900">For Citizens</h3>
            <p className="text-sm text-navy-500 mt-2 mb-4">
              Simple legal assistance in Tamil and English. Ask questions, understand documents,
              find free legal aid, and learn your rights — no legal jargon.
            </p>
            <ul className="space-y-2 text-sm text-navy-600">
              {['Ask legal questions in Tamil or English', 'Get documents explained in plain language', 'Find free legal aid services near you', 'Know your fundamental rights'].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-success-600 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-5 flex items-center gap-1 text-accent-600 font-medium text-sm group-hover:gap-2 transition-all">
              Open citizen portal <ArrowRight size={16} />
            </div>
          </Link>
        </div>
      </section>

      {/* Agent grid */}
      <section className="bg-white border-y border-navy-100">
        <div className="max-w-6xl mx-auto px-4 lg:px-6 py-16 lg:py-20">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl font-semibold text-navy-900">Seven specialised AI agents</h2>
            <p className="text-navy-500 mt-2">Coordinated by a central orchestrator — not a generic chatbot.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Brain, name: 'Case Triage Agent', desc: 'Analyses case descriptions, identifies category, urgency, and recommends priority with explainable reasoning.' },
              { icon: FileText, name: 'Document Intelligence Agent', desc: 'Extracts text from PDF/DOCX/TXT, identifies parties, dates, key points, and generates structured summaries.' },
              { icon: BookOpen, name: 'Legal Research Agent', desc: 'Retrieves relevant Indian legal sources — statutes, constitutional provisions, and verified references.' },
              { icon: HeartHandshake, name: 'Legal Aid Agent', desc: 'Guides citizens to free legal aid services — NALSA, state and district authorities, and legal aid clinics.' },
              { icon: Calendar, name: 'Scheduling Agent', desc: 'Detects hearing conflicts, suggests alternative slots, and links reminders to cases.' },
              { icon: Bot, name: 'Citizen Assistant', desc: 'Conversational interface in Tamil and English for legal questions, rights, and document explanations.' },
              { icon: ShieldCheck, name: 'Verification Agent', desc: 'Checks evidence, references, and data completeness before results are presented to users.' },
            ].map((agent) => {
              const Icon = agent.icon;
              return (
                <div key={agent.name} className="card p-5 card-hover">
                  <div className="w-10 h-10 rounded-lg bg-accent-50 flex items-center justify-center mb-3">
                    <Icon className="text-accent-600" size={20} />
                  </div>
                  <h3 className="font-semibold text-navy-900 text-sm">{agent.name}</h3>
                  <p className="text-xs text-navy-500 mt-1.5 leading-relaxed">{agent.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Responsible AI */}
      <section className="max-w-4xl mx-auto px-4 lg:px-6 py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-navy-100 flex items-center justify-center mx-auto mb-5">
          <ScaleIcon className="text-navy-700" size={32} />
        </div>
        <h2 className="font-serif text-2xl font-semibold text-navy-900">Responsible AI, by design</h2>
        <div className="grid sm:grid-cols-3 gap-6 mt-8 text-left">
          {[
            { title: 'No fabricated law', desc: 'The legal research agent never invents statutes, section numbers, or citations. If references are not found, it says so.' },
            { title: 'Human review required', desc: 'All AI recommendations are advisory. The triage agent never determines guilt or binding judicial priority.' },
            { title: 'Explainable reasoning', desc: 'Every agent output includes its reasoning, sources, and limitations so professionals can verify before acting.' },
          ].map((item) => (
            <div key={item.title}>
              <h3 className="font-semibold text-navy-800 text-sm">{item.title}</h3>
              <p className="text-xs text-navy-500 mt-1.5 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="bg-navy-900 text-navy-300 py-8 px-4 text-center text-sm">
        <Logo size={36} light />
        <p className="mt-4 text-xs">Law Nanban AI · Justice through Intelligence · Bharat Agentic AI Hackathon 2026</p>
        <p className="mt-2 text-xs text-navy-400">General legal information, not legal advice. Recommendations are advisory and require human review.</p>
      </footer>
    </div>
  );
}
