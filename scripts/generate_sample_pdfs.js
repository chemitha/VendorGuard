const fs = require('fs');
const path = require('path');

function createPdf(title, subtitle, sections) {
  let streamContent = `BT
/F1 16 Tf
50 740 Td
(${title}) Tj
/F1 10 Tf
0 -20 Td
(${subtitle}) Tj
/F2 9 Tf
0 -15 Td
(=================================================================================) Tj
`;

  let yOffset = -20;
  for (const [secTitle, secLines] of sections) {
    streamContent += `
/F1 11 Tf
0 ${yOffset} Td
(${secTitle}) Tj
/F2 9 Tf
`;
    yOffset = -14;
    for (const line of secLines) {
      streamContent += `
0 ${yOffset} Td
(${line.replace(/[()]/g, '')}) Tj
`;
      yOffset = -13;
    }
    yOffset = -18;
  }

  streamContent += `
/F1 8 Tf
0 -30 Td
(AUTHENTICATED COMPLIANCE RECORD -- VENDORGUARD AUTOMATED SYSTEM -- SHA-256 VERIFIED) Tj
ET`;

  const streamBuf = Buffer.from(streamContent, 'utf-8');

  // Build PDF structure
  const header = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  
  let body = '';
  const offsets = [];

  // Obj 1: Catalog
  offsets.push(header.length + body.length);
  body += '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';

  // Obj 2: Pages
  offsets.push(header.length + body.length);
  body += '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';

  // Obj 3: Page
  offsets.push(header.length + body.length);
  body += `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj\n`;

  // Obj 4: Stream
  offsets.push(header.length + body.length);
  body += `4 0 obj\n<< /Length ${streamBuf.length} >>\nstream\n${streamContent}\nendstream\nendobj\n`;

  // Obj 5: Font F1
  offsets.push(header.length + body.length);
  body += '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n';

  // Obj 6: Font F2
  offsets.push(header.length + body.length);
  body += '6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';

  const startXref = header.length + body.length;
  let xref = `xref\n0 7\n0000000000 65535 f \n`;
  for (const off of offsets) {
    xref += String(off).padStart(10, '0') + ' 00000 n \n';
  }

  const trailer = `trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;

  return Buffer.concat([
    Buffer.from(header, 'binary'),
    Buffer.from(body, 'binary'),
    Buffer.from(xref, 'binary'),
    Buffer.from(trailer, 'binary')
  ]);
}

const dir = path.join(process.cwd(), 'public', 'samples');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Generate ACORD 25 Sample PDF
const acordSections = [
  ['PRODUCER & INSURED DETAILS', [
    'PRODUCER: Marsh & McLennan Agency LLC, 1166 Ave of Americas, New York, NY 10036',
    'INSURED: Commercial Express HVAC Inc / Apex Logistics LLC / Mid-Atlantic Freight',
    'CONTACT: compliance@acmelogistics.com | Direct AP Line: (404) 555-0199'
  ]],
  ['COVERAGES & POLICY LIMITS', [
    '[X] COMMERCIAL GENERAL LIABILITY (Occurrence): Policy #POL-GL-891042',
    '    EACH OCCURRENCE: $1,000,000   |   GENERAL AGGREGATE: $2,000,000',
    '[X] AUTOMOBILE LIABILITY (Any Auto): Policy #POL-AL-209411 | Limit: $1,000,000 CSL',
    '[X] UMBRELLA / EXCESS LIABILITY: Policy #POL-UMB-77192 | Limit: $5,000,000',
    'POLICY EXPIRATION: Sep 30, 2026 / Oct 24, 2026 / Feb 10, 2027'
  ]],
  ['CERTIFICATE HOLDER & SPECIAL PROVISIONS', [
    'CERTIFICATE HOLDER: Acme Logistics Inc., 100 Logistics Blvd, Suite 400, Atlanta GA 30301',
    'ADDITIONAL INSURED: Acme Logistics Inc. is named as Additional Insured on General Liability.',
    'WAIVER OF SUBROGATION: Endorsed in favor of Certificate Holder per written contract.'
  ]],
  ['AUTHORIZED REPRESENTATIVE', [
    'SIGNATURE: David K. Vance, CPCU (Digital Stamp ID: ACME-SEC-9921)',
    'UNDERWRITER: Travelers Property Casualty Co of America (NAIC #25674)'
  ]]
];

const acordPdf = createPdf(
  'ACORD 25 CERTIFICATE OF LIABILITY INSURANCE',
  'CERTIFICATE OF INSURANCE - PRODUCER COPY',
  acordSections
);
fs.writeFileSync(path.join(dir, 'acord25_sample.pdf'), acordPdf);
fs.writeFileSync(path.join(dir, 'COI_ApexLogistics_2026.pdf'), acordPdf);
fs.writeFileSync(path.join(dir, 'COI_CommercialExpress_2027.pdf'), acordPdf);

// Generate W-9 Sample PDF
const w9Sections = [
  ['ENTITY & TAXPAYER IDENTIFICATION', [
    'NAME OF ENTITY: Commercial Express HVAC Inc / FlexTalent Solutions / Apex Logistics',
    'BUSINESS NAME: Same as above (DBA: Registered Enterprise AP Vendor)',
    'FEDERAL TAX CLASSIFICATION: [X] Corporation / LLC - Form 1120S'
  ]],
  ['PART I: TAXPAYER IDENTIFICATION NUMBER (TIN)', [
    'EMPLOYER IDENTIFICATION NUMBER (EIN): XX-XXX5829 / XX-XXX2019',
    'IRS TIN MATCHING: Verified match on IRS e-Services database',
    'EXEMPT PAYEE CODE: Standard commercial payee (Subject to 1099-NEC reporting)'
  ]],
  ['PART II: CERTIFICATION & SIGNATURE', [
    'CERTIFICATION: Under penalties of perjury, I certify the TIN shown is correct.',
    'BACKUP WITHHOLDING: Not subject to backup withholding under IRC Section 3406(a)(1)(C).',
    'U.S. CITIZEN/PERSON: Confirmed U.S. domestic corporation or legal entity.',
    'AUTHORIZED SIGNATURE: David K. Vance, Chief Financial Officer | Certified & Dated'
  ]],
  ['REQUESTER INFORMATION', [
    'REQUESTER: Acme Logistics Inc., AP Compliance Division, 100 Logistics Blvd, Suite 400'
  ]]
];

const w9Pdf = createPdf(
  'IRS FORM W-9 (REV. OCTOBER 2024)',
  'REQUEST FOR TAXPAYER IDENTIFICATION NUMBER AND CERTIFICATION',
  w9Sections
);
fs.writeFileSync(path.join(dir, 'w9_sample.pdf'), w9Pdf);
fs.writeFileSync(path.join(dir, 'W9_CommercialExpress.pdf'), w9Pdf);
fs.writeFileSync(path.join(dir, 'W9_ApexLogistics.pdf'), w9Pdf);

console.log('Sample PDFs generated successfully!');
