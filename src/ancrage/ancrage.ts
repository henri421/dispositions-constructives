/**
 * Longueur d'ancrage, EN 1992-1-1 §8.4.3 et §8.4.4, et diametre equivalent
 * des paquets de barres, §8.9.
 *
 * Unites : mm, mm2, MPa.
 *
 * L'outil constate la longueur requise ; si une longueur disponible est
 * fournie, il conclut. Il ne dessine aucun plan de ferraillage.
 */

import type { DonneesAncrage, DonneesContrainte, DonneesGroupe, ResultatAncrage } from '../domaines/resultat';
import type { ProfilEc2 } from '../norms/profil';
import { exigerPositif, verifierProfil } from '../norms/profil';
import { fyd, tractionPourAdherence } from '../materiaux/materiaux';
import { conditionsAdherence, contrainteAdherence, eta1, eta2 } from './adherence';
import { aireBarre, coefficientsAlpha, confinementAncrage, enrobageEquivalent, produitBorne, valeurDe } from './coefficients';

/** Nombre a la francaise pour les motifs affiches. */
function fr(x: number, d: number): string {
  return x.toFixed(d).replace('.', ',');
}

/** Diametre equivalent maximal d'un paquet, §8.9.1(2) (mm). */
export const PHI_N_MAX = 55;

/**
 * Diametre equivalent phi_n = phi sqrt(n_b) <= 55 mm, §8.9.1(2). n_b <= 4
 * pour des barres verticales comprimees et pour les barres d'un
 * recouvrement, n_b <= 3 dans les autres cas. Leve au-dela, plutot que de
 * calculer sur un paquet que la norme ne couvre pas.
 */
export function diametreEquivalent(phi: number, groupe: DonneesGroupe | null, recouvrement: boolean): number {
  exigerPositif(phi, 'Le diametre phi', 'mm');
  if (groupe === null || groupe.nb === 1) return phi;
  if (!Number.isInteger(groupe.nb) || groupe.nb < 1) {
    throw new Error('Le nombre de barres du paquet n_b doit etre un entier strictement positif (-).');
  }
  const nbMax = groupe.verticalesComprimees || recouvrement ? 4 : 3;
  if (groupe.nb > nbMax) {
    throw new Error(`Paquet de ${groupe.nb} barres : n_b est limite a ${nbMax} dans cette configuration (§8.9.1(2)).`);
  }
  const phi_n = phi * Math.sqrt(groupe.nb);
  if (phi_n > PHI_N_MAX) {
    throw new Error(`Diametre equivalent phi_n = ${fr(phi_n, 1)} mm > ${PHI_N_MAX} mm : paquet hors du domaine du §8.9.1(2).`);
  }
  return phi_n;
}

/** Contrainte sigma_sd a l'origine de l'ancrage, et son origine (MPa). */
export function contrainteOrigine(c: DonneesContrainte, f_yd: number): { sigma_sd: number; origine: ResultatAncrage['origineSigma'] } {
  if (c.mode === 'f_yd') return { sigma_sd: f_yd, origine: 'f_yd' };
  if (c.mode === 'saisie') {
    exigerPositif(c.sigma_sd, 'La contrainte sigma_sd', 'MPa');
    if (c.sigma_sd > f_yd) throw new Error(`sigma_sd = ${c.sigma_sd} MPa depasse f_yd = ${fr(f_yd, 1)} MPa.`);
    return { sigma_sd: c.sigma_sd, origine: 'saisie' };
  }
  exigerPositif(c.A_s_req, 'La section requise A_s,req', 'mm2');
  exigerPositif(c.A_s_prov, 'La section mise en place A_s,prov', 'mm2');
  if (c.A_s_req > c.A_s_prov) {
    throw new Error('A_s,req depasse A_s,prov : la section mise en place ne suffit pas, l ancrage n a pas d objet.');
  }
  return { sigma_sd: (f_yd * c.A_s_req) / c.A_s_prov, origine: 'f_yd-reduit' };
}

/** l_b,rqd = (phi / 4) (sigma_sd / f_bd), expression (8.3) (mm). */
export function longueurDeReference(phi: number, sigma_sd: number, f_bd: number): number {
  return (phi / 4) * (sigma_sd / f_bd);
}

/** l_b,min, expressions (8.6) et (8.7), et la borne qui gouverne. */
export function longueurMinimale(
  l_b_rqd: number,
  phi: number,
  sollicitation: 'traction' | 'compression'
): { valeur: number; origine: ResultatAncrage['origineLbMin'] } {
  const prop = (sollicitation === 'traction' ? 0.3 : 0.6) * l_b_rqd;
  const dix = 10 * phi;
  const plancher = 100;
  const valeur = Math.max(prop, dix, plancher);
  const origine = valeur === prop ? 'proportionnelle' : valeur === dix ? '10phi' : 'plancher';
  return { valeur, origine };
}

/** Verdict a partir d'une longueur requise et d'une longueur eventuellement disponible. */
export function verdictLongueur(requise: number, disponible: number | null, nom: string): { verdict: ResultatAncrage['verdict']; motif: string } {
  if (disponible === null) {
    return { verdict: 'longueur-requise', motif: `${nom} requise : ${fr(requise, 0)} mm. Aucune longueur disponible saisie.` };
  }
  exigerPositif(disponible, 'La longueur disponible', 'mm');
  return disponible >= requise
    ? { verdict: 'conforme', motif: `Longueur disponible ${disponible} mm >= ${nom} requise ${fr(requise, 0)} mm.` }
    : { verdict: 'non-conforme', motif: `Longueur disponible ${disponible} mm < ${nom} requise ${fr(requise, 0)} mm.` };
}

/** Grandeurs communes a l'ancrage et au recouvrement. */
export function grandeursDeBase(d: DonneesAncrage, profil: ProfilEc2, recouvrement: boolean) {
  verifierProfil(profil);
  const phi_calcul = diametreEquivalent(d.phi, d.groupe, recouvrement);
  const traction = tractionPourAdherence(d.fck, profil);
  const adh = conditionsAdherence(d.adherence);
  const e1 = eta1(adh.conditions);
  const e2 = eta2(phi_calcul);
  const f_bd = contrainteAdherence(e1, e2, traction.fctd);
  const f_yd = fyd(d.fyk, profil);
  const sigma = contrainteOrigine(d.contrainte, f_yd);
  const l_b_rqd = longueurDeReference(phi_calcul, sigma.sigma_sd, f_bd);
  const c_d = enrobageEquivalent(d.forme, d.a, d.c1, d.c);
  // A_s : aire d'une barre ancree du plus grand diametre (tableau 8.2), pas du paquet.
  const As = aireBarre(d.phi);
  return { phi_calcul, traction, adh, e1, e2, f_bd, f_yd, sigma, l_b_rqd, c_d, As };
}

/**
 * Longueur d'ancrage de calcul.
 *
 * Methode generale, §8.4.4(1) :
 *   l_bd = alpha_1 alpha_2 alpha_3 alpha_4 alpha_5 l_b,rqd >= l_b,min,
 *   avec alpha_2 alpha_3 alpha_5 >= 0,7.
 * Methode simplifiee, §8.4.4(2), en traction seulement :
 *   l_b,eq = alpha_1 l_b,rqd (coudes, crochets, boucles) ou alpha_4 l_b,rqd
 *   (barre transversale soudee). CHOIX DE MODELISATION : l_b,eq est lui aussi
 *   porte a l_b,min, du cote de la securite.
 */
export function verifierAncrage(d: DonneesAncrage, profil: ProfilEc2): ResultatAncrage {
  return calculerAncrage(d, profil, false);
}

/**
 * Calcul commun. `recouvrement` releve la limite du nombre de barres d'un
 * paquet a 4 (§8.9.1(2)) quand l'ancrage sert de base a un recouvrement.
 */
export function calculerAncrage(d: DonneesAncrage, profil: ProfilEc2, recouvrement: boolean): ResultatAncrage {
  const g = grandeursDeBase(d, profil, recouvrement);
  const avertissements: string[] = [];
  if (g.traction.plafonne) {
    avertissements.push(`f_ck = ${d.fck} MPa : f_ctk,0.05 plafonne a la valeur du C60/75 pour l adherence (§8.4.2(2)).`);
  }
  if (d.groupe !== null && d.groupe.nb > 1) {
    avertissements.push(`Paquet de ${d.groupe.nb} barres : phi_n = ${fr(g.phi_calcul, 1)} mm remplace phi (§8.9.1(2)).`);
  }
  const conf = confinementAncrage(d.confinement, g.As);
  const alphas = coefficientsAlpha({
    sollicitation: d.sollicitation,
    forme: d.forme,
    phi: g.phi_calcul,
    c_d: g.c_d,
    confinement: conf,
    soudees: d.barresTransversalesSoudees,
    p: d.pressionTransversale,
  });
  const produit = produitBorne(alphas);

  let l_calcul: number;
  if (d.methode === 'simplifiee') {
    if (d.sollicitation !== 'traction') {
      throw new Error('La longueur equivalente simplifiee du §8.4.4(2) ne vaut qu en traction.');
    }
    if (d.forme !== 'droite') {
      l_calcul = valeurDe(alphas.alpha_1) * g.l_b_rqd;
    } else if (d.barresTransversalesSoudees) {
      l_calcul = valeurDe(alphas.alpha_4) * g.l_b_rqd;
    } else {
      throw new Error('La methode simplifiee vise les coudes, crochets, boucles ou barres transversales soudees (figure 8.1) ; une barre droite sans soudure releve de la methode generale.');
    }
  } else {
    l_calcul = valeurDe(alphas.alpha_1) * valeurDe(alphas.alpha_4) * produit.retenu * g.l_b_rqd;
  }
  const min = longueurMinimale(g.l_b_rqd, g.phi_calcul, d.sollicitation);
  const l_bd = Math.max(l_calcul, min.valeur);
  const v = verdictLongueur(l_bd, d.longueurDisponible, 'l_bd');

  return {
    verdict: v.verdict,
    motif: v.motif,
    sollicitation: d.sollicitation,
    methode: d.methode,
    conditionsAdherence: g.adh.conditions,
    motifAdherence: g.adh.motif,
    phi_calcul: g.phi_calcul,
    origineSigma: g.sigma.origine,
    fck_retenu: g.traction.fck_retenu,
    fckPlafonne: g.traction.plafonne,
    fctd: g.traction.fctd,
    eta_1: g.e1,
    eta_2: g.e2,
    f_bd: g.f_bd,
    f_yd: g.f_yd,
    sigma_sd: g.sigma.sigma_sd,
    l_b_rqd: g.l_b_rqd,
    c_d: g.c_d,
    lambda: conf?.lambda ?? null,
    K: conf?.K ?? null,
    alphas,
    produit235: produit.brut,
    borneProduitActivee: produit.activee,
    l_calcul,
    l_b_min: min.valeur,
    origineLbMin: min.origine,
    l_bd,
    avertissements,
  };
}
