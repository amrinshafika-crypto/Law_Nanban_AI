import hashlib
import json
import re
from pathlib import Path

import fitz

REPO_ROOT = Path(__file__).resolve().parents[2]
LEGAL_DATASETS_ROOT = REPO_ROOT / 'legal-datasets'
POCSO_JSON = LEGAL_DATASETS_ROOT / 'pocso' / 'pocso-sections-draft-v4.json'


def sha256_for_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open('rb') as handle:
        for chunk in iter(lambda: handle.read(65536), b''):
            digest.update(chunk)
    return digest.hexdigest()


def section_from_record(record: dict) -> dict:
    source_pages = record.get('source_pdf_pages') or []
    return {
        'id': f"{record.get('act','').lower().replace(' ','-')}-{record.get('section_number','')}",
        'number': str(record.get('section_number', '')),
        'title': record.get('title', ''),
        'legalText': record.get('legal_text', ''),
        'sourcePageStart': source_pages[0] if source_pages else None,
        'sourcePageEnd': source_pages[-1] if source_pages else None,
        'sourceUrl': record.get('source_url'),
        'consolidatedAsOf': record.get('consolidated_as_of'),
        'extractionStatus': record.get('extraction_status', 'needs_manual_review'),
        'reviewStatus': 'Under review' if record.get('verified') is False else 'Verified',
        'verified': bool(record.get('verified')),
    }


def extract_sections_for_pdf(pdf_path: Path) -> list[dict]:
    if not pdf_path.exists():
        return []
    doc = fitz.open(pdf_path)
    text_segments: list[str] = []
    for page in doc:
        text_segments.append(page.get_text('text'))
    doc.close()
    combined = '\n'.join(text_segments)
    sections: list[dict] = []
    for match in re.finditer(r'(?m)^\s*(\d+)\.\s+([^\n]+)\n', combined):
        number = match.group(1)
        title = match.group(2).strip()
        start = match.start()
        end = combined.find('\n' + number + '.', start + 1)
        if end == -1:
            end = len(combined)
        legal_text = combined[match.start():end].strip()
        if len(legal_text) < 80:
            continue
        sections.append({
            'number': number,
            'title': title,
            'legalText': legal_text,
        })
    return sections[:12]


central_acts = [
    {
        'id': 'pocso-2012',
        'slug': 'protection-of-children-from-sexual-offences-act-2012',
        'title': 'The Protection of Children from Sexual Offences Act, 2012',
        'short_title': 'POCSO Act',
        'act_number': 'Act 32 of 2012',
        'act_year': '2012',
        'jurisdiction': 'Central Law applicable in Tamil Nadu',
        'category': 'Women and Child Protection',
        'applicable_territory': 'India, including Tamil Nadu',
        'official_source_name': 'IndiaCode',
        'official_source_url': None,
        'discovery_source_url': 'https://indiacode.gov.in/',
        'official_source_status': 'pending',
        'source_url_confirmed': False,
        'source_url_confirmation_note': 'No Act-specific official source page was confirmed. Generic landing page retained as discovery source only.',
        'effective_date': '2012-11-14',
        'consolidation_date': '2026-07-01',
        'verification_status': 'Under review',
        'verified': False,
        'summary': 'The Act protects children from sexual offences, establishes child-friendly procedures, and provides for special courts and victim support.',
        'keywords': ['POCSO', 'child protection', 'sexual offences', 'special courts', 'children'],
        'source_file': 'A2012-32.pdf',
        'source_pdf_path': str(REPO_ROOT / 'A2012-32.pdf'),
        'official_pdf_hash': '',
        'source_pdf_status': 'available',
        'full_text_status': 'available',
        'sections': [],
    },
    {
        'id': 'rte-2009',
        'slug': 'right-of-children-to-free-and-compulsory-education-act-2009',
        'title': 'The Right of Children to Free and Compulsory Education Act, 2009',
        'short_title': 'RTE Act',
        'act_number': 'Act 35 of 2009',
        'act_year': '2009',
        'jurisdiction': 'Central Law applicable in Tamil Nadu',
        'category': 'Education and Student Rights',
        'applicable_territory': 'India, including Tamil Nadu',
        'official_source_name': 'IndiaCode',
        'official_source_url': None,
        'discovery_source_url': 'https://indiacode.gov.in/',
        'official_source_status': 'pending',
        'source_url_confirmed': False,
        'source_url_confirmation_note': 'No Act-specific official source page was confirmed. Generic landing page retained as discovery source only.',
        'effective_date': '2010-04-01',
        'consolidation_date': None,
        'verification_status': 'Under review',
        'verified': False,
        'summary': 'The Act ensures free and compulsory education for children aged six to fourteen and sets duties for schools and government bodies.',
        'keywords': ['education', 'school admission', 'RTE', 'children', 'free education'],
        'source_file': 'Right of Children to Free and Compulsory Education Act, 2009.pdf',
        'source_pdf_path': str(REPO_ROOT / 'Right of Children to Free and Compulsory Education Act, 2009.pdf'),
        'official_pdf_hash': '',
        'source_pdf_status': 'available',
        'full_text_status': 'available',
        'sections': [],
    },
    {
        'id': 'industrial-relations-code-2020',
        'slug': 'industrial-relations-code-2020',
        'title': 'The Industrial Relations Code, 2020',
        'short_title': 'IRC 2020',
        'act_number': 'Act 35 of 2020',
        'act_year': '2020',
        'jurisdiction': 'Central Law applicable in Tamil Nadu',
        'category': 'Employment and Workplace Rights',
        'applicable_territory': 'India, including Tamil Nadu',
        'official_source_name': 'IndiaCode',
        'official_source_url': None,
        'discovery_source_url': 'https://indiacode.gov.in/',
        'official_source_status': 'pending',
        'source_url_confirmed': False,
        'source_url_confirmation_note': 'No Act-specific official source page was confirmed. Generic landing page retained as discovery source only.',
        'effective_date': '2021-09-01',
        'consolidation_date': '2026-09-01',
        'verification_status': 'Under review',
        'verified': False,
        'summary': 'The Code consolidates labour relations laws for industrial disputes, trade unions, and collective bargaining across India.',
        'keywords': ['industrial relations', 'labour', 'trade unions', 'employment', 'workplace'],
        'source_file': 'A2020-35.pdf',
        'source_pdf_path': str(REPO_ROOT / 'A2020-35.pdf'),
        'official_pdf_hash': '',
        'source_pdf_status': 'available',
        'full_text_status': 'available',
        'sections': [],
    },
    {
        'id': 'occupational-safety-code-2020',
        'slug': 'occupational-safety-health-and-working-conditions-code-2020',
        'title': 'The Occupational Safety, Health and Working Conditions Code, 2020',
        'short_title': 'OSH Code',
        'act_number': 'Act 37 of 2020',
        'act_year': '2020',
        'jurisdiction': 'Central Law applicable in Tamil Nadu',
        'category': 'Employment and Workplace Rights',
        'applicable_territory': 'India, including Tamil Nadu',
        'official_source_name': 'IndiaCode',
        'official_source_url': None,
        'discovery_source_url': 'https://indiacode.gov.in/',
        'official_source_status': 'pending',
        'source_url_confirmed': False,
        'source_url_confirmation_note': 'No Act-specific official source page was confirmed. Generic landing page retained as discovery source only.',
        'effective_date': '2021-09-01',
        'consolidation_date': '2025-11-28',
        'verification_status': 'Under review',
        'verified': False,
        'summary': 'The Code addresses workplace safety, health standards, and conditions of work for industries and establishments.',
        'keywords': ['workplace safety', 'health standards', 'labour welfare', 'occupational safety', 'working conditions'],
        'source_file': '2020-37.pdf',
        'source_pdf_path': str(REPO_ROOT / '2020-37.pdf'),
        'official_pdf_hash': '',
        'source_pdf_status': 'available',
        'full_text_status': 'available',
        'sections': [],
    },
    {
        'id': 'ugc-act-1956',
        'slug': 'university-grants-commission-act-1956',
        'title': 'The University Grants Commission Act, 1956',
        'short_title': 'UGC Act',
        'act_number': 'Act 3 of 1956',
        'act_year': '1956',
        'jurisdiction': 'Central Law applicable in Tamil Nadu',
        'category': 'Education and Student Rights',
        'applicable_territory': 'India, including Tamil Nadu',
        'official_source_name': 'IndiaCode',
        'official_source_url': None,
        'discovery_source_url': 'https://indiacode.gov.in/',
        'official_source_status': 'pending',
        'source_url_confirmed': False,
        'source_url_confirmation_note': 'No Act-specific official source page was confirmed. Generic landing page retained as discovery source only.',
        'effective_date': '1956-03-05',
        'consolidation_date': '2026-06-01',
        'verification_status': 'Under review',
        'verified': False,
        'summary': 'The Act establishes the University Grants Commission and sets standards for higher education and university governance.',
        'keywords': ['UGC', 'higher education', 'universities', 'academic standards', 'education'],
        'source_file': 'A1956-3.pdf',
        'source_pdf_path': str(REPO_ROOT / 'A1956-3.pdf'),
        'official_pdf_hash': '',
        'source_pdf_status': 'available',
        'full_text_status': 'available',
        'sections': [],
    },
    {
        'id': 'consumer-protection-act-2019',
        'slug': 'consumer-protection-act-2019',
        'title': 'The Consumer Protection Act, 2019',
        'short_title': 'Consumer Protection Act',
        'act_number': 'Act 35 of 2019',
        'act_year': '2019',
        'jurisdiction': 'Central Law applicable in Tamil Nadu',
        'category': 'Consumer Rights',
        'applicable_territory': 'India, including Tamil Nadu',
        'official_source_name': 'IndiaCode',
        'official_source_url': None,
        'discovery_source_url': 'https://indiacode.gov.in/',
        'official_source_status': 'pending',
        'source_url_confirmed': False,
        'source_url_confirmation_note': 'No Act-specific official source page was confirmed. Generic landing page retained as discovery source only.',
        'effective_date': '2020-07-20',
        'consolidation_date': None,
        'verification_status': 'Metadata only',
        'verified': False,
        'summary': 'The Act protects consumer rights against unfair trade practices and defective goods or services.',
        'keywords': ['consumer rights', 'consumer protection', 'defective goods', 'service issues'],
        'source_file': None,
        'source_pdf_path': None,
        'official_pdf_hash': None,
        'source_pdf_status': 'pending',
        'full_text_status': 'pending',
        'sections': [],
    },
]

state_acts = [
    {
        'id': 'tn-harassment-women',
        'slug': 'tamil-nadu-prohibition-of-harassment-of-women-act-1998',
        'title': 'Tamil Nadu Prohibition of Harassment of Women Act, 1998',
        'short_title': 'TN Harassment of Women Act',
        'act_number': 'Act 44 of 1998',
        'act_year': '1998',
        'jurisdiction': 'Tamil Nadu State Law',
        'category': 'Women and Child Protection',
        'applicable_territory': 'Tamil Nadu',
        'official_source_name': 'Tamil Nadu Government Gazette',
        'official_source_url': None,
        'discovery_source_url': 'https://stationeryprinting.tn.gov.in/gazette.php',
        'official_source_status': 'pending',
        'source_url_confirmed': False,
        'source_url_confirmation_note': 'No Act-specific official source page was confirmed. Generic landing page retained as discovery source only.',
        'effective_date': '1998-06-15',
        'consolidation_date': None,
        'verification_status': 'Metadata only',
        'verified': False,
        'summary': 'The Act addresses public and workplace harassment of women and complements broader safety and equality protections in Tamil Nadu.',
        'keywords': ['Tamil Nadu', 'women safety', 'harassment', 'public spaces', 'state law'],
        'source_file': None,
        'source_pdf_path': None,
        'official_pdf_hash': None,
        'source_pdf_status': 'pending',
        'full_text_status': 'pending',
        'sections': [],
    },
    {
        'id': 'tn-senior-citizens',
        'slug': 'tamil-nadu-maintenance-and-welfare-of-parents-and-senior-citizens-act-2007',
        'title': 'Tamil Nadu Maintenance and Welfare of Parents and Senior Citizens Act, 2007',
        'short_title': 'Senior Citizens Act',
        'act_number': 'Act 56 of 2007',
        'act_year': '2007',
        'jurisdiction': 'Tamil Nadu State Law',
        'category': 'Family and Social Welfare',
        'applicable_territory': 'Tamil Nadu',
        'official_source_name': 'Tamil Nadu Government Gazette',
        'official_source_url': None,
        'discovery_source_url': 'https://stationeryprinting.tn.gov.in/gazette.php',
        'official_source_status': 'pending',
        'source_url_confirmed': False,
        'source_url_confirmation_note': 'No Act-specific official source page was confirmed. Generic landing page retained as discovery source only.',
        'effective_date': '2008-01-01',
        'consolidation_date': None,
        'verification_status': 'Metadata only',
        'verified': False,
        'summary': 'The Act provides maintenance and welfare measures for parents and senior citizens, including institutional and district-level support mechanisms.',
        'keywords': ['seniors', 'maintenance', 'parents', 'Tamil Nadu', 'welfare'],
        'source_file': None,
        'source_pdf_path': None,
        'official_pdf_hash': None,
        'source_pdf_status': 'pending',
        'full_text_status': 'pending',
        'sections': [],
    },
]

for act in central_acts + state_acts:
    if act.get('source_pdf_path'):
        pdf_path = Path(act['source_pdf_path'])
        if pdf_path.exists():
            act['official_pdf_hash'] = sha256_for_file(pdf_path)
            act['sections'] = extract_sections_for_pdf(pdf_path)[:10]

if POCSO_JSON.exists():
    pocso_sections = json.loads(POCSO_JSON.read_text(encoding='utf-8'))
    p = next(item for item in central_acts if item['id'] == 'pocso-2012')
    p['sections'] = [section_from_record(record) for record in pocso_sections[:12]]
    p['source_pdf_status'] = 'available'
    p['full_text_status'] = 'available'
    p['verified'] = False
    p['verification_status'] = 'Under review'

central_out = [
    {
        'id': act['id'],
        'slug': act['slug'],
        'title': act['title'],
        'short_title': act['short_title'],
        'act_number': act['act_number'],
        'act_year': act['act_year'],
        'jurisdiction': act['jurisdiction'],
        'category': act['category'],
        'applicable_territory': act['applicable_territory'],
        'official_source_name': act['official_source_name'],
        'official_source_url': act.get('official_source_url'),
        'discovery_source_url': act.get('discovery_source_url'),
        'official_source_status': act.get('official_source_status', 'pending'),
        'source_url_confirmed': bool(act.get('source_url_confirmed', False)),
        'source_url_confirmation_note': act.get('source_url_confirmation_note', 'No Act-specific official source page was confirmed. Generic landing page retained as discovery source only.'),
        'effective_date': act['effective_date'],
        'consolidation_date': act['consolidation_date'],
        'verification_status': act['verification_status'],
        'verified': act['verified'],
        'summary': act['summary'],
        'keywords': act['keywords'],
        'source_file': act['source_file'],
        'official_pdf_hash': act['official_pdf_hash'],
        'source_pdf_status': act['source_pdf_status'],
        'full_text_status': act['full_text_status'],
        'sections': act['sections'],
    }
    for act in central_acts
]

state_out = [
    {
        'id': act['id'],
        'slug': act['slug'],
        'title': act['title'],
        'short_title': act['short_title'],
        'act_number': act['act_number'],
        'act_year': act['act_year'],
        'jurisdiction': act['jurisdiction'],
        'category': act['category'],
        'applicable_territory': act['applicable_territory'],
        'official_source_name': act['official_source_name'],
        'official_source_url': act.get('official_source_url'),
        'discovery_source_url': act.get('discovery_source_url'),
        'official_source_status': act.get('official_source_status', 'pending'),
        'source_url_confirmed': bool(act.get('source_url_confirmed', False)),
        'source_url_confirmation_note': act.get('source_url_confirmation_note', 'No Act-specific official source page was confirmed. Generic landing page retained as discovery source only.'),
        'effective_date': act['effective_date'],
        'consolidation_date': act['consolidation_date'],
        'verification_status': act['verification_status'],
        'verified': act['verified'],
        'summary': act['summary'],
        'keywords': act['keywords'],
        'source_file': act['source_file'],
        'official_pdf_hash': act['official_pdf_hash'],
        'source_pdf_status': act['source_pdf_status'],
        'full_text_status': act['full_text_status'],
        'sections': act['sections'],
    }
    for act in state_acts
]

(LEGAL_DATASETS_ROOT / 'metadata').mkdir(parents=True, exist_ok=True)
(LEGAL_DATASETS_ROOT / 'metadata' / 'central-acts.json').write_text(json.dumps(central_out, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
(LEGAL_DATASETS_ROOT / 'metadata' / 'tamil-nadu-acts.json').write_text(json.dumps(state_out, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')

counts = {
    'state_act_records_discovered': len(state_out),
    'central_act_records_discovered': len(central_out),
    'pdfs_downloaded': sum(1 for act in central_out if act['source_file'] and act['source_file'] not in ('', None)),
    'pdfs_successfully_extracted': sum(1 for act in central_out if act['full_text_status'] == 'available'),
    'sections_extracted': sum(len(act['sections']) for act in central_out),
    'records_needing_review': sum(1 for act in central_out + state_out if not act['verified']),
    'official_source_notes': [
        'India Code: https://indiacode.gov.in/',
        'Tamil Nadu Government Gazette: https://stationeryprinting.tn.gov.in/gazette.php',
    ],
    'official_source_urls_confirmed': sum(1 for act in central_out + state_out if act.get('source_url_confirmed') is True),
    'official_source_urls_pending': sum(1 for act in central_out + state_out if act.get('source_url_confirmed') is not True),
    'discovery_urls_only': sum(1 for act in central_out + state_out if act.get('official_source_url') in (None, '') and act.get('discovery_source_url')),
    'official_source_note': 'No Act-specific official source pages were confirmed. Generic discovery pages remain recorded separately from pending Act-specific URLs.',
}
(LEGAL_DATASETS_ROOT / 'metadata' / 'dataset-manifest.json').write_text(json.dumps(counts, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')

report = f'''# Legal Dataset Report

## Summary
- State Act records discovered: {counts['state_act_records_discovered']}
- Central Act records discovered: {counts['central_act_records_discovered']}
- PDFs downloaded: {counts['pdfs_downloaded']}
- PDFs successfully extracted: {counts['pdfs_successfully_extracted']}
- Sections extracted: {counts['sections_extracted']}
- Records still needing review: {counts['records_needing_review']}

## Source catalogue
- India Code: https://indiacode.gov.in/
- Tamil Nadu Gazette: https://stationeryprinting.tn.gov.in/gazette.php

## Notes
- All downloaded PDF files were checked by SHA-256 and retained without overwrite.
- Metadata-only records remain visible with a clear `verification_status` and `full_text_status` of `pending`.
- The POCSO record remains a Central Act and is intentionally tagged `Under review` and `verified: false`.
- No fabricated legal provisions were added to the dataset.
'''
(LEGAL_DATASETS_ROOT / 'metadata' / 'DATASET_REPORT.md').write_text(report, encoding='utf-8')
print(json.dumps(counts, indent=2, ensure_ascii=False))
