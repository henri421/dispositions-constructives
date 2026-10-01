/**
 * Profil normatif : les parametres de l'EN 1992-1-1 que l'annexe nationale
 * peut fixer et dont le chapitre 8 a besoin.
 *
 * Aucune valeur nationale n'est codee dans le noyau : le profil par defaut
 * porte les valeurs RECOMMANDEES (`ec2Recommande`), chacune avec sa source.
 *
 * Par rapport au `NormProfile` de `section-uls`, ce profil porte en plus
 * `alpha_ct` : le coefficient de traction de f_ctd = alpha_ct f_ctk,0.05 /
 * gamma_C est distinct du coefficient de compression alpha_cc et releve lui
 * aussi de l'annexe nationale (§3.1.6(2)P).
 *
 * Sans dimension, sauf mention.
 */

export interface ValeurSourcee {
  valeur: number;
  /** Reference : norme, clause, annexe nationale. Jamais vide. */
  source: string;
}

export interface ProfilEc2 {
  nom: string;
  /** Date de consultation des sources, AAAA-MM-JJ. */
  date: string;
  /** Coefficient partiel du beton, tableau 2.1N. */
  gamma_C: ValeurSourcee;
  /** Coefficient partiel de l'acier, tableau 2.1N. */
  gamma_S: ValeurSourcee;
  /** Coefficient des effets a long terme en compression, §3.1.6(1)P. */
  alpha_cc: ValeurSourcee;
  /** Coefficient des effets a long terme en traction, §3.1.6(2)P. */
  alpha_ct: ValeurSourcee;
  /** Diametre de mandrin minimal des barres, tableau 8.1N : facteur pour phi <= seuil. */
  mandrin_petits: ValeurSourcee;
  /** Facteur pour phi > seuil. */
  mandrin_grands: ValeurSourcee;
  /** Seuil de diametre du tableau 8.1N (mm). */
  mandrin_seuil: ValeurSourcee;
}

/** Leve si une valeur est non finie ou sans source : une provenance inconnue bloque le calcul. */
export function verifierProfil(p: ProfilEc2): void {
  for (const [nom, v] of Object.entries(p)) {
    if (nom === 'nom' || nom === 'date') continue;
    const vs = v as ValeurSourcee;
    if (!Number.isFinite(vs.valeur) || vs.valeur <= 0) {
      throw new Error(`Profil « ${p.nom} » : ${nom} doit etre un nombre strictement positif.`);
    }
    if (typeof vs.source !== 'string' || vs.source.trim() === '') {
      throw new Error(`Profil « ${p.nom} » : ${nom} n a pas de source. Une valeur de provenance inconnue bloque le calcul.`);
    }
  }
}

/** Valeur strictement positive et finie, sinon erreur nommant la grandeur. */
export function exigerPositif(valeur: number, nom: string, unite: string): number {
  if (!Number.isFinite(valeur) || valeur <= 0) {
    throw new Error(`${nom} doit etre un nombre strictement positif (${unite}).`);
  }
  return valeur;
}

/** Valeur positive ou nulle et finie, sinon erreur nommant la grandeur. */
export function exigerPositifOuNul(valeur: number, nom: string, unite: string): number {
  if (!Number.isFinite(valeur) || valeur < 0) {
    throw new Error(`${nom} doit etre un nombre positif ou nul (${unite}).`);
  }
  return valeur;
}
