import { ExternalLink, HeartHandshake, Phone } from 'lucide-react';
import { Badge, Card, EmptyState, LoadingState, PageHeader } from '@/components/ui';
import { useLegalAidResources } from '@/lib/hooks';

export function LegalAidResources() {
  const { resources, loading, error } = useLegalAidResources();

  return (
    <>
      <PageHeader title="Legal Aid Resources" subtitle="Directory entries available in the shared legal-aid reference table." />
      {error ? <p role="alert" className="text-sm text-danger-700">Legal-aid resources could not be loaded: {error}</p> : loading ? <LoadingState message="Loading legal-aid directory..." /> : resources.length === 0 ? (
        <EmptyState icon={<HeartHandshake size={30} />} title="No directory entries available" description="No legal-aid resources are currently present in the directory." />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">{resources.map((resource) => <Card key={resource.id} className="p-5"><div className="flex justify-between gap-3"><h2 className="font-semibold text-navy-900">{resource.name}</h2><Badge color={resource.verified ? 'success' : 'warning'}>{resource.verified ? 'Verified record' : 'Unverified'}</Badge></div><p className="text-sm text-navy-500 mt-1 capitalize">{resource.authority_type}{resource.district ? ` · ${resource.district}` : ''}{resource.state ? `, ${resource.state}` : ''}</p>{resource.description && <p className="text-sm text-navy-700 mt-3">{resource.description}</p>}{resource.services.length > 0 && <p className="text-sm text-navy-600 mt-3"><span className="font-medium">Services: </span>{resource.services.join(', ')}</p>}{resource.eligibility && <p className="text-sm text-navy-600 mt-2"><span className="font-medium">Eligibility: </span>{resource.eligibility}</p>}<div className="flex flex-wrap gap-3 mt-4">{resource.phone && <a className="inline-flex items-center gap-1 text-sm text-accent-700 hover:underline" href={`tel:${resource.phone}`}><Phone size={15} />{resource.phone}</a>}{resource.website && <a className="inline-flex items-center gap-1 text-sm text-accent-700 hover:underline" href={resource.website} target="_blank" rel="noreferrer">Website <ExternalLink size={14} /></a>}</div><p className="text-xs text-navy-400 mt-4">Directory information may change; confirm details with the provider.</p></Card>)}</div>
      )}
    </>
  );
}
