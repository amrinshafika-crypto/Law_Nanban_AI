import { ArrowRight, BookOpen, FileText, FolderSearch, HeartHandshake, Languages, MessageCircle, Scale } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslations } from '@/i18n';
import type { Lang } from '@/i18n';

export function CitizenHome({ lang }: { lang: Lang }) {
  const t = useTranslations(lang);
  const items = [
    { to: '/portal/ask', icon: MessageCircle, title: t.home.askQuestion, description: t.home.feature1Desc },
    { to: '/portal/rights', icon: Scale, title: t.home.knowRights, description: t.home.feature2Desc },
    { to: '/portal/explain', icon: FileText, title: t.home.explainDoc, description: t.home.feature3Desc },
    { to: '/portal/aid', icon: HeartHandshake, title: t.home.findAid, description: t.home.feature4Desc },
    { to: '/portal/case-status', icon: FolderSearch, title: t.nav.caseStatus, description: lang === 'ta' ? 'அதிகாரப்பூர்வ eCourts சேவையில் வழக்குத் தகவலைத் தேட வழிகாட்டல்.' : 'Guidance for checking case information through official eCourts services.' },
    { to: '/portal/language', icon: Languages, title: t.nav.language, description: lang === 'ta' ? 'குடிமக்கள் தளத்தில் ஆங்கிலம் அல்லது தமிழைத் தேர்ந்தெடுக்கவும்.' : 'Choose English or Tamil for the citizen portal.' },
  ];

  return (
    <div>
      <section className="rounded-2xl bg-navy-900 text-white p-7 sm:p-10">
        <div className="w-12 h-12 rounded-xl bg-gold-500/20 text-gold-300 flex items-center justify-center"><Scale size={25} /></div>
        <h1 className="font-serif text-3xl font-semibold mt-5">{t.home.welcome}</h1>
        <p className="text-navy-200 mt-2 max-w-2xl">{t.home.subtitle}</p>
        <p className="text-gold-300 mt-3">Ungal Urimai, Ungal Nanban!</p>
        <Link to="/portal/ask" className="btn-gold mt-6">{t.home.getStarted}<ArrowRight size={16} /></Link>
      </section>
      <section className="mt-8">
        <h2 className="font-serif text-2xl font-semibold text-navy-900">{t.home.featuresTitle}</h2>
        <div className="grid sm:grid-cols-2 gap-4 mt-4">
          {items.map(({ to, icon: Icon, title, description }) => <Link key={to} to={to} className="card card-hover p-5"><div className="flex items-center gap-3"><span className="w-10 h-10 rounded-lg bg-accent-50 text-accent-700 flex items-center justify-center"><Icon size={20} /></span><h3 className="font-semibold text-navy-900">{title}</h3></div><p className="text-sm text-navy-500 mt-3">{description}</p><span className="inline-flex items-center gap-1 text-sm text-accent-700 font-medium mt-4">{t.home.getStarted}<ArrowRight size={15} /></span></Link>)}
        </div>
      </section>
      <div className="mt-6 rounded-lg bg-navy-100/70 p-4 flex gap-3 text-sm text-navy-700"><BookOpen size={18} className="shrink-0 mt-0.5" /><p>{lang === 'ta' ? 'இது பொதுவான சட்டத் தகவல் உதவியாளர்; சட்டப் பிரதிநிதித்துவமோ தகுதியான வழக்கறிஞரின் ஆலோசனைக்கு மாற்றோ அல்ல.' : 'Law Nanban is a legal-information assistant. Information is general and is not legal representation or a substitute for a qualified lawyer.'}</p></div>
    </div>
  );
}
