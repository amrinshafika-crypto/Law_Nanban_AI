import { FormEvent, useState } from 'react';
import { ExternalLink, Search } from 'lucide-react';
import { useTranslations } from '@/i18n';
import type { Lang } from '@/i18n';
import { Card, PageHeader } from '@/components/ui';

const ECOURTS_CASE_STATUS = 'https://services.ecourts.gov.in/ecourtindia_v6/casestatus';

export function CitizenCaseStatus({ lang }: { lang: Lang }) {
  const t = useTranslations(lang);
  const [cnr, setCnr] = useState('');
  const [caseNumber, setCaseNumber] = useState('');
  const [year, setYear] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function prepareSearch(event: FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    const normalizedCnr = cnr.trim();
    const normalizedCaseNumber = caseNumber.trim();
    const normalizedYear = year.trim();
    if (!normalizedCnr && !normalizedCaseNumber) {
      setError(lang === 'ta' ? 'CNR எண் அல்லது வழக்கு பதிவு எண்ணை உள்ளிடவும்.' : 'Enter a CNR number or a case registration number before continuing.');
      return;
    }
    if (normalizedCnr && !/^[A-Za-z0-9]{16}$/.test(normalizedCnr)) {
      setError(lang === 'ta' ? 'CNR எண் 16 ஆங்கில எழுத்துகள் அல்லது எண்களைக் கொண்டிருக்க வேண்டும்.' : 'A CNR number must contain 16 letters or digits.');
      return;
    }
    if (normalizedYear && (!/^\d{4}$/.test(normalizedYear) || Number(normalizedYear) < 1800 || Number(normalizedYear) > new Date().getFullYear())) {
      setError(lang === 'ta' ? 'சரியான நான்கு இலக்க பதிவு ஆண்டை உள்ளிடவும்.' : 'Enter a valid four-digit registration year.');
      return;
    }
    setMessage(lang === 'ta' ? 'தேடல் தகவல் இந்த உலாவியில் மட்டும் உள்ளது. அதிகாரப்பூர்வ தளத்தில் விவரங்களை உள்ளிட்டு தேடவும்.' : 'Your search details stay in this browser. Enter them on the official service to search.');
  }

  return (
    <>
      <PageHeader title={t.caseStatus.title} subtitle={t.caseStatus.subtitle} />
      <Card className="p-5">
        <div className="flex items-center gap-3"><span className="w-10 h-10 rounded-lg bg-accent-50 text-accent-700 flex items-center justify-center"><Search size={20} /></span><h2 className="font-semibold text-navy-900">{lang === 'ta' ? 'அதிகாரப்பூர்வ eCourts சேவையில் தேடுங்கள்' : 'Search through the official eCourts service'}</h2></div>
        <p className="text-sm text-navy-700 mt-4">{lang === 'ta' ? 'இந்தப் பக்கம் வழிகாட்டுதலுக்காக மட்டுமே. இங்கே வழக்கு விவரங்கள் தேடப்படவோ சேமிக்கப்படவோ இல்லை.' : 'This page only helps you prepare. Case details are not searched or saved here.'}</p>
        <form onSubmit={prepareSearch} className="grid sm:grid-cols-2 gap-4 mt-5">
          <div><label htmlFor="case-cnr" className="label">{lang === 'ta' ? 'CNR எண் (16 எழுத்துகள்/எண்கள்)' : 'CNR number (16 letters/digits)'}</label><input id="case-cnr" className="input" value={cnr} onChange={(event) => setCnr(event.target.value)} maxLength={16} autoComplete="off" /></div>
          <div><label htmlFor="case-number" className="label">{lang === 'ta' ? 'அல்லது வழக்கு பதிவு எண்' : 'Or case registration number'}</label><input id="case-number" className="input" value={caseNumber} onChange={(event) => setCaseNumber(event.target.value)} maxLength={80} autoComplete="off" /></div>
          <div><label htmlFor="case-year" className="label">{lang === 'ta' ? 'பதிவு ஆண்டு (விருப்பத்தேர்வு)' : 'Registration year (optional)'}</label><input id="case-year" className="input" inputMode="numeric" value={year} onChange={(event) => setYear(event.target.value)} maxLength={4} autoComplete="off" /></div>
          <div className="flex items-end"><button type="submit" className="btn-outline">{lang === 'ta' ? 'தகவலைச் சரிபார்க்கவும்' : 'Check search details'}</button></div>
        </form>
        {error && <p role="alert" className="text-sm text-danger-700 mt-3">{error}</p>}
        {message && <p role="status" className="text-sm text-success-700 mt-3">{message}</p>}
        <h3 className="font-medium text-navy-900 mt-6">{lang === 'ta' ? 'உங்களிடம் இருக்க வேண்டிய தகவல்கள்' : 'Information you may need'}</h3>
        <ul className="list-disc pl-5 mt-3 space-y-2 text-sm text-navy-700">
          <li>{lang === 'ta' ? 'CNR எண் இருந்தால், அது வழக்கு ஆவணங்களில் காணப்படும் 16 எழுத்து/எண் குறியீடு.' : 'If available, the CNR is a 16-character alphanumeric code shown on case documents.'}</li>
          <li>{lang === 'ta' ? 'இல்லையெனில், நீதிமன்றம், வழக்கு வகை/பதிவு எண், ஆண்டு அல்லது தரப்பினரின் பெயர் போன்ற விவரங்கள் கேட்கப்படலாம்.' : 'Otherwise, the service may ask for court, case type/registration number, year, or party name.'}</li>
          <li>{lang === 'ta' ? 'வழக்கு எண் அல்லது CNR உறுதியாக இல்லையெனில், நீதிமன்றப் பதிவகத்தையோ உங்கள் வழக்கறிஞரையோ அணுகவும்.' : 'If you are unsure of the number or CNR, contact the court registry or your lawyer.'}</li>
        </ul>
        <a className="btn-primary mt-6" href={ECOURTS_CASE_STATUS} target="_blank" rel="noopener noreferrer">{lang === 'ta' ? 'அதிகாரப்பூர்வ eCourts வழக்கு நிலையைத் திறக்கவும்' : 'Open official eCourts Case Status'}<ExternalLink size={15} /></a>
        <p className="text-xs text-navy-500 mt-5">{lang === 'ta' ? 'இந்த பயன்பாடு நீதிமன்றத் தரவை நேரடியாகப் பெறாது; எந்த வழக்கு நிலை முடிவும் இங்கே உருவாக்கப்படவில்லை.' : 'This application does not retrieve live court records. No case-status result is generated here.'}</p>
      </Card>
    </>
  );
}
