import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Bot, ChevronDown, ChevronUp, Copy, FileText, Search } from 'lucide-react';
import { Badge, Card, EmptyState, PageHeader } from '@/components/ui';
import { generateSectionExplanation, legalLibraryActs, normalizeSearchText } from '@/lib/legalLibrary';

export function LegalLibraryDetail() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const act = legalLibraryActs.find((entry) => entry.slug === slug) ?? null;
  const [sectionQuery, setSectionQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const filteredSections = useMemo(() => {
    if (!act) return [];
    const normalizedQuery = normalizeSearchText(sectionQuery);
    if (!normalizedQuery) return act.sections;

    return act.sections.filter((section) => {
      const haystack = `${section.number} ${section.title} ${section.legalText}`;
      return normalizeSearchText(haystack).includes(normalizedQuery);
    });
  }, [act, sectionQuery]);

  if (!act) {
    return (
      <>
        <PageHeader title="Legislation not found" subtitle="The selected Act could not be located in the library index." />
        <Card className="p-6 text-center">
          <p className="text-sm text-navy-600">This record may have moved, or it may not be available in the current library index.</p>
          <button type="button" className="btn-primary mt-4" onClick={() => navigate('/portal/legal-library')}>
            Back to Legal Library
          </button>
        </Card>
      </>
    );
  }

  function toggleSection(sectionId: string) {
    setExpandedSections((previous) => ({ ...previous, [sectionId]: !(previous[sectionId] ?? true) }));
  }

  async function copySectionText(text: string, sectionId: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(sectionId);
      window.setTimeout(() => setCopiedSection((current) => (current === sectionId ? null : current)), 1200);
    } catch {
      setCopiedSection(null);
    }
  }

  function openAskFlow(section: { number: string; title: string; legalText: string; sourcePageStart?: number | null; sourcePageEnd?: number | null; sourceUrl?: string | null }) {
    if (!act) {
      return;
    }
    const sourcePage = section.sourcePageStart && section.sourcePageEnd
      ? `${section.sourcePageStart}${section.sourcePageStart !== section.sourcePageEnd ? `–${section.sourcePageEnd}` : ''}`
      : 'Source pages not available';
    const sourceLabel = act.officialSourceName || 'Official source not listed';
    const sourceUrl = act.officialSourceUrl || section.sourceUrl || 'Official source link pending';
    const prompt = `Explain Section ${section.number} of ${act.title} (${section.title}) in simple English and simple Tamil. Use only the provided source material and clearly state any point that cannot be confirmed from the available source. Act: ${act.title}. Section: ${section.number}. Official source: ${sourceLabel}. Source URL: ${sourceUrl}. Source pages: ${sourcePage}. Source text: ${section.legalText}`;
    navigate(`/portal/ask?prompt=${encodeURIComponent(prompt)}`);
  }

  const metadata = [
    { label: 'Official Act title', value: act.title },
    { label: 'Short title', value: act.shortTitle || 'Not available' },
    { label: 'Act number and year', value: act.actNumber ? `${act.actNumber}${act.actYear ? `, ${act.actYear}` : ''}` : 'Not available' },
    { label: 'Jurisdiction', value: act.jurisdiction },
    { label: 'Category', value: act.category },
    { label: 'Applicable territory', value: act.applicableTerritory || 'Not available' },
    { label: 'Effective date', value: act.effectiveDate || 'Not available' },
    { label: 'Consolidation/amendment date', value: act.consolidationDate || 'Not available' },
    { label: 'Official source name', value: act.officialSourceName || 'Not available' },
    {
      label: 'Official source URL',
      value: act.officialSourceUrl || 'Official source link pending',
      href: act.officialSourceUrl || undefined,
    },
    { label: 'Verification/review status', value: act.verificationStatus || 'Not available' },
  ];

  return (
    <>
      <div className="mb-4">
        <button type="button" onClick={() => navigate('/portal/legal-library')} className="btn-outline">
          <ArrowLeft size={16} />
          Back to Legal Library
        </button>
      </div>

      <PageHeader title={act.title} subtitle={act.summary || 'No summary available.'} />

      <div className="mb-5 flex flex-wrap gap-2">
        <Badge color={act.jurisdiction === 'Tamil Nadu State Law' ? 'gold' : 'accent'}>{act.jurisdiction}</Badge>
        <Badge color="navy">{act.category}</Badge>
        <Badge color={act.verified ? 'success' : 'warning'}>{act.verificationStatus}</Badge>
      </div>

      <Card className="p-4 sm:p-5 mb-5">
        <div className="grid gap-4 md:grid-cols-2">
          {metadata.map((item) => (
            <div key={item.label} className="rounded-lg border border-navy-100 bg-navy-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-navy-500">{item.label}</p>
              {item.href ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block text-sm text-accent-700 underline decoration-accent-300 underline-offset-2 break-words"
                >
                  {item.value}
                </a>
              ) : (
                <p className="mt-1 text-sm text-navy-800 break-words">{item.value}</p>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4 sm:p-5 mb-5">
        <div className="flex items-center gap-2 text-navy-800">
          <FileText size={18} className="text-accent-700" />
          <h2 className="font-semibold">Section browser</h2>
        </div>

        {act.sections.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={<FileText size={28} />}
              title="No section-level content is available in the current source"
              description="This legislation is indexed at the Act level only. Use the official source and general legal aid channels for further review."
            />
          </div>
        ) : (
          <>
            <div className="relative mt-4">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
              <input
                aria-label="Search within sections"
                className="input pl-10"
                value={sectionQuery}
                onChange={(event) => setSectionQuery(event.target.value)}
                placeholder="Search section number, title or legal text..."
              />
            </div>

            {filteredSections.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  icon={<Search size={28} />}
                  title="No matching sections found"
                  description="Try a broader keyword or section number to find the text you need."
                />
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {filteredSections.map((section) => {
                  const expanded = expandedSections[section.id] ?? true;
                  const legalText = section.legalText || 'Official legal text is not available for this section in the current source material.';
                  const sourcePage = section.sourcePageStart && section.sourcePageEnd
                    ? `${section.sourcePageStart}${section.sourcePageStart !== section.sourcePageEnd ? `–${section.sourcePageEnd}` : ''}`
                    : 'Source pages not available';

                  return (
                    <Card key={section.id} className="p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge color="navy">Section {section.number}</Badge>
                            <Badge color={section.verified ? 'success' : 'warning'}>{section.reviewStatus}</Badge>
                          </div>
                          <h3 className="mt-2 text-base font-semibold text-navy-900">{section.title}</h3>
                          <p className="mt-1 text-xs text-navy-500">Source page reference: {sourcePage}</p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button type="button" className="btn-outline" onClick={() => toggleSection(section.id)}>
                            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            {expanded ? 'Collapse' : 'Expand'}
                          </button>
                          <button type="button" className="btn-outline" onClick={() => copySectionText(legalText, section.id)}>
                            <Copy size={16} />
                            {copiedSection === section.id ? 'Copied' : 'Copy text'}
                          </button>
                          <button type="button" className="btn-primary" onClick={() => openAskFlow(section)}>
                            <Bot size={16} />
                            Explain this section
                          </button>
                        </div>
                      </div>

                      {expanded && (
                        <div className="mt-4 space-y-4">
                          <div className="rounded-lg border border-navy-200 bg-navy-50 p-4">
                            <p className="text-xs font-medium uppercase tracking-wide text-navy-500">Official legal text</p>
                            <p className="mt-2 whitespace-pre-line text-sm leading-7 text-navy-800">{legalText}</p>
                          </div>

                          <div className="rounded-lg border border-accent-100 bg-accent-50 p-4">
                            <p className="text-xs font-medium uppercase tracking-wide text-accent-700">AI-generated explanation</p>
                            <p className="mt-2 whitespace-pre-line text-sm leading-7 text-navy-800">{generateSectionExplanation(act, section, 'en')}</p>
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </Card>
    </>
  );
}
