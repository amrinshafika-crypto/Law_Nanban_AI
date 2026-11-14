import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, HeartHandshake, Mail, Phone, Search } from 'lucide-react';
import { useTranslations } from '@/i18n';
import type { Lang } from '@/i18n';
import { Badge, Card, EmptyState, LoadingState, PageHeader } from '@/components/ui';
import { orchestrate, type OrchestratorResult } from '@/lib/agents';
import { safeExternalUrl, safePhoneUrl } from '@/lib/links';
import { useLegalAidResources } from '@/lib/hooks';

export function CitizenAid({ lang }: { lang: Lang }) {
  const t = useTranslations(lang);
  const { resources, loading, error, reload } = useLegalAidResources();
  const [query, setQuery] = useState('');
  const [authorityType, setAuthorityType] = useState('all');
  const [orchestratorResult, setOrchestratorResult] = useState<OrchestratorResult | null>(null);
  const types = [...new Set(resources.map((resource) => resource.authority_type).filter(Boolean))].sort();
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return resources.filter((resource) => {
      const matchesType = authorityType === 'all' || resource.authority_type === authorityType;
      const matchesQuery = !term || [resource.name, resource.authority_type, resource.state, resource.district, resource.address, resource.description, resource.eligibility, resource.email, resource.phone, ...resource.services]
        .some((value) => value?.toLocaleLowerCase().includes(term));
      return matchesType && matchesQuery;
    });
  }, [resources, query, authorityType]);

  useEffect(() => {
    const activeQuery = query.trim() || 'legal aid in Tamil Nadu';
    void orchestrate('legal_aid', { query: activeQuery }, []).then((response) => {
      setOrchestratorResult(response);
    }).catch(() => setOrchestratorResult(null));
  }, [query]);

  return (
    <>
      <PageHeader title={t.aid.title} subtitle={t.aid.subtitle} />
      <Card className="p-5 mb-5"><h2 className="font-semibold text-navy-900">{lang === 'ta' ? 'சட்ட உதவி பற்றிய பொதுத் தகவல்' : 'About legal-aid directory records'}</h2><p className="text-sm text-navy-700 mt-2">{lang === 'ta' ? 'கீழே உள்ள பதிவுகள் அதிகாரப்பூர்வ இணையதளங்கள் மற்றும் சட்ட சேவை அமைப்புகளின் பொதுவான தொடர்பு விவரங்களை அடிப்படையாகக் கொண்டவை. நடைமுறையில் அனைத்து தகவல்களும் தற்போதைய நிலையில் இருப்பதை நாங்கள் உறுதிப்படுத்தவில்லை.' : 'These records are based on official legal-services sources and public contact information. We have not independently confirmed that every current service is still active or that every contact remains unchanged.'}</p>{orchestratorResult && <div className="mt-3 rounded border border-navy-200 bg-navy-50 p-3 text-xs text-navy-600"><span className="font-semibold text-navy-800">Orchestrator:</span> {orchestratorResult.agent} · {orchestratorResult.verified ? 'verified' : 'needs review'} {orchestratorResult.verificationResult && <>· {orchestratorResult.verificationResult.summary}</>}</div>}</Card>
      <div className="grid sm:grid-cols-[1fr_auto] gap-3 mb-4">
        <label className="relative block"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" /><input className="input pl-10" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.aid.searchPlaceholder} aria-label={t.aid.searchPlaceholder} /></label>
        <select className="input sm:w-56" value={authorityType} onChange={(event) => setAuthorityType(event.target.value)} aria-label={lang === 'ta' ? 'அமைப்பு வகையால் வடிகட்டுங்கள்' : 'Filter by authority type'}>
          <option value="all">{t.aid.allTypes}</option>
          {types.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
      </div>
      {error ? <div role="alert" className="text-sm text-danger-700">{lang === 'ta' ? 'சட்ட உதவி பதிவுகளை ஏற்ற முடியவில்லை.' : 'Legal-aid resources could not be loaded.'} {error} <button type="button" className="underline" onClick={() => void reload()}>{lang === 'ta' ? 'மீண்டும் முயற்சிக்கவும்' : 'Retry'}</button></div>
        : loading ? <LoadingState message={lang === 'ta' ? 'சேவைப் பதிவுகளை ஏற்றுகிறது...' : 'Loading directory records...'} />
          : filtered.length === 0 ? <EmptyState icon={<HeartHandshake size={30} />} title={query || authorityType !== 'all' ? (lang === 'ta' ? 'பொருந்தும் பதிவுகள் இல்லை' : 'No matching resources') : (lang === 'ta' ? 'சேவைப் பதிவுகள் இல்லை' : 'No directory entries available')} description={lang === 'ta' ? 'தரவுத்தளத்தில் காட்டுவதற்கு பொருந்தும் பதிவு இல்லை.' : 'There are no matching records in the directory right now.'} />
            : <div className="grid md:grid-cols-2 gap-4">{filtered.map((resource) => {
              const website = safeExternalUrl(resource.website);
              const phone = safePhoneUrl(resource.phone);
              const email = resource.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resource.email) ? resource.email : null;
              return <Card key={resource.id} className="p-5">
                <div className="flex justify-between gap-3"><h2 className="font-semibold text-navy-900">{resource.name}</h2><Badge color={resource.verified ? 'success' : 'warning'}>{resource.verified ? (lang === 'ta' ? 'தரவுத்தளத்தில் குறிக்கப்பட்டது' : 'Marked verified') : (lang === 'ta' ? 'சரிபார்க்கப்படாத பதிவு' : 'Unverified record')}</Badge></div>
                <p className="text-sm text-navy-500 mt-1 capitalize">{resource.authority_type}{resource.district ? ` · ${resource.district}` : ''}{resource.state ? `, ${resource.state}` : ''}</p>
                {lang === 'ta' && <p className="mt-3 rounded bg-amber-50 p-2 text-xs text-amber-900">கீழே உள்ள அடைவு விவரங்கள் தரவுத்தளத்தில் சேமிக்கப்பட்ட மொழியில் காட்டப்படுகின்றன; மொழிபெயர்க்கப்படவில்லை.</p>}
                {resource.description && <p className="text-sm text-navy-700 mt-3">{resource.description}</p>}
                {resource.address && <p className="text-sm text-navy-600 mt-3">{resource.address}</p>}
                {resource.services?.length > 0 && <p className="text-sm text-navy-600 mt-3"><span className="font-medium">{t.aid.services}: </span>{resource.services.join(', ')}</p>}
                {resource.eligibility && <p className="text-sm text-navy-600 mt-2"><span className="font-medium">{t.aid.eligibility}: </span>{resource.eligibility}</p>}
                <div className="flex flex-wrap gap-3 mt-4">{phone && <a className="inline-flex items-center gap-1 text-sm text-accent-700 hover:underline" href={phone}><Phone size={15} />{t.aid.call} {resource.phone}</a>}{email && <a className="inline-flex items-center gap-1 text-sm text-accent-700 hover:underline" href={`mailto:${email}`}><Mail size={15} />{email}</a>}{website && <a className="inline-flex items-center gap-1 text-sm text-accent-700 hover:underline" href={website} target="_blank" rel="noopener noreferrer">{t.aid.visit}<ExternalLink size={14} /></a>}</div>
                <p className="text-xs text-navy-400 mt-4">{lang === 'ta' ? 'தொடர்பு விவரங்கள் மாறக்கூடும்; வழங்குநரிடம் உறுதிப்படுத்தவும். “சரிபார்க்கப்பட்டது” குறி தனிப்பட்ட தற்போதைய சரிபார்ப்பு அல்ல.' : 'Contact details can change; confirm them with the provider. “Verified” is a stored marker, not an independent current check.'}</p>
              </Card>;
            })}</div>}
    </>
  );
}
