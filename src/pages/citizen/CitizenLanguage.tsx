import { Languages } from 'lucide-react';
import { useTranslations } from '@/i18n';
import type { Lang } from '@/i18n';
import { Card, PageHeader } from '@/components/ui';

export function CitizenLanguage({ lang, setLang }: { lang: Lang; setLang: (lang: Lang) => void }) {
  const t = useTranslations(lang);

  return (
    <>
      <PageHeader title={t.language.title} subtitle={t.language.subtitle} />
      <Card className="max-w-xl p-5">
        <div className="flex items-center gap-3 mb-5"><span className="w-10 h-10 rounded-lg bg-accent-50 text-accent-700 flex items-center justify-center"><Languages size={20} /></span><p className="text-sm text-navy-600">{lang === 'ta' ? 'இந்தத் தேர்வு குடிமக்கள் போர்டலின் மொழியை மாற்றும்.' : 'This changes the language used across the citizen portal.'}</p></div>
        <div className="grid sm:grid-cols-2 gap-3">
          <button type="button" onClick={() => setLang('en')} aria-pressed={lang === 'en'} className={`p-4 rounded-lg border text-left transition-colors ${lang === 'en' ? 'border-accent-500 bg-accent-50' : 'border-navy-200 hover:bg-navy-50'}`}><span className="font-semibold text-navy-900">{t.language.english}</span>{lang === 'en' && <span className="block text-xs text-accent-700 mt-1">{t.language.saved}</span>}</button>
          <button type="button" onClick={() => setLang('ta')} aria-pressed={lang === 'ta'} className={`p-4 rounded-lg border text-left transition-colors ${lang === 'ta' ? 'border-accent-500 bg-accent-50' : 'border-navy-200 hover:bg-navy-50'}`}><span className="font-semibold text-navy-900">{t.language.tamil}</span>{lang === 'ta' && <span className="block text-xs text-accent-700 mt-1">{t.language.saved}</span>}</button>
        </div>
        <p className="text-xs text-navy-500 mt-5">{lang === 'ta' ? 'சட்ட ஆதாரங்கள் அவற்றின் மூல மொழியிலேயே காட்டப்படலாம்.' : 'Legal-source excerpts may be shown in their original language.'}</p>
      </Card>
    </>
  );
}
