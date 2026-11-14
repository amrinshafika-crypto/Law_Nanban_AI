-- The original reference seed marked every row verified without recording a
-- reviewer or verification date. Clear that unsupported status for those rows.
-- The Citizen Rights catalogue links to individually checked official sources.
UPDATE legal_references
SET verified = false
WHERE title IN (
  'Bharatiya Nyaya Sanhita, 2023',
  'Bharatiya Nagarik Suraksha Sanhita, 2023',
  'Bharatiya Sakshya Adhiniyam, 2023',
  'Constitution of India — Article 21',
  'Constitution of India — Article 39A',
  'Constitution of India — Article 22',
  'Information Technology Act, 2000',
  'Consumer Protection Act, 2019',
  'Legal Services Authorities Act, 1987',
  'Right to Information Act, 2005',
  'Hindu Marriage Act, 1955',
  'Code of Civil Procedure, 1908',
  'Supreme Court of India — Speedy Trial Jurisprudence',
  'Cybercrime Reporting — National Cyber Crime Reporting Portal'
)
AND verified = true;
