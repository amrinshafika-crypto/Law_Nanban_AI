import type { LegalAidResource } from '@/types';

export interface DistrictLegalAidContact {
  district: string;
  address: string | null;
  email: string;
  phone: string;
}

// District names follow the current 38-district administrative list. Contact
// details are transcribed from the official TNSLSA DLSA directory PDF.
export const TAMIL_NADU_DLSA_CONTACTS: DistrictLegalAidContact[] = [
  { district: 'Ariyalur', address: 'District Court Buildings, Ariyalur 621704', email: 'dlsa.ariyalur@gmail.com', phone: '04329-223333' },
  { district: 'Chengalpattu', address: null, email: 'dlsachengalpattu@gmail.com', phone: '044-27428840' },
  { district: 'Chennai', address: 'Ground Floor, ADR Building, North Fort Road, High Court Campus, Chennai 600104', email: 'dlsachennai@gmail.com', phone: '044-25332412' },
  { district: 'Coimbatore', address: 'District Court Buildings, Coimbatore 641018', email: 'dlsacoimbatore@gmail.com', phone: '0422-2200009' },
  { district: 'Cuddalore', address: 'District Court Buildings, Cuddalore 607001', email: 'dlsacuddalore@gmail.com', phone: '04142-212660' },
  { district: 'Dharmapuri', address: 'District Court Buildings, Dharmapuri 636701', email: 'dlsadharmapuri@gmail.com', phone: '04342-233781' },
  { district: 'Dindigul', address: 'District Court Buildings, Dindigul 624001', email: 'dlsadindigul@gmail.com', phone: '0451-2460107' },
  { district: 'Erode', address: 'District Court Buildings, Erode 638011', email: 'dlsaerode1@gmail.com', phone: '0424-2214282' },
  { district: 'Kallakurichi', address: 'District Court Buildings, Kallakurichi 606202', email: 'tlsckallakurichi@gmail.com', phone: '04151-226730' },
  { district: 'Kancheepuram', address: 'District Court Buildings, Kancheepuram 631502', email: 'tlsakpm@gmail.com', phone: '044-27222975' },
  { district: 'Kanniyakumari', address: 'District Court Buildings, Nagercoil 629001', email: 'dlsakanyakumari1@gmail.com', phone: '04652-291744' },
  { district: 'Karur', address: 'District Court Buildings, Karur 639007', email: 'karurdlsa@gmail.com', phone: '04324-296570' },
  { district: 'Krishnagiri', address: 'District Court Buildings, Krishnagiri 635001', email: 'dlsakrishnagiri@gmail.com', phone: '04343-225069' },
  { district: 'Madurai', address: 'District Court Buildings, Madurai 625020', email: 'dlsamadurai1@gmail.com', phone: '0452-2535067' },
  { district: 'Mayiladuthurai', address: 'Combined Court Building, Mayiladuthurai 609001', email: 'dlsamayiladuthurai@gmail.com', phone: '04364-242834' },
  { district: 'Nagapattinam', address: 'District Court Buildings, Nagapattinam 611001', email: 'dlsanagapattinam@gmail.com', phone: '04365-248121' },
  { district: 'Namakkal', address: 'District Court Buildings, Namakkal 637001', email: 'dlsanamakkal@gmail.com', phone: '04286-299855' },
  { district: 'The Nilgiris', address: 'District Court Buildings, Uthagamandalam 643001', email: 'dlsanilgiris@gmail.com', phone: '0423-2444277' },
  { district: 'Perambalur', address: 'District Court Buildings, Perambalur 621212', email: 'dlsaperambalur1@gmail.com', phone: '04328-296206' },
  { district: 'Pudukkottai', address: 'District Court Buildings, Pudukkottai 622001', email: 'dlsapudukkottai@gmail.com', phone: '04322-220585' },
  { district: 'Ranipet', address: 'Combined Court Buildings, Ranipet 632401', email: 'dlsaranipet@gmail.com', phone: '04172-226477' },
  { district: 'Ramanathapuram', address: 'District Court Buildings, Ramanathapuram 623503', email: 'dlsaramanathapuram@gmail.com', phone: '04567-230444' },
  { district: 'Salem', address: 'District Court Buildings, Salem 636007', email: 'dlsasalem1@gmail.com', phone: '0427-2420011' },
  { district: 'Sivaganga', address: 'District Court Buildings, Sivagangai 630562', email: 'dlsasivagangai@gmail.com', phone: '04575-242561' },
  { district: 'Tenkasi', address: 'Combined Court Buildings, Tenkasi 627811', email: 'dlsatenkasi@gmail.com', phone: '04633-221175' },
  { district: 'Thanjavur', address: 'District Court Buildings, Thanjavur 613001', email: 'dlsathanjavur@gmail.com', phone: '04362-230776' },
  { district: 'Theni', address: 'District Court Buildings, Theni 625531', email: 'thenidlsa@gmail.com', phone: '04546-291566' },
  { district: 'Tirupathur', address: 'District Court Buildings, Tirupathur 635601', email: 'dlsatirupathur@gmail.com', phone: '04179-222077' },
  { district: 'Tiruppur', address: 'District Court Buildings, Tiruppur 641601', email: 'dlsatiruppur@gmail.com', phone: '0421-2230123' },
  { district: 'Tiruvallur', address: 'District Court Buildings, Tiruvallur 602001', email: 'dlsatiruvallur1@gmail.com', phone: '044-27660120' },
  { district: 'Tiruvarur', address: 'District Court Buildings, Tiruvarur 610001', email: 'dlsatiruvarur@gmail.com', phone: '04366-226767' },
  { district: 'Tiruchirappalli', address: 'District Court Buildings, Tiruchirappalli 620001', email: 'dlsatiruchirappalli@gmail.com', phone: '0431-2460125' },
  { district: 'Tirunelveli', address: 'District Court Buildings, Palayamkottai 627002', email: 'dlsa1tirunelveli@gmail.com', phone: '0462-2572689' },
  { district: 'Tiruvannamalai', address: 'District Court Buildings, Tiruvannamalai 606601', email: 'dlsatiruvannamalai@gmail.com', phone: '04175-232845' },
  { district: 'Thoothukkudi', address: 'District Court Buildings, Thoothukkudi 628003', email: 'dlsathoothukkudi@gmail.com', phone: '0461-2335111' },
  { district: 'Vellore', address: 'District Court Buildings, Vellore 632009', email: 'dlsavellore@gmail.com', phone: '0416-2255599' },
  { district: 'Viluppuram', address: 'District Court Buildings, Villupuram 605602', email: 'dlsavillupuram@gmail.com', phone: '04146-228000' },
  { district: 'Virudhunagar', address: 'District Court Buildings, Srivilliputhur 626125', email: 'dlsasrivilliputtur@gmail.com', phone: '04563-260310' },
];

export const TAMIL_NADU_DLSA_RESOURCES: LegalAidResource[] = TAMIL_NADU_DLSA_CONTACTS.map((contact) => ({
  id: `tn-dlsa-${contact.district.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
  name: `${contact.district} District Legal Services Authority`,
  authority_type: 'district',
  state: 'Tamil Nadu',
  district: contact.district,
  address: contact.address,
  phone: contact.phone,
  email: contact.email,
  website: null,
  description: 'District-level legal-aid authority. Contact details are listed in the official TNSLSA directory.',
  services: ['Free legal aid', 'Legal advice'],
  eligibility: null,
  language: ['en', 'ta'],
  verified: true,
}));

export function filterLegalAidDirectory(resources: LegalAidResource[], query: string, authorityType: string, district: string) {
  const term = query.trim().toLocaleLowerCase();
  return resources.filter((resource) => {
    const matchesType = authorityType === 'all' || resource.authority_type === authorityType;
    const matchesDistrict = district === 'all' || resource.district === district;
    const matchesQuery = !term || [resource.name, resource.authority_type, resource.state, resource.district, resource.address, resource.description, resource.eligibility, resource.email, resource.phone, ...resource.services]
      .some((value) => value?.toLocaleLowerCase().includes(term));
    return matchesType && matchesDistrict && matchesQuery;
  });
}

export const TNSLSA_DIRECTORY_URL = 'https://tamilnadu.nalsa.gov.in/directory/';
export const TNSLSA_DLSA_PDF_URL = 'https://cdnbbsr.s3waas.gov.in/s30013bcbcc8a03817c639a9e89c4ad3b7/uploads/2025/09/202607022095759153.pdf';
