import { useMemo, useState } from 'react';
import { ChevronDown, Search, ShieldCheck } from 'lucide-react';
import { useTranslations } from '@/i18n';
import type { Lang } from '@/i18n';
import { Badge, Card, EmptyState, PageHeader } from '@/components/ui';
import { safeExternalUrl } from '@/lib/links';
import { rights, rightsCategories } from './rightsCatalog';

export function CitizenRights({ lang }: { lang: Lang }) {
  const t = useTranslations(lang);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [openRight, setOpenRight] = useState<string | null>(null);
  const term = query.trim().toLocaleLowerCase();
  const filteredRights = useMemo(() => rights.filter((right) => {
    const values = [right.title, right.taTitle, right.basis, right.taBasis, right.explanation, right.taExplanation, right.example, right.taExample, right.authority, right.taAuthority];
    return (category === 'all' || right.category === category) && (!term || values.some((value) => value.toLocaleLowerCase().includes(term)));
  }), [category, term]);

  return <>
    <PageHeader title={t.rights.title} subtitle={t.rights.subtitle} />
    <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto]">
      <label className="relative block"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" /><input className="input pl-10" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={lang === 'ta' ? 'உரிமை அல்லது சட்டத்தைத் தேடுங்கள்' : 'Search rights, laws or sections...'} aria-label={lang === 'ta' ? 'உரிமைகளைத் தேடுங்கள்' : 'Search legal rights'} /></label>
      <label className="sr-only" htmlFor="rights-category">{lang === 'ta' ? 'வகையால் வடிகட்டு' : 'Filter by category'}</label>
      <select id="rights-category" className="input sm:w-72" value={category} onChange={(event) => setCategory(event.target.value)}>
        <option value="all">{lang === 'ta' ? 'அனைத்து வகைகளும்' : 'All categories'}</option>
        {rightsCategories.map((item) => <option key={item.id} value={item.id}>{lang === 'ta' ? item.taTitle : item.title}</option>)}
      </select>
    </div>

    {!query && category === 'all' && <section aria-label={lang === 'ta' ? 'உரிமை வகைகள்' : 'Rights categories'} className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {rightsCategories.map((item) => <button key={item.id} type="button" onClick={() => setCategory(item.id)} className="rounded-xl border border-navy-100 bg-white p-4 text-left shadow-sm transition hover:border-accent-300 hover:shadow">
        <h2 className="text-sm font-semibold text-navy-900">{lang === 'ta' ? item.taTitle : item.title}</h2><p className="mt-1 text-xs leading-5 text-navy-500">{lang === 'ta' ? item.taDescription : item.description}</p>
      </button>)}
    </section>}

    {filteredRights.length === 0 ? <EmptyState title={lang === 'ta' ? 'பொருந்தும் உரிமைகள் இல்லை' : 'No matching rights'} description={lang === 'ta' ? 'தேடல் சொல் அல்லது வகையை மாற்றிப் பாருங்கள்.' : 'Try another search term or category.'} />
      : <section className="space-y-3" aria-label={lang === 'ta' ? 'சட்ட உரிமைகள்' : 'Legal rights'}>
        {filteredRights.map((right) => {
          const itemCategory = rightsCategories.find((item) => item.id === right.category)!;
          const isOpen = openRight === right.id;
          const sourceUrl = safeExternalUrl(right.url);
          const text = (en: string, ta: string) => lang === 'ta' ? ta : en;
          return <Card key={right.id} className="overflow-hidden">
            <button type="button" className="flex w-full items-start justify-between gap-4 p-4 text-left sm:p-5" aria-expanded={isOpen} onClick={() => setOpenRight(isOpen ? null : right.id)}>
              <span className="min-w-0"><span className="mb-2 block"><Badge color="accent">{lang === 'ta' ? itemCategory.taTitle : itemCategory.title}</Badge></span><span className="block font-semibold text-navy-900">{lang === 'ta' ? right.taTitle : right.title}</span><span className="mt-1 block text-sm text-navy-500">{lang === 'ta' ? right.taBasis : right.basis}</span></span>
              <ChevronDown size={19} className={`mt-1 shrink-0 text-navy-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {isOpen && <div className="border-t border-navy-100 px-4 pb-5 pt-4 sm:px-5">
              <div className="mb-4 flex items-center gap-2"><Badge color="success"><span className="inline-flex items-center gap-1"><ShieldCheck size={13} />{text('Source checked', 'மூலம் சரிபார்க்கப்பட்டது')}</span></Badge><span className="text-xs text-navy-500">{lang === 'ta' ? 'அதிகாரப்பூர்வ மூலத்தில் சட்ட உரை சரிபார்க்கப்பட்டது; இது தனிப்பட்ட சட்ட ஆலோசனை அல்ல.' : 'Provision checked against the linked official source; this is not individual legal advice.'}</span></div>
              <dl className="grid gap-x-6 gap-y-4 md:grid-cols-2">
                <div><dt className="text-xs font-semibold uppercase tracking-wide text-navy-500">{text('What it means', 'இதன் பொருள்')}</dt><dd className="mt-1 text-sm leading-6 text-navy-800">{lang === 'ta' ? right.taExplanation : right.explanation}</dd></div>
                <div><dt className="text-xs font-semibold uppercase tracking-wide text-navy-500">{text('Who is covered', 'யாருக்கு பொருந்தும்')}</dt><dd className="mt-1 text-sm leading-6 text-navy-800">{lang === 'ta' ? right.taWho : right.who}</dd></div>
                <div><dt className="text-xs font-semibold uppercase tracking-wide text-navy-500">{text('Practical example', 'நடைமுறை எடுத்துக்காட்டு')}</dt><dd className="mt-1 text-sm leading-6 text-navy-800">{lang === 'ta' ? right.taExample : right.example}</dd></div>
                <div><dt className="text-xs font-semibold uppercase tracking-wide text-navy-500">{text('What you can do', 'நீங்கள் செய்யக்கூடியவை')}</dt><dd className="mt-1 text-sm leading-6 text-navy-800">{lang === 'ta' ? right.taSteps : right.steps}</dd></div>
                <div className="md:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wide text-navy-500">{text('Relevant authority', 'சம்பந்தப்பட்ட அதிகார அமைப்பு')}</dt><dd className="mt-1 text-sm leading-6 text-navy-800">{lang === 'ta' ? right.taAuthority : right.authority}</dd></div>
              </dl>
              {sourceUrl && <a className="mt-4 inline-block text-sm font-medium text-accent-700 hover:underline" href={sourceUrl} target="_blank" rel="noopener noreferrer">{text(`Official source: ${right.source} ↗`, `அதிகாரப்பூர்வ மூலம்: ${right.source} ↗`)}</a>}
            </div>}
          </Card>;
        })}
      </section>}
    <p className="mt-5 text-xs leading-5 text-navy-500">{lang === 'ta' ? 'இவை பொதுவான சட்டத் தகவல்கள். சட்டம், மாநில விதிகள் மற்றும் தனிப்பட்ட சூழ்நிலைகள் மாறுபடலாம். உங்கள் வழக்கிற்கான ஆலோசனைக்கு தகுதியுள்ள வழக்கறிஞர் அல்லது சட்டப் பணிகள் ஆணையத்தை அணுகவும்.' : 'General legal information only. Laws, state rules and individual facts can change the outcome. Consult a qualified lawyer or Legal Services Authority for advice about your situation.'}</p>
  </>;
}
