/**
 * Resistances du beton et de l'acier utiles au chapitre 8, EN 1992-1-1
 * tableau 3.1 et §3.1.6.
 *
 * Unites : MPa.
 */

import type { ProfilEc2 } from '../norms/profil';
import { exigerPositif } from '../norms/profil';

/** Classe au-dela de laquelle f_ctk,0.05 est plafonne pour l'adherence, §8.4.2(2) (MPa). */
export const FCK_PLAFOND_ADHERENCE = 60;

/**
 * f_ctm, tableau 3.1 : 0,30 f_ck^(2/3) jusqu'a C50/60, 2,12 ln(1 + f_cm/10)
 * au-dela, avec f_cm = f_ck + 8. Meme expression que `fctmDepuisFck` de
 * `section-uls`.
 */
export function fctmDepuisFck(fck: number): number {
  exigerPositif(fck, 'La resistance caracteristique du beton f_ck', 'MPa');
  return fck <= 50 ? 0.3 * fck ** (2 / 3) : 2.12 * Math.log(1 + (fck + 8) / 10);
}

/** f_ctk,0.05 = 0,7 f_ctm, tableau 3.1. */
export function fctk005DepuisFctm(fctm: number): number {
  return 0.7 * fctm;
}

export interface TractionDeCalcul {
  /** f_ck effectivement retenu pour l'adherence (MPa). */
  fck_retenu: number;
  /** true si le plafond C60/75 du §8.4.2(2) a ete active. */
  plafonne: boolean;
  fctm: number;
  fctk005: number;
  fctd: number;
}

/**
 * f_ctd = alpha_ct f_ctk,0.05 / gamma_C, POUR L'ADHERENCE : f_ctk,0.05 est
 * plafonne a la valeur du C60/75 (§8.4.2(2)), la fragilite croissante des
 * betons a haute resistance ne permettant pas de compter sur une adherence
 * proportionnelle. Sans ce plafond, un C80/95 donnerait une adherence
 * surevaluee — piege classique des tableurs.
 */
export function tractionPourAdherence(fck: number, profil: ProfilEc2): TractionDeCalcul {
  exigerPositif(fck, 'La resistance caracteristique du beton f_ck', 'MPa');
  const fck_retenu = Math.min(fck, FCK_PLAFOND_ADHERENCE);
  const fctm = fctmDepuisFck(fck_retenu);
  const fctk005 = fctk005DepuisFctm(fctm);
  return {
    fck_retenu,
    plafonne: fck > FCK_PLAFOND_ADHERENCE,
    fctm,
    fctk005,
    fctd: (profil.alpha_ct.valeur * fctk005) / profil.gamma_C.valeur,
  };
}

/** f_cd = alpha_cc f_ck / gamma_C, §3.1.6(1)P (MPa). */
export function fcd(fck: number, profil: ProfilEc2): number {
  exigerPositif(fck, 'La resistance caracteristique du beton f_ck', 'MPa');
  return (profil.alpha_cc.valeur * fck) / profil.gamma_C.valeur;
}

/** f_yd = f_yk / gamma_S, §3.2.7 (MPa). */
export function fyd(fyk: number, profil: ProfilEc2): number {
  exigerPositif(fyk, 'La limite d elasticite f_yk', 'MPa');
  return fyk / profil.gamma_S.valeur;
}
