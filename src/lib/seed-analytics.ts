// ============================================================
// HASSIBA Suite ERP v2.0.0 - BI ANALYTICS SEED DATA
// Realistic Algerian Enterprise Data for Analytics
// ============================================================

import { db } from '@/lib/db'

export async function seedAnalyticsData() {
  console.log('🌱 Seeding BI Analytics data...')
  
  try {
    // Get or create company
    let company = await db.company.findFirst()
    if (!company) {
      company = await db.company.create({
        data: {
          name: 'HASSIBA Industries SARL',
          commercialName: 'HASSIBA',
          legalForm: 'SARL',
          capital: 10000000,
          currency: 'DZD',
          rc: '16/00-123456B789',
          nif: '000016001234567',
          nis: '116011234567',
          ai: '16001012345678',
          taxRegime: 'reel',
          address: 'Zone Industrielle Oued Smar, Alger',
          city: 'Alger',
          wilayaCode: '16',
          phone: '+213 555 000 001',
          email: 'contact@hassiba.dz',
          website: 'www.hassiba.dz'
        }
      })
    }

    const companyId = company.id

    // ============================================================
    // 1. PRODUCT CATEGORIES & PRODUCTS
    // ============================================================
    console.log('  Creating product categories and products...')
    
    const categories = await Promise.all([
      db.productCategory.upsert({
        where: { code: 'ELEC' },
        update: {},
        create: { name: 'Électronique & Électrique', code: 'ELEC', nameAr: 'إلكترونيات' }
      }),
      db.productCategory.upsert({
        where: { code: 'MECA' },
        update: {},
        create: { name: 'Mécanique & Pièces', code: 'MECA', nameAr: 'ميكانيكا' }
      }),
      db.productCategory.upsert({
        where: { code: 'TEXT' },
        update: {},
        create: { name: 'Textile & Vêtements', code: 'TEXT', nameAr: 'أقمشة' }
      }),
      db.productCategory.upsert({
        where: { code: 'ALIM' },
        update: {},
        create: { name: 'Alimentaire & Boissons', code: 'ALIM', nameAr: 'غذائية' }
      }),
      db.productCategory.upsert({
        where: { code: 'CHIM' },
        update: {},
        create: { name: 'Chimie & Produits Ménagers', code: 'CHIM', nameAr: 'كيماويات' }
      }),
      db.productCategory.upsert({
        where: { code: 'EMBAL' },
        update: {},
        create: { name: 'Emballage & Matériel', code: 'EMBAL', nameAr: 'تغليف' }
      })
    ])

    // Create diverse products for analytics
    const products = [
      // Électronique
      { code: 'ELC-001', name: 'Tablette Android 10"', nameAr: 'تابلت أندرويد', category: 'ELEC', salePrice: 45000, purchasePrice: 32000, costPrice: 28000, tvaRate: 19, unit: 'U' },
      { code: 'ELC-002', name: 'Smartphone Pro Max', nameAr: 'هاتف ذكي', category: 'ELEC', salePrice: 85000, purchasePrice: 62000, costPrice: 55000, tvaRate: 19, unit: 'U' },
      { code: 'ELC-003', name: 'Écran LED 24"', nameAr: 'شاشة إل إي دي', category: 'ELEC', salePrice: 35000, purchasePrice: 24000, costPrice: 20000, tvaRate: 19, unit: 'U' },
      { code: 'ELC-004', name: 'Clavier Mécanique RGB', nameAr: 'لوحة مفاتيح', category: 'ELEC', salePrice: 12000, purchasePrice: 7500, costPrice: 6000, tvaRate: 19, unit: 'U' },
      { code: 'ELC-005', name: 'Souris Sans Fil Ergo', nameAr: 'فأرة لاسلكية', category: 'ELEC', salePrice: 4500, purchasePrice: 2800, costPrice: 2200, tvaRate: 19, unit: 'U' },
      { code: 'ELC-006', name: 'Caméra IP Surveillance', nameAr: 'كاميرا مراقبة', category: 'ELEC', salePrice: 28000, purchasePrice: 18500, costPrice: 15000, tvaRate: 19, unit: 'U' },
      
      // Mécanique
      { code: 'MEC-001', name: 'Roulement à Billes 6205', nameAr: 'مسمار كرات', category: 'MECA', salePrice: 2500, purchasePrice: 1500, costPrice: 1200, tvaRate: 19, unit: 'U' },
      { code: 'MEC-002', name: 'Courroie Trapézoïdale A65', nameAr: 'حزام شريطي', category: 'MECA', salePrice: 1800, purchasePrice: 1100, costPrice: 900, tvaRate: 19, unit: 'U' },
      { code: 'MEC-003', name: 'Pompe Hydraulique 50L', nameAr: 'مضخة هيدروليكية', category: 'MECA', salePrice: 125000, purchasePrice: 88000, costPrice: 75000, tvaRate: 19, unit: 'U' },
      { code: 'MEC-004', name: 'Moteur Électrique 5CV', nameAr: 'محرك كهربائي', category: 'MECA', salePrice: 95000, purchasePrice: 68000, costPrice: 59000, tvaRate: 19, unit: 'U' },
      { code: 'MEC-005', name: 'Réducteur de Vitesse 1:25', nameAr: 'علبة تروس', category: 'MECA', salePrice: 78000, purchasePrice: 55000, costPrice: 47000, tvaRate: 19, unit: 'U' },
      
      // Textile
      { code: 'TEX-001', name: 'T-Shirt Premium Coton', nameAr: 'تيشيرت قطن', category: 'TEXT', salePrice: 2500, purchasePrice: 1400, costPrice: 1100, tvaRate: 19, unit: 'U' },
      { code: 'TEX-002', name: 'Jean Denim Classic', nameAr: 'جينز دنيم', category: 'TEXT', salePrice: 5500, purchasePrice: 3200, costPrice: 2700, tvaRate: 19, unit: 'U' },
      { code: 'TEX-003', name: 'Veste Polaire Homme', nameAr: 'جاكيت فليس', category: 'TEXT', salePrice: 4800, purchasePrice: 2700, costPrice: 2200, tvaRate: 19, unit: 'U' },
      { code: 'TEX-004', name: 'Tissu Polyester 150cm', nameAr: 'قماش بوليستر', category: 'TEXT', salePrice: 3200, purchasePrice: 1900, costPrice: 1600, tvaRate: 9, unit: 'ML' },
      { code: 'TEX-005', name: 'Couverture Polaire Double', nameAr: 'بطانية فليس', category: 'TEXT', salePrice: 6500, purchasePrice: 3800, costPrice: 3100, tvaRate: 19, unit: 'U' },
      
      // Alimentaire
      { code: 'ALI-001', name: 'Huile d\'Olive Extra 1L', nameAr: 'زيت زيتون', category: 'ALIM', salePrice: 1200, purchasePrice: 800, costPrice: 700, tvaRate: 9, unit: 'U' },
      { code: 'ALI-002', name: 'Date Deglet Nour 1kg', nameAr: 'تمر دقلة نور', category: 'ALIM', salePrice: 1800, purchasePrice: 1100, costPrice: 950, tvaRate: 9, unit: 'KG' },
      { code: 'ALI-003', name: 'Pâte de Tomate 700g', nameAr: 'عجينة طماطم', category: 'ALIM', salePrice: 350, purchasePrice: 220, costPrice: 180, tvaRate: 9, unit: 'U' },
      { code: 'ALI-004', name: 'Couscous Grain Fin 1kg', nameAr: 'كسكس حب رفيع', category: 'ALIM', salePrice: 450, purchasePrice: 280, costPrice: 230, tvaRate: 9, unit: 'KG' },
      { code: 'ALI-005', name: 'Lait UHT Semi-Écrémé 1L', nameAr: 'حليب', category: 'ALIM', salePrice: 180, purchasePrice: 120, costPrice: 100, tvaRate: 9, unit: 'U' },
      
      // Chimie
      { code: 'CHI-001', name: 'Lessive Liquide Concentré 5L', nameAr: 'منظف سائل', category: 'CHIM', salePrice: 1500, purchasePrice: 900, costPrice: 750, tvaRate: 19, unit: 'U' },
      { code: 'CHI-002', name: 'Javel Parfumé 2L', nameAr: 'جاڤيل', category: 'CHIM', salePrice: 450, purchasePrice: 260, costPrice: 210, tvaRate: 19, unit: 'U' },
      { code: 'CHI-003', name: 'Détergent Industriel 25kg', nameAr: 'منظف صناعي', category: 'CHIM', salePrice: 8500, purchasePrice: 5200, costPrice: 4300, tvaRate: 19, unit: 'KG' },
      { code: 'CHI-004', name: 'Peinture Façade Blanc 20L', nameAr: 'دهان واجهة', category: 'CHIM', salePrice: 12000, purchasePrice: 7500, costPrice: 6200, tvaRate: 19, unit: 'U' },
      { code: 'CHI-005', name: 'Solvant Universel 1L', nameAr: 'مذيب عالمي', category: 'CHIM', salePrice: 680, purchasePrice: 420, costPrice: 350, tvaRate: 19, unit: 'U' },
      
      // Emballage
      { code: 'EMB-001', name: 'Carton Standard 40x30x30', nameAr: 'كرتون قياسي', category: 'EMBAL', salePrice: 85, purchasePrice: 45, costPrice: 38, tvaRate: 19, unit: 'U' },
      { code: 'EMB-002', name: 'Film Stretch Transparent 50m', nameAr: 'فيلم شريط', category: 'EMBAL', salePrice: 650, purchasePrice: 380, costPrice: 310, tvaRate: 19, unit: 'U' },
      { code: 'EMB-003', name: 'Palette Bois EUR 120x80', nameAr: 'بال خشب', category: 'EMBAL', salePrice: 4500, purchasePrice: 2800, costPrice: 2300, tvaRate: 19, unit: 'U' },
      { code: 'EMB-004', name: 'Ruban Adhésif Pack 36', nameAr: 'شريط لاصق', category: 'EMBAL', salePrice: 480, purchasePrice: 290, costPrice: 240, tvaRate: 19, unit: 'U' },
      { code: 'EMB-005', name: 'Paper Bubble A4 100 feuilles', nameAr: 'ورق فقاعي', category: 'EMBAL', salePrice: 1200, purchasePrice: 720, costPrice: 600, tvaRate: 19, unit: 'PQ' }
    ]

    const createdProducts = []
    for (const p of products) {
      const cat = categories.find(c => c.code === p.category)
      const product = await db.product.upsert({
        where: { code: p.code },
        update: {
          name: p.name,
          nameAr: p.nameAr,
          salePrice: p.salePrice,
          purchasePrice: p.purchasePrice,
          costPrice: p.costPrice,
          tvaRate: p.tvaRate,
          unitOfMeasure: p.unit,
          categoryId: cat?.id
        },
        create: {
          code: p.code,
          name: p.name,
          nameAr: p.nameAr,
          type: 'stockable',
          salePrice: p.salePrice,
          purchasePrice: p.purchasePrice,
          costPrice: p.costPrice,
          tvaRate: p.tvaRate,
          unitOfMeasure: p.unit,
          companyId,
          categoryId: cat?.id
        }
      })
      createdProducts.push({ ...product, categoryName: cat?.name || p.category })
    }

    console.log(`  ✓ Created ${createdProducts.length} products`)

    // ============================================================
    // 2. WAREHOUSES & STOCK LEVELS
    // ============================================================
    console.log('  Creating warehouses and stock levels...')
    
    const warehouses = await Promise.all([
      db.warehouse.upsert({
        where: { code: 'WH-MAIN' },
        update: {},
        create: { name: 'Entrepôt Principal Oued Smar', code: 'WH-MAIN', address: 'Zone Ind. Oued Smar', companyId, phone: '+213 555 000 010' }
      }),
      db.warehouse.upsert({
        where: { code: 'WH-HUSSEIN' },
        update: {},
        create: { name: 'Entrepôt Hussein Dey', code: 'WH-HUSSEIN', address: 'Route de Kabylie, Hussein Dey', companyId }
      }),
      db.warehouse.upsert({
        where: { code: 'WH-ORAN' },
        update: {},
        create: { name: 'Dépôt Oran - Ain El Beida', code: 'WH-ORAN', address: 'Zone Ind. Ain El Beida, Oran', companyId }
      })
    ])

    // Create stock levels for each product in main warehouse
    for (const product of createdProducts) {
      const qty = Math.floor(Math.random() * 500) + 50 // Random stock between 50-550
      const minQty = Math.floor(qty * 0.2) // Min stock at 20%
      
      await db.stockLevel.upsert({
        where: {
          productId_warehouseId_locationId: {
            productId: product.id,
            warehouseId: warehouses[0].id,
            locationId: '' // No specific location
          }
        },
        update: { quantity: qty, availableQty: qty, minQty, reservedQty: 0 },
        create: {
          productId: product.id,
          warehouseId: warehouses[0].id,
          quantity: qty,
          availableQty: qty,
          minQty,
          reservedQty: 0
        }
      })
    }

    console.log(`  ✓ Created ${warehouses.length} warehouses with stock levels`)

    // ============================================================
    // 3. EMPLOYEES (HR DATA)
    // ============================================================
    console.log('  Creating employees...')
    
    const departments = ['Production', 'Commercial', 'Administration', 'IT', 'RH', 'Finance', 'Qualité', 'Logistique']
    const jobTitles: Record<string, string[]> = {
      'Production': ['Opérateur Machine', 'Technicien Maintenance', 'Chef d\'Équipe', 'Ingénieur Production', 'Ouvrier Qualifié'],
      'Commercial': ['Commercial B2B', 'Représentant', 'Chef de Ventes', 'Account Manager', 'Téléconseiller'],
      'Administration': ['Assistant Direction', 'Secrétaire Comptable', 'Responsable Admin', 'Archiviste'],
      'IT': ['Administrateur Système', 'Développeur Full Stack', 'Technicien Support', 'DBA'],
      'RH': ['Responsable RH', 'Chargé de Paie', 'Assistant RH', 'Formateur Interne'],
      'Finance': ['Comptable', 'Contrôleur de Gestion', 'Trésorier', 'Chef Comptable'],
      'Qualité': ['Inspecteur Qualité', 'Responsable QA/QC', 'Technicien Métrologie', 'Auditeur Interne'],
      'Logistique': ['Magasinier', 'Gestionnaire Stock', 'Préparateur Commandes', 'Chauffeur Livreur']
    }

    const firstNames = ['Ahmed', 'Mohammed', 'Karim', 'Said', 'Fatima', 'Amina', 'Samira', 'Nadia', 'Lydia', 'Omar', 'Youcef', 'Rachid', 'Malika', 'Souad', 'Farid', 'Nabil', 'Kamila', 'Imane', 'Yasmina', 'Reda']
    const lastNames = ['Benali', 'Messaoudi', 'Bouazza', 'Haddad', 'Amrani', 'Kaci', 'Zerhouni', 'Slimani', 'Bensalah', 'Mehidi', 'Charef', 'Hamadi', 'Belkacem', 'Touati', 'Guermazi']

    const employees = []
    for (let i = 0; i < 35; i++) {
      const dept = departments[i % departments.length]
      const titles = jobTitles[dept]
      const title = titles[i % titles.length]
      const firstName = firstNames[i % firstNames.length]
      const lastName = lastNames[Math.floor(i / 3) % lastNames.length]
      const baseSalary = dept === 'IT' || dept === 'Finance' ? 60000 + Math.random() * 40000 :
                         dept === 'Production' ? 28000 + Math.random() * 22000 : 
                         35000 + Math.random() * 30000
      
      const contractStart = new Date(2020 + Math.floor(i / 12), (i * 2) % 12, 15)

      const employee = await db.employee.upsert({
        where: { matricule: `EMP-${String(i + 1).padStart(4, '0')}` },
        update: {},
        create: {
          matricule: `EMP-${String(i + 1).padStart(4, '0')}`,
          firstName,
          lastName,
          gender: i % 3 === 0 ? 'F' : 'M',
          department: dept,
          jobTitle: title,
          jobPosition: title,
          contractType: i < 28 ? 'cdi' : i < 33 ? 'cdd' : 'internship',
          contractStartDate: contractStart,
          employeeStatus: 'active',
          baseSalary: Math.round(baseSalary),
          hourlyRate: Math.round(baseSalary / 173),
          dailyRate: Math.round(baseSalary / 26),
          hireDate: contractStart,
          isActive: true,
          workEmail: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@hassiba.dz`,
          phone: `+213 ${5 + Math.floor(Math.random() * 4)}${String(Math.floor(Math.random() * 90000000) + 10000000).padStart(8, '0')}`,
          city: ['Alger', 'Oran', 'Constantine', 'Blida', 'Setif', 'Annaba', 'Tlemcen'][i % 7],
          wilayaCode: ['16', '31', '25', '09', '19', '12', '13'][i % 7],
          companyId
        }
      })
      employees.push(employee)
    }

    console.log(`  ✓ Created ${employees.length} employees`)

    // Create some payrolls for current month
    const currentPeriod = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
    
    for (const emp of employees.slice(0, 25)) {
      if (emp.employeeStatus === 'active') {
        const base = emp.baseSalary || 40000
        const gross = base * 1.15 // With allowances
        const cotisations = gross * 0.09
        const irg = gross > 50000 ? gross * 0.15 : gross * 0.1
        const net = gross - cotisations - irg
        const patronal = gross * 0.26

        await db.payroll.upsert({
          where: { reference: `PAIE-${currentPeriod}-${emp.matricule}` },
          update: {},
          create: {
            reference: `PAIE-${currentPeriod}-${emp.matricule}`,
            period: currentPeriod,
            status: 'paid',
            baseSalary: base,
            grossSalary: Math.round(gross),
            primeAnciennete: Math.round(base * 0.03),
            primeTransport: 6000,
            primePanier: 4800,
            cotisationCNAS: Math.round(gross * 0.015),
            cotisationCASNOS: Math.round(gross * 0.075),
            totalCotisations: Math.round(cotisations),
            irgRetenu: Math.round(irg),
            netPayable: Math.round(net),
            patronalCNAS: Math.round(gross * 0.085),
            patronalCASNOS: Math.round(gross * 0.125),
            totalPatronal: Math.round(patronal),
            coutTotalEmploye: Math.round(net + patronal),
            employeeId: emp.id
          }
        })
      }
    }

    console.log('  ✓ Created payrolls')

    // ============================================================
    // 4. INVOICES (SALES DATA) - Last 12 months
    // ============================================================
    console.log('  Creating invoices (sales data)...')
    
    // Get customers only
    const customers = await db.partner.findMany({
      where: { OR: [{ type: 'customer'}, { type: 'both'}], isActive: true }
    })

    if (customers.length === 0) {
      // Create sample customers
      const customerNames = [
        { name: 'ECO Algérie SARL', type: 'customer', city: 'Alger', wilayaCode: '16' },
        { name: 'SNTF - Région Centre', type: 'customer', city: 'Alger', wilayaCode: '16' },
        { name: 'Sonelgaz - Division GRTE', type: 'customer', city: 'Alger', wilayaCode: '16' },
        { name: 'Sonatrach SPA', type: 'customer', city: 'Hydra', wilayaCode: '16' },
        { name: 'NAFDAL', type: 'customer', city: 'Constantine', wilayaCode: '25' },
        { name: 'Condor Algérie', type: 'customer', city: 'Tizi-Ouzou', wilayaCode: '15' },
        { name: 'Giplaceta', type: 'customer', city: 'Sétif', wilayaCode: '19' },
        { name: 'Ifri', type: 'customer', city: 'Skikda', wilayaCode: '21' },
        { name: 'Cevital', type: 'both', city: 'Bejaia', wilayaCode: '06' },
        { name: 'Air Algérie', type: 'customer', city: 'Alger', wilayaCode: '16' }
      ]
      
      for (const c of customerNames) {
        await db.partner.create({
          data: {
            ...c,
            email: `contact@${c.name.toLowerCase().replace(/\s/g, '')}.dz`,
            phone: `+213 ${Math.floor(Math.random() * 9000000) + 1000000}`,
            paymentTerms: '30',
            companyId
          }
        })
      }
    }

    const allCustomers = await db.partner.findMany({
      where: { OR: [{ type: 'customer'}, { type: 'both'}], isActive: true }
    })

    // Generate invoices over the past 12 months
    const invoiceCount = 85
    const statuses: Array<'draft' | 'sent' | 'paid' | 'partial' | 'cancelled'> = ['draft', 'sent', 'paid', 'partial', 'cancelled']
    
    for (let i = 0; i < invoiceCount; i++) {
      const monthsAgo = Math.floor((invoiceCount - i) / 7) // Spread over ~12 months
      const invoiceDate = new Date()
      invoiceDate.setMonth(invoiceDate.getMonth() - monthsAgo)
      invoiceDate.setDate(Math.floor(Math.random() * 28) + 1)
      
      const dueDate = new Date(invoiceDate)
      dueDate.setDate(dueDate.getDate() + 30)
      
      const customer = allCustomers[i % allCustomers.length]
      
      // Random number of line items (1-4)
      const numLines = Math.floor(Math.random() * 4) + 1
      const selectedProducts = [...createdProducts].sort(() => Math.random() - 0.5).slice(0, numLines)
      
      let amountUntaxed = 0
      let amountTax = 0
      
      const lines = selectedProducts.map(p => {
        const qty = Math.floor(Math.random() * 20) + 1
        const unitPrice = p.salePrice
        const discount = Math.random() > 0.8 ? Math.floor(Math.random() * 10) : 0
        const lineTotal = qty * unitPrice * (1 - discount / 100)
        const lineTax = lineTotal * (p.tvaRate / 100)
        
        amountUntaxed += lineTotal
        amountTax += lineTax
        
        return {
          productId: p.id,
          quantity: qty,
          unitPrice,
          discountRate: discount,
          tvaRate: p.tvaRate,
          amountUntaxed: Math.round(lineTotal),
          amountTax: Math.round(lineTax),
          amountTotal: Math.round(lineTotal + lineTax)
        }
      })

      const amountTotal = Math.round(amountUntaxed + amountTax)
      const statusRand = Math.random()
      const status = statusRand > 0.7 ? 'paid' : statusRand > 0.4 ? 'sent' : statusRand > 0.15 ? 'partial' : statusRand > 0.05 ? 'draft' : 'cancelled'
      const amountPaid = status === 'paid' ? amountTotal : status === 'partial' ? Math.round(amountTotal * 0.5) : 0

      const refNum = String(invoiceCount - i).padStart(3, '0')
      
      const invoice = await db.invoice.create({
        data: {
          reference: `FAC-${invoiceDate.getFullYear()}-${String(invoiceDate.getMonth() + 1).padStart(2, '0')}-${refNum}`,
          date: invoiceDate,
          dueDate,
          status,
          type: 'invoice',
          amountUntaxed: Math.round(amountUntaxed),
          amountTax: Math.round(amountTax),
          timbreFiscal: 1,
          amountTotal,
          amountPaid,
          amountDue: amountTotal - amountPaid,
          partnerId: customer.id,
          companyId,
          paymentMode: ['virement', 'cheque', 'espece', 'traite'][Math.floor(Math.random() * 4)],
          lines: { create: lines }
        }
      })

      // Create payment for paid invoices
      if (status === 'paid' && amountPaid > 0) {
        await db.payment.create({
          data: {
            reference: `REG-${invoice.reference}`,
            date: new Date(invoiceDate.getTime() + 15 * 24 * 60 * 60 * 1000), // ~15 days later
            amount: amountPaid,
            type: 'incoming',
            method: ['transfer', 'check', 'cash'][Math.floor(Math.random() * 3)] as any,
            status: 'reconciled',
            invoiceId: invoice.id
          }
        })
      }
    }

    console.log(`  ✓ Created ${invoiceCount} invoices`)

    // ============================================================
    // 5. BILLS (PURCHASE DATA)
    // ============================================================
    console.log('  Creating bills (purchase data)...')
    
    // Get or create suppliers
    let suppliers = await db.partner.findMany({ where: { OR: [{type: 'supplier'}, {type: 'both'}] }})
    
    if (suppliers.length < 5) {
      const supplierNames = [
        { name: 'Shenzhen Electronics Ltd', type: 'supplier', city: 'Shenzhen', country: 'China' },
        { name: 'Istanbul Trading Co', type: 'supplier', city: 'Istanbul', country: 'Turkey' },
        { name: 'Marseille Import SA', type: 'supplier', city: 'Marseille', country: 'France' },
        { name: 'Textile du Sud', type: 'supplier', city: 'Biskra', wilayaCode: '07' },
        { name: 'Plastique Algérie', type: 'supplier', city: 'Oran', wilayaCode: '31' }
      ]
      
      for (const s of supplierNames) {
        suppliers.push(await db.partner.create({
          data: {
            ...s,
            email: `supply@${s.name.toLowerCase().replace(/\s/g, '').replace('.', '')}.com`,
            paymentTerms: '60',
            companyId
          }
        }))
      }
    }

    suppliers = await db.partner.findMany({ where: { OR: [{type: 'supplier'}, {type: 'both'}] } })
    
    const billCount = 55
    
    for (let i = 0; i < billCount; i++) {
      const monthsAgo = Math.floor((billCount - i) / 4) // Spread over ~14 months
      const billDate = new Date()
      billDate.setMonth(billDate.getMonth() - monthsAgo)
      billDate.setDate(Math.floor(Math.random() * 28) + 1)
      
      const supplier = suppliers[i % suppliers.length]
      
      const numLines = Math.floor(Math.random() * 3) + 1
      const selectedProducts = [...createdProducts].sort(() => Math.random() - 0.5).slice(0, numLines)
      
      let amountUntaxed = 0
      let amountTax = 0
      
      const lines = selectedProducts.map(p => {
        const qty = Math.floor(Math.random() * 100) + 10
        const unitPrice = p.purchasePrice
        const lineTotal = qty * unitPrice
        const lineTax = lineTotal * (p.tvaRate / 100)
        
        amountUntaxed += lineTotal
        amountTax += lineTax
        
        return {
          productId: p.id,
          quantity: qty,
          unitPrice,
          tvaRate: p.tvaRate,
          amountUntaxed: Math.round(lineTotal),
          amountTax: Math.round(lineTax),
          amountTotal: Math.round(lineTotal + lineTax)
        }
      })

      const amountTotal = Math.round(amountUntaxed + amountTax)
      const statusRand = Math.random()
      const status = statusRand > 0.6 ? 'paid' : statusRand > 0.3 ? 'approved' : statusRand > 0.1 ? 'verified' : 'received'
      const amountPaid = status === 'paid' ? amountTotal : 0

      const refNum = String(billCount - i).padStart(3, '0')
      
      await db.bill.create({
        data: {
          reference: `FRN-${billDate.getFullYear()}-${String(billDate.getMonth() + 1).padStart(2, '0')}-${refNum}`,
          date: billDate,
          dueDate: new Date(billDate.getTime() + 60 * 24 * 60 * 60 * 1000), // 60 days later
          status,
          amountUntaxed: Math.round(amountUntaxed),
          amountTax: Math.round(amountTax),
          timbreFiscal: 1,
          amountTotal,
          amountPaid,
          amountDue: amountTotal - amountPaid,
          partnerId: supplier.id,
          companyId,
          lines: { create: lines }
        }
      })
    }

    console.log(`  ✓ Created ${billCount} bills`)

    // ============================================================
    // 6. BANK ACCOUNTS
    // ============================================================
    console.log('  Creating bank accounts...')
    
    const banks = [
      { name: 'CPA Compte Courant Dinars', bankName: 'CPA', accountNumber: '00000000' + String(Math.floor(Math.random() * 9000000) + 1000000), balance: 45000000 },
      { name: 'BNA Compte Commercial', bankName: 'BNA', accountNumber: '00000000' + String(Math.floor(Math.random() * 9000000) + 1000000), balance: 28500000 },
      { name: 'BDL Compte Export', bankName: 'BDL', accountNumber: '00000000' + String(Math.floor(Math.random() * 9000000) + 1000000), balance: 72000000 }
    ]

    for (const bank of banks) {
      await db.bankAccount.upsert({
        where: { accountNumber: bank.accountNumber },
        update: { balance: bank.balance },
        create: { ...bank, companyId, currency: 'DZD', accountType: 'current' }
      })
    }

    console.log('  ✓ Created bank accounts')

    // ============================================================
    // 7. TAX DECLARATIONS
    // ============================================================
    console.log('  Creating tax declarations...')
    
    const currentYear = new Date().getFullYear()
    
    for (let month = 1; month <= new Date().getMonth(); month++) {
      const period = `${currentYear}-${String(month).padStart(2, '0')}`
      
      // G50 TVA declaration
      const monthlyRevenue = 30000000 + Math.random() * 20000000
      const monthlyExpenses = 18000000 + Math.random() * 10000000
      
      await db.taxDeclaration.upsert({
        where: { id: `tva-${period}` },
        update: {},
        create: {
          id: `tva-${period}`,
          type: 'G50_TVA',
          period,
          status: month >= new Date().getMonth() - 1 ? 'validated' : 'paid',
          tvaCollecte19: Math.round(monthlyRevenue * 0.17),
          tvaCollecte9: Math.round(monthlyRevenue * 0.02),
          tvaDeductibleBiens: Math.round(monthlyExpenses * 0.06),
          tvaDeductibleServices: Math.round(monthlyExpenses * 0.04),
          tvaNet: Math.round(monthlyRevenue * 0.19 - monthlyExpenses * 0.1),
          totalDue: Math.round(monthlyRevenue * 0.19 - monthlyExpenses * 0.1),
          totalPaid: month < new Date().getMonth() - 1 ? Math.round(monthlyRevenue * 0.19 - monthlyExpenses * 0.1) : 0,
          companyId
        }
      })
    }

    console.log('  ✓ Created tax declarations')

    // ============================================================
    // SUMMARY
    // ============================================================
    console.log('\n✅ BI Analytics seeding completed!')
    console.log('   Ready for real-time dashboard visualization')
    
    return {
      success: true,
      summary: {
        products: createdProducts.length,
        warehouses: warehouses.length,
        employees: employees.length,
        invoices: invoiceCount,
        bills: billCount
      }
    }

  } catch (error) {
    console.error('❌ Error seeding analytics data:', error)
    throw error
  }
}

// Run directly if called
if (require.main === module) {
  seedAnalyticsData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}
