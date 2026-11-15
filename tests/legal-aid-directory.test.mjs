import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const expected = [
  ['Ariyalur', 'dlsa.ariyalur@gmail.com', '04329-223333'], ['Chengalpattu', 'dlsachengalpattu@gmail.com', '044-27428840'],
  ['Chennai', 'dlsachennai@gmail.com', '044-25332412'], ['Coimbatore', 'dlsacoimbatore@gmail.com', '0422-2200009'],
  ['Cuddalore', 'dlsacuddalore@gmail.com', '04142-212660'], ['Dharmapuri', 'dlsadharmapuri@gmail.com', '04342-233781'],
  ['Dindigul', 'dlsadindigul@gmail.com', '0451-2460107'], ['Erode', 'dlsaerode1@gmail.com', '0424-2214282'],
  ['Kallakurichi', 'tlsckallakurichi@gmail.com', '04151-226730'], ['Kancheepuram', 'tlsakpm@gmail.com', '044-27222975'],
  ['Kanniyakumari', 'dlsakanyakumari1@gmail.com', '04652-291744'], ['Karur', 'karurdlsa@gmail.com', '04324-296570'],
  ['Krishnagiri', 'dlsakrishnagiri@gmail.com', '04343-225069'], ['Madurai', 'dlsamadurai1@gmail.com', '0452-2535067'],
  ['Mayiladuthurai', 'dlsamayiladuthurai@gmail.com', '04364-242834'], ['Nagapattinam', 'dlsanagapattinam@gmail.com', '04365-248121'],
  ['Namakkal', 'dlsanamakkal@gmail.com', '04286-299855'], ['The Nilgiris', 'dlsanilgiris@gmail.com', '0423-2444277'],
  ['Perambalur', 'dlsaperambalur1@gmail.com', '04328-296206'], ['Pudukkottai', 'dlsapudukkottai@gmail.com', '04322-220585'],
  ['Ranipet', 'dlsaranipet@gmail.com', '04172-226477'], ['Ramanathapuram', 'dlsaramanathapuram@gmail.com', '04567-230444'],
  ['Salem', 'dlsasalem1@gmail.com', '0427-2420011'], ['Sivaganga', 'dlsasivagangai@gmail.com', '04575-242561'],
  ['Tenkasi', 'dlsatenkasi@gmail.com', '04633-221175'], ['Thanjavur', 'dlsathanjavur@gmail.com', '04362-230776'],
  ['Theni', 'thenidlsa@gmail.com', '04546-291566'], ['Tirupathur', 'dlsatirupathur@gmail.com', '04179-222077'],
  ['Tiruppur', 'dlsatiruppur@gmail.com', '0421-2230123'], ['Tiruvallur', 'dlsatiruvallur1@gmail.com', '044-27660120'],
  ['Tiruvarur', 'dlsatiruvarur@gmail.com', '04366-226767'], ['Tiruchirappalli', 'dlsatiruchirappalli@gmail.com', '0431-2460125'],
  ['Tirunelveli', 'dlsa1tirunelveli@gmail.com', '0462-2572689'], ['Tiruvannamalai', 'dlsatiruvannamalai@gmail.com', '04175-232845'],
  ['Thoothukkudi', 'dlsathoothukkudi@gmail.com', '0461-2335111'], ['Vellore', 'dlsavellore@gmail.com', '0416-2255599'],
  ['Viluppuram', 'dlsavillupuram@gmail.com', '04146-228000'], ['Virudhunagar', 'dlsasrivilliputtur@gmail.com', '04563-260310'],
];

test('contains exactly the current 38 districts and their official contacts', async () => {
  const vite = await createServer({ configFile: fileURLToPath(new URL('../vite.config.ts', import.meta.url)), server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { TAMIL_NADU_DLSA_CONTACTS: contacts } = await vite.ssrLoadModule('/src/pages/citizen/legalAidDirectory.ts');
    assert.equal(contacts.length, 38);
    assert.equal(new Set(contacts.map((item) => item.district)).size, 38);
    assert.deepEqual(contacts.map(({ district, email, phone }) => [district, email, phone]), expected);
    assert.equal(contacts.find((item) => item.district === 'Chengalpattu')?.address, null);
    assert.ok(contacts.every((item) => item.address || item.district === 'Chengalpattu'));
  } finally {
    await vite.close();
  }
});

test('every telephone and email contact generates a valid destination; sources are absolute HTTPS', async () => {
  const vite = await createServer({ configFile: fileURLToPath(new URL('../vite.config.ts', import.meta.url)), server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { TAMIL_NADU_DLSA_CONTACTS: contacts, TNSLSA_DIRECTORY_URL, TNSLSA_DLSA_PDF_URL } = await vite.ssrLoadModule('/src/pages/citizen/legalAidDirectory.ts');
    const { safePhoneUrl } = await vite.ssrLoadModule('/src/lib/links.ts');
    for (const contact of contacts) {
      const tel = safePhoneUrl(contact.phone);
      assert.match(tel || '', /^tel:\+?\d{5,15}$/);
      assert.match(`mailto:${contact.email}`, /^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/);
    }
    for (const source of [TNSLSA_DIRECTORY_URL, TNSLSA_DLSA_PDF_URL]) {
      const url = new URL(source);
      assert.equal(url.protocol, 'https:');
      assert.ok(url.hostname);
    }
    assert.equal(new URL(TNSLSA_DIRECTORY_URL).pathname, '/directory/');
    assert.match(TNSLSA_DLSA_PDF_URL, /\.pdf$/);
  } finally {
    await vite.close();
  }
});

test('district selection and search filter the official district records', async () => {
  const vite = await createServer({ configFile: fileURLToPath(new URL('../vite.config.ts', import.meta.url)), server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { TAMIL_NADU_DLSA_RESOURCES: resources, filterLegalAidDirectory } = await vite.ssrLoadModule('/src/pages/citizen/legalAidDirectory.ts');
    assert.equal(filterLegalAidDirectory(resources, '', 'district', 'Chennai').length, 1);
    assert.equal(filterLegalAidDirectory(resources, '', 'district', 'Chennai')[0].email, 'dlsachennai@gmail.com');
    assert.equal(filterLegalAidDirectory(resources, 'kanniyakumari', 'district', 'all')[0].district, 'Kanniyakumari');
    assert.equal(filterLegalAidDirectory(resources, 'no-such-district', 'district', 'all').length, 0);
  } finally {
    await vite.close();
  }
});
