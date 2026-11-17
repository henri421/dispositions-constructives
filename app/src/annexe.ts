/**
 * Annexe nationale (lot E, audit R4) : profil de calcul selon l'annexe choisie et
 * les coefficients saisis. Module PUR. Meme modele que colonne-ec2.
 *
 * Le noyau ne connait aucune annexe : le profil luxembourgeois est construit ici a
 * partir du profil recommande et de la table commune `AN_LU` d'aedificium-ui.
 * Chaque coefficient est prerempli par l'annexe et reste modifiable ; une valeur
 * changee est marquee imposee par l'utilisateur.
 */

import { nombreAffiche, valeurLu, type AnnexeNationale } from 'aedificium-ui';
import { ec2Recommande, type ProfilEc2 } from '../../src/index';
import { textes } from './textes';

export const COEFS = ['gamma_C', 'gamma_S', 'alpha_cc', 'alpha_ct', 'mandrin_petits', 'mandrin_grands', 'mandrin_seuil'] as const;
export type CleCoef = (typeof COEFS)[number];
export type Coefs = Record<CleCoef, number>;

/** Symbole affiche de chaque coefficient (note, ecran). */
export const SYMBOLES: Record<CleCoef, string> = {
  gamma_C: 'gamma_C',
  gamma_S: 'gamma_S',
  alpha_cc: 'alpha_cc',
  alpha_ct: 'alpha_ct',
  mandrin_petits: 'phi_m / phi (phi <= seuil)',
  mandrin_grands: 'phi_m / phi (phi > seuil)',
  mandrin_seuil: 'seuil (mm)',
};

/** Clause de l'EN 1992-1-1 de chaque coefficient. */
export const CLAUSES: Record<CleCoef, string> = {
  gamma_C: 'tableau 2.1N',
  gamma_S: 'tableau 2.1N',
  alpha_cc: '3.1.6(1)P',
  alpha_ct: '3.1.6(2)P',
  mandrin_petits: 'tableau 8.1N',
  mandrin_grands: 'tableau 8.1N',
  mandrin_seuil: 'tableau 8.1N',
};

export function ec2Lu(): ProfilEc2 {
  const rec = ec2Recommande();
  const p: ProfilEc2 = { ...rec, nom: 'Luxembourg, ILNAS-EN 1992-1-1/AN-LU:2020 (valeurs présumées, à vérifier)', date: '2026-11-17' };
  for (const k of COEFS) p[k] = valeurLu('EN 1992-1-1', k, rec[k], CLAUSES[k]);
  return p;
}

export function profilDeLAnnexe(a: AnnexeNationale): ProfilEc2 {
  return a === 'lu' ? ec2Lu() : ec2Recommande();
}

/** Valeurs des coefficients d'une annexe, pour preremplir les champs. */
export function coefsDeLAnnexe(a: AnnexeNationale): Coefs {
  const p = profilDeLAnnexe(a);
  return Object.fromEntries(COEFS.map((k) => [k, p[k].valeur])) as Coefs;
}

/** Profil de calcul : celui de l'annexe, chaque valeur changee marquee imposee. */
export function profilDeCalcul(a: AnnexeNationale, coefs: Coefs): ProfilEc2 {
  const base = profilDeLAnnexe(a);
  const p: ProfilEc2 = { ...base };
  for (const k of COEFS) {
    const x = coefs[k];
    const b = base[k];
    p[k] = x === b.valeur ? b : { valeur: x, source: textes().messages.imposee(nombreAffiche(b.valeur, 4), b.source) };
  }
  return p;
}
