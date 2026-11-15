import { useState } from 'react';
import { BookOpen, Scale } from 'lucide-react';
import { CitizenRights } from '@/pages/citizen/CitizenRights';
import { LegalLibrary } from '@/pages/citizen/LegalLibrary';
import { useLocation } from 'react-router-dom';
import type { Lang } from '@/i18n';

export function CitizenKnowledge({ lang }: { lang: Lang }) {
  const location = useLocation();
  const [tab, setTab] = useState<'rights' | 'laws'>(location.pathname.endsWith('/legal-library') ? 'laws' : 'rights');
  return <>
    <div className="mb-5 flex flex-wrap gap-2 rounded-xl border border-navy-100 bg-white p-2 shadow-sm" role="tablist" aria-label={lang === 'ta' ? 'சட்ட அறிவு நூலகம்' : 'Legal knowledge library'}>
      <button type="button" role="tab" aria-selected={tab === 'rights'} onClick={() => setTab('rights')} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium ${tab === 'rights' ? 'bg-navy-900 text-white' : 'text-navy-600 hover:bg-navy-50'}`}><Scale size={16} />{lang === 'ta' ? 'உங்கள் உரிமைகளை அறியுங்கள்' : 'Know Your Rights'}</button>
      <button type="button" role="tab" aria-selected={tab === 'laws'} onClick={() => setTab('laws')} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium ${tab === 'laws' ? 'bg-navy-900 text-white' : 'text-navy-600 hover:bg-navy-50'}`}><BookOpen size={16} />{lang === 'ta' ? 'சட்ட நூலகம்' : 'Legal Library'}</button>
    </div>
    <section role="tabpanel" aria-label={tab === 'rights' ? 'Know Your Rights' : 'Legal Library'}>
      {tab === 'rights' ? <CitizenRights lang={lang} /> : <LegalLibrary />}
    </section>
  </>;
}
