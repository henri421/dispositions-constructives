/**
 * Diametres de mandrin, EN 1992-1-1 §8.3, et ancrage des armatures
 * d'effort tranchant, §8.5.
 *
 * Unites : mm, MPa, kN.
 */

import type { ProfilEc2 } from '../norms/profil';
import { exigerPositif, verifierProfil } from '../norms/profil';

/** Nombre a la francaise pour les motifs affiches. */
function fr(x: number, d: number): string {
  return x.toFixed(d).replace('.', ',');
}

/** Plafond de f_ck pour f_cd dans l'expression (8.1), §8.3(3) (MPa). */
const FCK_PLAFOND_MANDRIN = 55;
const N_PAR_KN = 1000;

/** Diametre de mandrin minimal des barres, tableau 8.1N : 4 phi jusqu'a 16 mm, 7 phi au-dela (profil). */
export function mandrinMinimal(phi: number, profil: ProfilEc2): number {
  exigerPositif(phi, 'Le diametre phi', 'mm');
  return phi <= profil.mandrin_seuil.valeur ? profil.mandrin_petits.valeur * phi : profil.mandrin_grands.valeur * phi;
}

export interface VerificationMandrin {
  phi_m_min_tableau: number;
  /** Diametre requis par l'ecrasement du beton, expression (8.1) ; null si non demande. */
  phi_m_min_ecrasement: number | null;
  phi_m_requis: number;
  conforme: boolean | null;
  motif: string;
}

/**
 * Mandrin : minimum du tableau 8.1N, et, si l'effort au debut du coude est
 * fourni, le minimum de l'expression (8.1) contre l'ecrasement du beton a
 * l'interieur du coude :
 *   phi_m,min >= F_bt ((1/a_b) + 1/(2 phi)) / f_cd,  f_ck plafonne a 55 MPa.
 * a_b : demi-entraxe des barres perpendiculairement au plan du coude, ou
 * enrobage + phi/2 pour une barre voisine d'un parement.
 * Le §8.3(3) dispense de (8.1) sous trois conditions cumulatives que
 * l'utilisateur constate ; le module calcule quand on le lui demande.
 */
export function verifierMandrin(
  phi: number,
  profil: ProfilEc2,
  phi_m: number | null,
  ecrasement: { F_bt: number; a_b: number; fck: number } | null
): VerificationMandrin {
  verifierProfil(profil);
  const tableau = mandrinMinimal(phi, profil);
  let ecr: number | null = null;
  if (ecrasement !== null) {
    exigerPositif(ecrasement.F_bt, 'L effort F_bt au debut du coude', 'kN');
    exigerPositif(ecrasement.a_b, 'La distance a_b', 'mm');
    const f_cd = (profil.alpha_cc.valeur * Math.min(exigerPositif(ecrasement.fck, 'f_ck', 'MPa'), FCK_PLAFOND_MANDRIN)) / profil.gamma_C.valeur;
    ecr = (ecrasement.F_bt * N_PAR_KN * (1 / ecrasement.a_b + 1 / (2 * phi))) / f_cd;
  }
  const requis = Math.max(tableau, ecr ?? 0);
  if (phi_m === null) {
    return { phi_m_min_tableau: tableau, phi_m_min_ecrasement: ecr, phi_m_requis: requis, conforme: null, motif: `Mandrin requis : ${fr(requis, 0)} mm.` };
  }
  exigerPositif(phi_m, 'Le diametre de mandrin phi_m', 'mm');
  return {
    phi_m_min_tableau: tableau,
    phi_m_min_ecrasement: ecr,
    phi_m_requis: requis,
    conforme: phi_m >= requis,
    motif: phi_m >= requis ? `phi_m = ${phi_m} mm >= ${fr(requis, 0)} mm requis.` : `phi_m = ${phi_m} mm < ${fr(requis, 0)} mm requis.`,
  };
}

export type AncrageCadre = 'crochet' | 'coude';

export interface VerificationCadre {
  type: AncrageCadre;
  /** Retour droit minimal apres la courbure (mm). */
  retourMin: number;
  mandrinMin: number;
  conforme: boolean | null;
  motif: string;
}

/**
 * Ancrage des cadres et epingles, §8.5 et figure 8.5 :
 *   crochet (angle >= 135 degres) : retour >= max(5 phi ; 50 mm) ;
 *   coude (90 a 135 degres)       : retour >= max(10 phi ; 70 mm) ;
 * diametre de mandrin du tableau 8.1N. Les ancrages par barres
 * transversales soudees (figure 8.5 c et d) ne sont pas traites.
 */
export function verifierCadre(phi: number, type: AncrageCadre, profil: ProfilEc2, retour: number | null): VerificationCadre {
  verifierProfil(profil);
  exigerPositif(phi, 'Le diametre du cadre phi', 'mm');
  const retourMin = type === 'crochet' ? Math.max(5 * phi, 50) : Math.max(10 * phi, 70);
  const mandrinMin = mandrinMinimal(phi, profil);
  if (retour === null) {
    return { type, retourMin, mandrinMin, conforme: null, motif: `Retour droit requis : ${retourMin} mm (figure 8.5).` };
  }
  exigerPositif(retour, 'Le retour droit', 'mm');
  return {
    type,
    retourMin,
    mandrinMin,
    conforme: retour >= retourMin,
    motif: retour >= retourMin ? `Retour ${retour} mm >= ${retourMin} mm (figure 8.5).` : `Retour ${retour} mm < ${retourMin} mm (figure 8.5).`,
  };
}
