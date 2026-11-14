# Legal Dataset Provenance Audit

## Scope
- Reviewed files: `legal-datasets/metadata/central-acts.json`, `legal-datasets/metadata/tamil-nadu-acts.json`, `legal-datasets/metadata/dataset-manifest.json`, and `legal-datasets/metadata/DATASET_REPORT.md`.
- No dataset contents were changed during this audit.
- Source URL audit note: the India Code home page and Tamil Nadu Gazette landing page were reachable as generic landing pages; the dataset URLs themselves are not verified Act-specific source URLs for each record.

## Provenance table

| # | Exact official Act title | Act number and year | Jurisdiction | Official source institution | Exact source URL | URL actually opened successfully? | Local PDF exists? | Local PDF filename | SHA-256 checksum | Text extracted? | # extracted sections | Verification / review status |
|---|---|---|---|---|---|---|---|---|---|---|---:|---|
| 1 | The Protection of Children from Sexual Offences Act, 2012 | Act 32 of 2012, 2012 | Central Law applicable in Tamil Nadu | IndiaCode | Act-specific source unavailable; discovery source retained: https://indiacode.gov.in/ | No exact Act-specific source confirmed | Yes | A2012-32.pdf | 5a173cc87d51624663dceb588d20a468ef49505be4fa131609d5867ac7dab021 | Yes | 12 | Under review |
| 2 | The Right of Children to Free and Compulsory Education Act, 2009 | Act 35 of 2009, 2009 | Central Law applicable in Tamil Nadu | IndiaCode | Act-specific source unavailable; discovery source retained: https://indiacode.gov.in/ | No exact Act-specific source confirmed | Yes | Right of Children to Free and Compulsory Education Act, 2009.pdf | 1c4b9f693279057045dd9ef24daa50d3939f6770110681b9fe3dec428f287fb7 | Yes | 10 | Under review |
| 3 | The Industrial Relations Code, 2020 | Act 35 of 2020, 2020 | Central Law applicable in Tamil Nadu | IndiaCode | Act-specific source unavailable; discovery source retained: https://indiacode.gov.in/ | No exact Act-specific source confirmed | Yes | A2020-35.pdf | 903060e794247dc60e355e45b2e8c8bf5e5d9442babad7f5a1836ba34e527697 | Yes | 10 | Under review |
| 4 | The Occupational Safety, Health and Working Conditions Code, 2020 | Act 37 of 2020, 2020 | Central Law applicable in Tamil Nadu | IndiaCode | Act-specific source unavailable; discovery source retained: https://indiacode.gov.in/ | No exact Act-specific source confirmed | Yes | 2020-37.pdf | d72c3c51f58617de86d457c17fda6f73e16bf53eacb637012998df4ebf2ae214 | Yes | 10 | Under review |
| 5 | The University Grants Commission Act, 1956 | Act 3 of 1956, 1956 | Central Law applicable in Tamil Nadu | IndiaCode | Act-specific source unavailable; discovery source retained: https://indiacode.gov.in/ | No exact Act-specific source confirmed | Yes | A1956-3.pdf | 03d53e8f9ad519646041b829fb82e424c105337dfe7fa382216db882b05994e3 | Yes | 10 | Under review |
| 6 | The Consumer Protection Act, 2019 | Act 35 of 2019, 2019 | Central Law applicable in Tamil Nadu | IndiaCode | Act-specific source unavailable; discovery source retained: https://indiacode.gov.in/ | No exact Act-specific source confirmed | No | N/A | N/A | No | 0 | Metadata only |
| 7 | Tamil Nadu Prohibition of Harassment of Women Act, 1998 | Act 44 of 1998, 1998 | Tamil Nadu State Law | Tamil Nadu Government Gazette | Act-specific source unavailable; discovery source retained: https://stationeryprinting.tn.gov.in/gazette.php | No exact Act-specific source confirmed | No | N/A | N/A | No | 0 | Metadata only |
| 8 | Tamil Nadu Maintenance and Welfare of Parents and Senior Citizens Act, 2007 | Act 56 of 2007, 2007 | Tamil Nadu State Law | Tamil Nadu Government Gazette | Act-specific source unavailable; discovery source retained: https://stationeryprinting.tn.gov.in/gazette.php | No exact Act-specific source confirmed | No | N/A | N/A | No | 0 | Metadata only |

## Audit checks

- State Acts incorrectly classified as Central Acts: No. The two Tamil Nadu entries are labeled `Tamil Nadu State Law` and are specific to Tamil Nadu.
- Central Acts incorrectly classified as Tamil Nadu State Acts: No. The six central entries are all labeled `Central Law applicable in Tamil Nadu`.
- Duplicate records: No duplicate IDs, titles, or slugs were found across the two metadata files.
- Exact Act-specific source pages: None confirmed for the eight records. All current URLs are generic discovery pages only.
- Generic homepage URLs: The dataset now keeps discovery URLs separately from pending Act-specific URLs and does not present generic pages as if they were direct official source pages.
- PDF matches metadata title and year: Not reliably. The PDF file names include act numbers/years, but several names do not match the full official Act title string exactly, and the embedded PDF document titles are empty in the downloaded files. This means the files are usable as downloaded artifacts but not as fully validated title-matched source records.
- Placeholder or incomplete section texts: No empty or obviously placeholder section entries were found among the extracted sections, but the extraction is not a full verified legal transcription for every section and the metadata-only records still have no sections.
- Dataset counts vs. actual files: The manifest counts are internally consistent with the available root-level central PDFs (5 downloaded and extracted) and the two metadata-only Tamil Nadu records, but they do not reflect the absence of official PDFs for the Consumer Protection Act and the two Tamil Nadu acts. The separate POCSO PDF under `legal-datasets/pocso/` is not counted in the root dataset-manifest entries.

## Missing information and next downloads

### Missing information
- Exact Act-specific URLs for every record. None were confirmed in this pass.
- Official PDFs for:
  - The Consumer Protection Act, 2019
  - Tamil Nadu Prohibition of Harassment of Women Act, 1998
  - Tamil Nadu Maintenance and Welfare of Parents and Senior Citizens Act, 2007
- Human review / source-confirmed title matching for PDF documents whose embedded metadata is blank.
- Full text extraction and section review status for the metadata-only records.
- Official source page references for each section in the extracted records (`sourceUrl` is null in the current dataset).

### Recommended records to download next
1. Tamil Nadu Prohibition of Harassment of Women Act, 1998
2. Tamil Nadu Maintenance and Welfare of Parents and Senior Citizens Act, 2007
3. The Consumer Protection Act, 2019
4. Any remaining central act whose PDF is available from India Code but not yet confirmed against the exact official Act title and year.
5. Every record still needs a verified Act-specific page URL from the official publisher before being treated as a final source citation.

## Conclusion
The present dataset is usable as a constrained, transparent local catalogue with honest review labels, but it is not yet a fully sourced and officially verified legal corpus. The main gap is that the metadata uses generic home pages and several records remain metadata-only or source-unverified.
