import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, Search, SlidersHorizontal, X } from 'lucide-react';
import { Badge, Card, EmptyState, PageHeader } from '@/components/ui';
import { LEGAL_LIBRARY_CATEGORIES, getJurisdictionName, legalLibraryActs, normalizeSearchText } from '@/lib/legalLibrary';

type JurisdictionFilter = 'all' | 'state' | 'central';
type SectionContentFilter = 'all' | 'with sections' | 'without sections';
type StatusFilter = 'all' | 'under review' | 'verified';

export function LegalLibrary() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [jurisdictionFilter, setJurisdictionFilter] = useState<JurisdictionFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('All categories');
  const [sectionContentFilter, setSectionContentFilter] = useState<SectionContentFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const filteredActs = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query);

    return legalLibraryActs.filter((act) => {
      const matchesJurisdiction =
        jurisdictionFilter === 'all'
          || (jurisdictionFilter === 'state' && act.jurisdiction === 'Tamil Nadu State Law')
          || (jurisdictionFilter === 'central' && act.jurisdiction === 'Central Law applicable in Tamil Nadu');

      const matchesCategory = categoryFilter === 'All categories' || act.category === categoryFilter;

      const matchesSectionContent =
        sectionContentFilter === 'all'
          || (sectionContentFilter === 'with sections' && act.sections.length > 0)
          || (sectionContentFilter === 'without sections' && act.sections.length === 0);

      const matchesStatus =
        statusFilter === 'all'
          || (statusFilter === 'under review' && !act.verified)
          || (statusFilter === 'verified' && act.verified);

      const haystack = [
        act.title,
        act.shortTitle,
        act.actNumber,
        act.actYear,
        act.category,
        act.jurisdiction,
        act.summary,
        act.keywords.join(' '),
        act.sections.map((section) => `${section.number} ${section.title} ${section.legalText}`).join(' '),
      ].join(' ');

      const matchesQuery = !normalizedQuery || normalizeSearchText(haystack).includes(normalizedQuery);

      return matchesJurisdiction && matchesCategory && matchesSectionContent && matchesStatus && matchesQuery;
    });
  }, [categoryFilter, jurisdictionFilter, query, sectionContentFilter, statusFilter]);

  function clearFilters() {
    setQuery('');
    setJurisdictionFilter('all');
    setCategoryFilter('All categories');
    setSectionContentFilter('all');
    setStatusFilter('all');
  }

  return (
    <>
      <PageHeader
        title="Tamil Nadu Legal Library"
        subtitle="Discover legislation relevant to people living in Tamil Nadu, understand key sections and access official sources with clear review labels."
      />

      <Card className="p-4 sm:p-5 mb-6">
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
            <input
              aria-label="Search legislation"
              className="input pl-10"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by act title, short title, year, keyword or section number..."
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-navy-200 bg-navy-50 px-2 py-1 text-xs font-medium text-navy-600">
              <SlidersHorizontal size={14} />
              Jurisdiction
            </div>
            {[
              { value: 'all', label: 'All' },
              { value: 'state', label: 'Tamil Nadu State Laws' },
              { value: 'central', label: 'Central Laws' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                  jurisdictionFilter === option.value
                    ? 'bg-accent-600 text-white'
                    : 'border border-navy-200 bg-white text-navy-700 hover:border-accent-300 hover:text-accent-700'
                }`}
                onClick={() => setJurisdictionFilter(option.value as JurisdictionFilter)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="block">
              <span className="label">Category</span>
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="input">
                <option value="All categories">All categories</option>
                {LEGAL_LIBRARY_CATEGORIES.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="label">Section content</span>
              <select
                value={sectionContentFilter}
                onChange={(event) => setSectionContentFilter(event.target.value as SectionContentFilter)}
                className="input"
              >
                <option value="all">All</option>
                <option value="with sections">Section-level content available</option>
                <option value="without sections">No section-level content</option>
              </select>
            </label>

            <label className="block">
              <span className="label">Review status</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="input">
                <option value="all">All</option>
                <option value="under review">Under review</option>
                <option value="verified">Verified</option>
              </select>
            </label>
          </div>

          <div className="flex justify-end">
            <button type="button" onClick={clearFilters} className="btn-outline">
              <X size={14} />
              Clear filters
            </button>
          </div>
        </div>
      </Card>

      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-navy-600">{filteredActs.length} legislation item(s) match your criteria.</p>
      </div>

      {filteredActs.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={28} />}
          title="No legislation matches your filters"
          description="Try broadening the search, selecting a different category, or clearing filters to see more results."
          action={<button type="button" className="btn-outline" onClick={clearFilters}>Clear filters</button>}
        />
      ) : (
        <div className="space-y-4">
          {filteredActs.map((act) => (
            <Card key={act.id} className="p-4 sm:p-5" hover>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge color={act.jurisdiction === 'Tamil Nadu State Law' ? 'gold' : 'accent'}>{getJurisdictionName(act.jurisdiction)}</Badge>
                      <Badge color="navy">{act.category}</Badge>
                      <Badge color={act.verified ? 'success' : 'warning'}>{act.verificationStatus}</Badge>
                    </div>
                    <h2 className="mt-3 text-xl font-semibold text-navy-900">{act.title}</h2>
                    <p className="mt-1 text-sm text-navy-500">{act.shortTitle ? `${act.shortTitle} · ` : ''}{act.actNumber || 'Act number not available'} {act.actYear ? `· ${act.actYear}` : ''}</p>
                  </div>

                  <button type="button" onClick={() => navigate(`/portal/legal-library/${act.slug}`)} className="btn-primary shrink-0">
                    Open law
                    <ArrowRight size={16} />
                  </button>
                </div>

                <p className="text-sm leading-6 text-navy-700">{act.summary || 'No summary is currently available for this Act in the indexed source material.'}</p>

                <div className="flex flex-wrap gap-2 text-xs text-navy-500">
                  <span className="rounded-full bg-navy-100 px-2.5 py-1">Official source: {act.officialSourceName || 'Not available'}</span>
                  <span className="rounded-full bg-navy-100 px-2.5 py-1">Section content: {act.sections.length > 0 ? `${act.sections.length} section(s)` : 'Not available'}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
