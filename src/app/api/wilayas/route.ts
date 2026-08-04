import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Complete list of 58 Algerian Wilayas
const WILAYAS_DATA = [
  { code: '01', nameFr: 'Adrar', nameAr: 'أدرار', taxZone: 'sud', abattementRate: 0.60 },
  { code: '02', nameFr: 'Chlef', nameAr: 'الشلف', taxZone: 'nord', abattementRate: 0 },
  { code: '03', nameFr: 'Laghouat', nameAr: 'الأغواط', taxZone: 'hauts_plateaux', abattementRate: 0.20 },
  { code: '04', nameFr: 'Oum El Bouaghi', nameAr: 'أم البواقي', taxZone: 'hauts_plateaux', abattementRate: 0.20 },
  { code: '05', nameFr: 'Batna', nameAr: 'باتنة', taxZone: 'hauts_plateaux', abattementRate: 0.20 },
  { code: '06', nameFr: 'Béjaïa', nameAr: 'بجاية', taxZone: 'nord', abattementRate: 0 },
  { code: '07', nameFr: 'Biskra', nameAr: 'بسكرة', taxZone: 'hauts_plateaux', abattementRate: 0.20 },
  { code: '08', nameFr: 'Béchar', nameAr: 'بشار', taxZone: 'sud', abattementRate: 0.60 },
  { code: '09', nameFr: 'Blida', nameAr: 'البليدة', taxZone: 'nord', abattementRate: 0 },
  { code: '10', nameFr: 'Bouira', nameAr: 'البويرة', taxZone: 'nord', abattementRate: 0 },
  { code: '11', nameFr: 'Tamanrasset', nameAr: 'تمنراست', taxZone: 'sud', abattementRate: 0.60 },
  { code: '12', nameFr: 'Tébessa', nameAr: 'تبسة', taxZone: 'hauts_plateaux', abattementRate: 0.20 },
  { code: '13', nameFr: 'Tlemcen', nameAr: 'تلمسان', taxZone: 'nord', abattementRate: 0 },
  { code: '14', nameFr: 'Tiaret', nameAr: 'تيارت', taxZone: 'hauts_plateaux', abattementRate: 0.20 },
  { code: '15', nameFr: 'Tizi Ouzou', nameAr: 'تيزي وزو', taxZone: 'nord', abattementRate: 0 },
  { code: '16', nameFr: 'Alger', nameAr: 'الجزائر', taxZone: 'nord', abattementRate: 0, chiefCity: 'Alger' },
  { code: '17', nameFr: 'Djelfa', nameAr: 'الجلفة', taxZone: 'hauts_plateaux', abattementRate: 0.20 },
  { code: '18', nameFr: 'Jijel', nameAr: 'جيجل', taxZone: 'nord', abattementRate: 0 },
  { code: '19', nameFr: 'Sétif', nameAr: 'سطيف', taxZone: 'hauts_plateaux', abattementRate: 0.20 },
  { code: '20', nameFr: 'Saïda', nameAr: 'سعيدة', taxZone: 'hauts_plateaux', abattementRate: 0.20 },
  { code: '21', nameFr: 'Skikda', nameAr: 'سكيكدة', taxZone: 'nord', abattementRate: 0 },
  { code: '22', nameFr: 'Sidi Bel Abbès', nameAr: 'سيدي بلعباس', taxZone: 'hauts_plateaux', abattementRate: 0.20 },
  { code: '23', nameFr: 'Annaba', nameAr: 'عنابة', taxZone: 'nord', abattementRate: 0 },
  { code: '24', nameFr: 'Guelma', nameAr: 'قالمة', taxZone: 'nord', abattementRate: 0 },
  { code: '25', nameFr: 'Constantine', nameAr: 'قسنطينة', taxZone: 'hauts_plateaux', abattementRate: 0.20 },
  { code: '26', nameFr: 'Médéa', nameAr: 'المديعة', taxZone: 'nord', abattementRate: 0 },
  { code: '27', nameFr: 'Mostaganem', nameAr: 'مستغانم', taxZone: 'nord', abattementRate: 0 },
  { code: '28', nameFr: "M'Sila", nameAr: 'المسيلة', taxZone: 'hauts_plateaux', abattementRate: 0.20 },
  { code: '29', nameFr: 'Mascara', nameAr: 'معسكر', taxZone: 'hauts_plateaux', abattementRate: 0.20 },
  { code: '30', nameFr: 'Ouargla', nameAr: 'ورقلة', taxZone: 'sud', abattementRate: 0.60 },
  { code: '31', nameFr: 'Oran', nameAr: 'وهران', taxZone: 'nord', abattementRate: 0 },
  { code: '32', nameFr: 'El Bayadh', nameAr: 'البيض', taxZone: 'hauts_plateaux', abattementRate: 0.20 },
  { code: '33', nameFr: 'Illizi', nameAr: 'إيليزي', taxZone: 'sud', abattementRate: 0.60 },
  { code: '34', nameFr: 'Bordj Bou Arréridj', nameAr: 'برج بوعريريج', taxZone: 'hauts_plateaux', abattementRate: 0.20 },
  { code: '35', nameFr: 'Boumerdès', nameAr: 'بومرداس', taxZone: 'nord', abattementRate: 0 },
  { code: '36', nameFr: 'El Tarf', nameAr: 'الطارف', taxZone: 'nord', abattementRate: 0 },
  { code: '37', nameFr: 'Tindouf', nameAr: 'تندوف', taxZone: 'sud', abattementRate: 0.60 },
  { code: '38', nameFr: 'Tissemsilt', nameAr: 'تيسمسيلت', taxZone: 'nord', abattementRate: 0 },
  { code: '39', nameFr: 'El Oued', nameAr: 'الوادي', taxZone: 'sud', abattementRate: 0.60 },
  { code: '40', nameFr: 'Khenchela', nameAr: 'خنشلة', taxZone: 'hauts_plateaux', abattementRate: 0.20 },
  { code: '41', nameFr: 'Souk Ahras', nameAr: 'سوق أهراس', taxZone: 'hauts_plateaux', abattementRate: 0.20 },
  { code: '42', nameFr: 'Tipaza', nameAr: 'تيبازة', taxZone: 'nord', abattementRate: 0 },
  { code: '43', nameFr: 'Mila', nameAr: 'ميلة', taxZone: 'hauts_plateaux', abattementRate: 0.20 },
  { code: '44', nameFr: 'Aïn Defla', nameAr: 'عين الدفلى', taxZone: 'nord', abattementRate: 0 },
  { code: '45', nameFr: 'Naâma', nameAr: 'النعامة', taxZone: 'hauts_plateaux', abattementRate: 0.20 },
  { code: '46', nameFr: 'Aïn Témouchent', nameAr: 'عين تموشنت', taxZone: 'nord', abattementRate: 0 },
  { code: '47', nameFr: 'Ghardaïa', nameAr: 'غرداية', taxZone: 'sud', abattementRate: 0.60 },
  { code: '48', nameFr: 'Relizane', nameAr: 'غليزان', taxZone: 'nord', abattementRate: 0 },
  { code: '49', nameFr: 'El M\'Ghair', nameAr: 'المغير', taxZone: 'sud', abattementRate: 0.60 },
  { code: '50', nameFr: 'El Menia', nameAlts: ['El Golea'], nameAr: 'المنيعة', taxZone: 'sud', abattementRate: 0.60 },
  { code: '51', nameFr: 'Ouled Djellal', nameAr: 'أولاد جلال', taxZone: 'hauts_plateaux', abattementRate: 0.20 },
  { code: '52', nameFr: 'Bordj Badji Mokhtar', nameAr: 'برج باجي مختار', taxZone: 'sud', abattementRate: 0.60 },
  { code: '53', nameFr: 'Béni Abbès', nameAr: 'بنى عباس', taxZone: 'sud', abattementRate: 0.60 },
  { code: '54', nameFr: 'Timimoun', nameAr: 'تيميمون', taxZone: 'sud', abattementRate: 0.60 },
  { code: '55', nameFr: 'Touggourt', nameAr: 'تقرت', taxZone: 'sud', abattementRate: 0.60 },
  { code: '56', nameFr: 'Djanet', nameAr: 'جانت', taxZone: 'sud', abattementRate: 0.60 },
  { code: '57', nameFr: 'In Salah', nameAr: 'إن سلام', taxZone: 'sud', abattementRate: 0.60 },
  { code: '58', nameFr: 'In Guezzam', nameAr: 'ان قزام', taxZone: 'sud', abattementRate: 0.60 }
];

// GET /api/wilayas - Get all wilayas or seed them
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action'); // seed, refresh

    if (action === 'seed' || action === 'refresh') {
      return await seedWilayas(action === 'refresh');
    }

    // Get wilayas from database
    const wilayas = await db.wilaya.findMany({
      orderBy: { code: 'asc' }
    });

    // If no wilayas in DB, seed them automatically
    if (wilayas.length === 0) {
      return await seedWilayas(false);
    }

    return NextResponse.json({ 
      success: true, 
      data: wilayas,
      count: wilayas.length
    });
  } catch (error) {
    console.error('Wilayas API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch wilayas' },
      { status: 500 }
    );
  }
}

async function seedWilayas(refresh: boolean) {
  try {
    if (refresh) {
      await db.wilaya.deleteMany();
    }

    const existingCount = await db.wilaya.count();
    
    if (existingCount > 0 && !refresh) {
      const wilayas = await db.wilaya.findMany({ orderBy: { code: 'asc' } });
      return NextResponse.json({ 
        success: true, 
        data: wilayas,
        count: wilayas.length,
        message: `Database already has ${wilayas.length} wilayas`
      });
    }

    // Seed all 58 wilayas
    for (const w of WILAYAS_DATA) {
      await db.wilaya.upsert({
        where: { code: w.code },
        update: {},
        create: {
          code: w.code,
          nameFr: w.nameFr,
          nameAr: w.nameAr || null,
          chiefCity: w.chiefCity || w.nameFr,
          taxZone: w.taxZone,
          abattementRate: w.abattementRate,
          surfaceKm2: null,
          population: null
        }
      });
    }

    const wilayas = await db.wilaya.findMany({ orderBy: { code: 'asc' } });
    
    return NextResponse.json({ 
      success: true, 
      data: wilayas,
      count: wilayas.length,
      message: `${wilayas.length} wilayas seeded successfully`
    });
  } catch (error) {
    console.error('Seed Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to seed wilayas' },
      { status: 500 }
    );
  }
}
