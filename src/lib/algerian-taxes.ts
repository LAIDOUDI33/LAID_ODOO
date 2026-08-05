// ============================================================
// ERP-DZ - ALGERIAN TAX CALCULATION ENGINE
// Moteur de Calcul Fiscal Algérien (TVA, TAP, IRG, Cotisations)
// ============================================================

// ============================================================
// TVA (Taxe sur la Valeur Ajoutée)
// ============================================================

export interface TVARates {
  normal: number;    // 19%
  reduit: number;    // 9%
  particulier: number; // 7%
  exonere: number;   // 0%
}

export const TVA_RATES: TVARates = {
  normal: 0.19,
  reduit: 0.09,
  particulier: 0.07,
  exonere: 0.00
};

export interface TVACalculResult {
  montantHT: number;
  tauxTVA: number;
  montantTVA: number;
  montantTTC: number;
}

/**
 * Calculate TVA for a single amount
 */
export function calculateTVA(montantHT: number, tauxTVA: number): TVACalculResult {
  const montantTVA = Math.round(montantHT * tauxTVA * 100) / 100;
  const montantTTC = montantHT + montantTVA;
  
  return {
    montantHT,
    tauxTVA,
    montantTVA,
    montantTTC
  };
}

/**
 * Calculate TVA collectée from invoice lines
 */
export interface TVACollecteeResult {
  tva19: number;
  tva9: number;
  tva7: number;
  tva0: number;
  totalTVACollectee: number;
  totalHT: number;
  totalTTC: number;
}

export function calculateTVACollectee(
  lines: Array<{ amountUntaxed: number; tvaRate: number }>
): TVACollecteeResult {
  let tva19 = 0;
  let tva9 = 0;
  let tva7 = 0;
  let tva0 = 0;
  let totalHT = 0;

  for (const line of lines) {
    const tvaAmount = Math.round(line.amountUntaxed * line.tvaRate * 100) / 100;
    totalHT += line.amountUntaxed;

    switch (line.tvaRate) {
      case 0.19:
        tva19 += tvaAmount;
        break;
      case 0.09:
        tva9 += tvaAmount;
        break;
      case 0.07:
        tva7 += tvaAmount;
        break;
      default:
        tva0 += tvaAmount; // Includes 0% and any other rate
        break;
    }
  }

  return {
    tva19: Math.round(tva19 * 100) / 100,
    tva9: Math.round(tva9 * 100) / 100,
    tva7: Math.round(tva7 * 100) / 100,
    tva0: Math.round(tva0 * 100) / 100,
    totalTVACollectee: Math.round((tva19 + tva9 + tva7 + tva0) * 100) / 100,
    totalHT: Math.round(totalHT * 100) / 100,
    totalTTC: Math.round((totalHT + tva19 + tva9 + tva7 + tva0) * 100) / 100
  };
}

// ============================================================
// TAP (Taxe sur l'Activité Professionnelle)
// ============================================================

export type TaxZone = 'nord' | 'hauts_plateaux' | 'sud';

export interface TAPConfig {
  commerce_gros: number;     // 1%
  commerce_detail: number;   // 1-2%
  industrie: number;         // 1-2%
  services: number;          // 2%
  professions_liberales: number; // 3%
}

export const TAP_TAUX: TAPConfig = {
  commerce_gros: 0.01,
  commerce_detail: 0.02,
  industrie: 0.02,
  services: 0.02,
  professions_liberales: 0.03
};

export const TAP_ABATTEMENT_ZONES: Record<TaxZone, number> = {
  nord: 0,
  hauts_plateaux: 0.20,
  sud: 0.60
};

export interface TAPCalculResult {
  baseImposable: number;
  tauxSecteur: number;
  zone: TaxZone;
  abattementZone: number;
  tauxEffectif: number;
  tapBrut: number;
  tapNet: number;
  abattementMontant: number;
}

/**
 * Calculate TAP with geographic abatement
 */
export function calculateTAP(
  chiffreAffairesHT: number,
  secteur: keyof TAPConfig,
  zone: TaxZone = 'nord'
): TAPCalculResult {
  const tauxSecteur = TAP_TAUX[secteur];
  const abattementZone = TAP_ABATTEMENT_ZONES[zone];
  
  const tapBrut = chiffreAffairesHT * tauxSecteur;
  const abattementMontant = tapBrut * abattementZone;
  const tapNet = tapBrut - abattementMontant;
  const tauxEffectif = tauxSecteur * (1 - abattementZone);

  return {
    baseImposable: chiffreAffairesHT,
    tauxSecteur,
    zone,
    abattementZone,
    tauxEffectif: Math.round(tauxEffectif * 10000) / 10000,
    tapBrut: Math.round(tapBrut * 100) / 100,
    tapNet: Math.round(tapNet * 100) / 100,
    abattementMontant: Math.round(abattementMontant * 100) / 100
  };
}

// ============================================================
// IRG (Impôt sur le Revenu Global)
// ============================================================

export interface IRGTranche {
  min: number;
  max: number | null; // null = illimité
  taux: number;
  deduction: number;
}

export const IRG_TRANCHE_ANNUELLE: IRGTranche[] = [
  { min: 0, max: 120000, taux: 0, deduction: 0 },
  { min: 120001, max: 360000, taux: 0.20, deduction: 24000 },
  { min: 360001, max: 1440000, taux: 0.30, deduction: 312000 },
  { min: 1440001, max: null, taux: 0.35, deduction: 384000 }
];

export const IRG_TRANCHE_MENSUELLE: IRGTranche[] = [
  { min: 0, max: 10000, taux: 0, deduction: 0 },
  { min: 10001, max: 30000, taux: 0.20, deduction: 2000 },
  { min: 30001, max: 120000, taux: 0.30, deduction: 26000 },
  { min: 120001, max: null, taux: 0.35, deduction: 32000 }
];

export interface PartsFamilialesConfig {
  partContribuable: number;  // Part 1: 10,000 DZD/an
  partEpoux: number;         // Part 2: 15,000 DZD/an
  partEnfant34: number;      // Parts 3-4: 8,500 DZD/an chacun
  partEnfant5Plus: number;   // Parts 5+: 9,500 DZD/an chacun
  parentCharge: number;      // Parent à charge: 13,500 DZD/an
}

export const PARTS_FAMILIALES: PartsFamilialesConfig = {
  partContribuable: 10000,
  partEpoux: 15000,
  partEnfant34: 8500,
  partEnfant5Plus: 9500,
  parentCharge: 13500
};

export interface IRGCalculResult {
  revenuBrut: number;
  partsFamiliales: number;
  deductionParts: number;
  revenuImposable: number;
  tranche: IRGTranche;
  irgBrut: number;
  irgNet: number; // After parts deduction
}

/**
 * Calculate annual IRG
 */
export function calculateIRGAnnuel(
  revenuBrutAnnuel: number,
  nbPartsFamiliales: number = 1
): IRGCalculResult {
  // Calculate parts deduction
  let deductionParts = PARTS_FAMILIALES.partContribuable; // Part 1 always
  
  if (nbPartsFamiliales >= 2) {
    deductionParts += PARTS_FAMILIALES.partEpoux; // Part 2 (époux)
  }
  
  if (nbPartsFamiliales >= 3) {
    // Parts 3-4
    const parts34 = Math.min(nbPartsFamiliales - 2, 2);
    deductionParts += parts34 * PARTS_FAMILIALES.partEnfant34;
  }
  
  if (nbPartsFamiliales > 4) {
    // Parts 5+
    const parts5Plus = nbPartsFamiliales - 4;
    deductionParts += parts5Plus * PARTS_FAMILIALES.partEnfant5Plus;
  }

  const revenuImposable = Math.max(0, revenuBrutAnnuel - deductionParts);
  
  // Find applicable tranche
  const tranche = IRG_TRANCHE_ANNUELLE.find(
    t => revenuImposable >= t.min && (t.max === null || revenuImposable <= t.max)
  ) || IRG_TRANCHE_ANNUELLE[IRG_TRANCHE_ANNUELLE.length - 1];

  const irgBrut = (revenuImposable * tranche.taux) - tranche.deduction;
  const irgNet = Math.max(0, Math.round(irgBrut));

  return {
    revenuBrut: revenuBrutAnnuel,
    partsFamiliales: nbPartsFamiliales,
    deductionParts,
    revenuImposable: Math.round(revenuImposable),
    tranche,
    irgBrut: Math.round(irgBrut * 100) / 100,
    irgNet
  };
}

/**
 * Calculate monthly IRG (for payroll)
 */
export function calculateIRGMensuel(
  salaireBrutMensuel: number,
  nbPartsFamiliales: number = 1
): IRGCalculResult {
  // Convert to annual, calculate, then return monthly equivalent
  const annuel = salaireBrutMensuel * 12;
  const result = calculateIRGAnnuel(annuel, nbPartsFamiliales);
  
  return {
    ...result,
    revenuBrut: salaireBrutMensuel,
    revenuImposable: Math.round(result.revenuImposable / 12),
    irgBrut: Math.round(result.irgBrut / 12 * 100) / 100,
    irgNet: Math.round(result.irgNet / 12)
  };
}

// ============================================================
// COTISATIONS SOCIALES (Social Security Contributions)
// ============================================================

export interface CotisationRates {
  cnasEmployeur: number;    // 8.5%
  cnasSalarie: number;      // 1.5%
  casnosEmployeur: number;  // 12.5%
  casnosSalarie: number;    // 7.5%
  chomageEmployeur: number; // 1%
  atMin: number;            // 0.75%
  atMax: number;            // 5%
  oeuvresSociales: number; // 3%
}

export const COTISATION_RATES: CotisationRates = {
  cnasEmployeur: 0.085,
  cnasSalarie: 0.015,
  casnosEmployeur: 0.125,
  casnosSalarie: 0.075,
  chomageEmployeur: 0.01,
  atMin: 0.0075,
  atMax: 0.05,
  oeuvresSociales: 0.03
};

export interface CotisationResult {
  // Base
  salaireDeBase: number;
  
  // Part Salariale (retenues)
  cnasSalarie: number;
  casnosSalarie: number;
  totalSalarial: number;
  
  // Part Patronale (charges employeur)
  cnasEmployeur: number;
  casnosEmployeur: number;
  chomageEmployeur: number;
  atEmployeur: number; // Default 1%
  oeuvresSociales: number;
  totalPatronal: number;
  
  // Totaux
  coutTotalEmploye: number;
  netAvantIRG: number;
  netApresIRG: number;
  irg: number;
}

/**
 * Calculate social contributions
 */
export function calculateCotisations(
  salaireDeBase: number,
  options: {
    irgParts?: number;
    tauxAT?: number;
  } = {}
): CotisationResult {
  const { irgParts = 1, tauxAT = 0.01 } = options;

  // Part Salariale
  const cnasSalarie = Math.round(salaireDeBase * COTISATION_RATES.cnasSalarie * 100) / 100;
  const casnosSalarie = Math.round(salaireDeBase * COTISATION_RATES.casnosSalarie * 100) / 100;
  const totalSalarial = cnasSalarie + casnosSalarie;

  // Part Patronal
  const cnasEmployeur = Math.round(salaireDeBase * COTISATION_RATES.cnasEmployeur * 100) / 100;
  const casnosEmployeur = Math.round(salaireDeBase * COTISATION_RATES.casnosEmployeur * 100) / 100;
  const chomageEmployeur = Math.round(salaireDeBase * COTISATION_RATES.chomageEmployeur * 100) / 100;
  const atEmployeur = Math.round(salaireDeBase * tauxAT * 100) / 100;
  const oeuvresSociales = Math.round(salaireDeBase * COTISATION_RATES.oeuvresSociales * 100) / 100;
  const totalPatronal = cnasEmployeur + casnosEmployeur + chomageEmployeur + atEmployeur + oeuvresSociales;

  // Net calculations
  const netAvantIRG = salaireDeBase - totalSalarial;
  const irg = calculateIRGMensuel(salaireDeBase, irgParts).irgNet;
  const netApresIRG = Math.max(0, Math.round(netAvantIRG - irg));

  return {
    salaireDeBase: Math.round(salaireDeBase * 100) / 100,
    
    // Part Salariale
    cnasSalarie,
    casnosSalarie,
    totalSalarial: Math.round(totalSalarial * 100) / 100,
    
    // Part Patronal
    cnasEmployeur,
    casnosEmployeur,
    chomageEmployeur,
    atEmployeur,
    oeuvresSociales,
    totalPatronal: Math.round(totalPatronal * 100) / 100,
    
    // Totaux
    coutTotalEmploye: Math.round((salaireDeBase + totalPatronal) * 100) / 100,
    netAvantIRG: Math.round(netAvantIRG * 100) / 100,
    netApresIRG,
    irg
  };
}

// ============================================================
// TIMBRE FISCAL (Fiscal Stamp)
// ============================================================

export type TimbreType = 'facture' | 'avoir' | 'contrat' | 'cheque' | 'passeport';

export const TIMBRE_FISCAL: Record<TimbreType, number> = {
  facture: 1.00,
  avoir: 0.50,
  contrat: 0, // Variable selon montant
  cheque: 0, // Si > 5000 DZD
  passeport: 2000
};

export function getTimbreFiscal(type: TimbreType, montant?: number): number {
  if (type === 'contrat') {
    if (!montant || montant <= 20000) return 50;
    if (montant <= 100000) return 200;
    if (montant <= 500000) return 500;
    return 1000;
  }
  
  if (type === 'cheque') {
    if (montant && montant > 5000) return 1.00;
    return 0;
  }
  
  return TIMBRE_FISCAL[type] || 0;
}

// ============================================================
// PRIME ANCIENNETÉ (Seniority Bonus - Loi 91-29)
// ============================================================

export interface AncienneteConfig {
  annees: number;
  taux: number;
}

export const ANCIENNETE_TAUX: AncienneteConfig[] = [
  { annees: 0, taux: 0 },
  { annees: 5, taux: 0.05 },
  { annees: 12, taux: 0.10 },
  { annees: 18, taux: 0.15 },
  { annees: 23, taux: 0.20 },
  { annees: 28, taux: 0.25 }
];

/**
 * Calculate seniority bonus based on years of service
 */
export function calculatePrimeAncienete(salaireDeBase: number, anneesService: number): number {
  let tauxApplicable = 0;
  
  for (let i = ANCIENNETE_TAUX.length - 1; i >= 0; i--) {
    if (anneesService >= ANCIENNETE_TAUX[i].annees) {
      tauxApplicable = ANCIENNETE_TAUX[i].taux;
      break;
    }
  }
  
  return Math.round(salaireDeBase * tauxApplicable * 100) / 100;
}

// ============================================================
// ALLOCATIONS FAMILIALES (Family Allowances)
// ============================================================

export const ALLOCATIONS_FAMILIALES: Record<number, number> = {
  1: 300,   // 1er enfant
  2: 400,   // 2ème enfant
  3: 500,   // 3ème enfant
  4: 600,   // 4ème+ enfant
};

export function getAllocationsFamiliales(nombreEnfants: number): number {
  if (nombreEnfants <= 0) return 0;
  
  let total = 0;
  for (let i = 1; i <= Math.min(nombreEnfants, 4); i++) {
    total += ALLOCATIONS_FAMILIALES[i as keyof typeof ALLOCATIONS_FAMILIALES];
  }
  
  // Enfants supplémentaires au taux du 4ème
  if (nombreEnfants > 4) {
    total += (nombreEnfants - 4) * ALLOCATIONS_FAMILIALES[4];
  }
  
  return total;
}

// ============================================================
// HEURES SUPPLÉMENTAIRES (Overtime)
// ============================================================

export type HeuresSuppType = 'jour_ouvrable' | 'nuit' | 'dimanche' | 'ferie';

export const HEURES_SUPP_MAJORIZATION: Record<HeuresSuppType, number> = {
  jour_ouvrable: 0.50,  // 50%
  nuit: 1.00,           // 100%
  dimanche: 1.00,       // 100%
  ferie: 1.00           // 100%
};

export function calculateHeuresSupp(
  tauxHoraire: number,
  heures: number,
  type: HeuresSuppType = 'jour_ouvrable'
): number {
  const majoration = HEURES_SUPP_MAJORIZATION[type];
  return Math.round(tauxHoraire * heures * (1 + majoration) * 100) / 100;
}

// ============================================================
// IBS (Impôt sur Bénéfice des Sociétés)
// ============================================================

export interface IBSCalculResult {
  beneficeImposable: number;
  tauxIBS: number;
  ibsDu: number;
}

export const IBS_RATES: Record<string, number> = {
  standard: 0.19,
  assurances: 0.26,
  encouragees: 0.05  // Activités encouragées (zone sud, etc.)
};

export function calculateIBS(beneficeNetComptable: number, categorie: keyof typeof IBS_RATES = 'standard'): IBSCalculResult {
  const tauxIBS = IBS_RATES[categorie];
  const ibsDu = Math.round(beneficeNetComptable * tauxIBS * 100) / 100;
  
  return {
    beneficeImposable: beneficeNetComptable,
    tauxIBS,
    ibsDu
  };
}

// ============================================================
// EXPORT ALL UTILITIES
// ============================================================

export const AlgerianTaxUtils = {
  // TVA
  calculateTVA,
  calculateTVACollectee,
  TVA_RATES,
  
  // TAP
  calculateTAP,
  TAP_TAUX,
  TAP_ABATTEMENT_ZONES,
  
  // IRG
  calculateIRGAnnuel,
  calculateIRGMensuel,
  IRG_TRANCHE_ANNUELLE,
  IRG_TRANCHE_MENSUELLE,
  PARTS_FAMILIALES,
  
  // Cotisations
  calculateCotisations,
  COTISATION_RATES,
  
  // Timbre fiscal
  getTimbreFiscal,
  TIMBRE_FISCAL,
  
  // Primes et allocations
  calculatePrimeAncienete,
  ANCIENNETE_TAUX,
  getAllocationsFamiliales,
  ALLOCATIONS_FAMILIALES,
  
  // Heures supp
  calculateHeuresSupp,
  HEURES_SUPP_MAJORIZATION,
  
  // IBS
  calculateIBS,
  IBS_RATES
};
