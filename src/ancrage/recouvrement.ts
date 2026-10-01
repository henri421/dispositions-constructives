/**
 * Recouvrements, EN 1992-1-1 §8.7.3, et armatures transversales au droit
 * des recouvrements, §8.7.4.
 *
 * Unites : mm, mm2, MPa, pourcentages en %.
 */

import type { DonneesRecouvrement, OrigineCoefficient, ResultatRecouvrement } from '../domaines/resultat';
import type { ProfilEc2 } from '../norms/profil';
import { exigerPositif, exigerPositifOuNul } from '../norms/profil';
import { coefficientK, lambdaConfinement, valeurDe } from './coefficients';
import { calculerAncrage, verdictLongueur } from './ancrage';

/** Nombre a la francaise pour les motifs affiches. */
function fr(x: number, d: number): string {
  return x.toFixed(d).replace('.', ',');
}

/** alpha_6 = (rho_1 / 25)^0,5, borne a [1,0 ; 1,5], expression (8.10) et tableau 8.3. */
export function coefficientAlpha6(rho1: number): number {
  if (!Number.isFinite(rho1) || rho1 <= 0 || rho1 > 100) {
    throw new Error('Le pourcentage de barres recouvertes rho_1 doit etre compris entre 0 exclu et 100 (%).');
  }
  return Math.min(1.5, Math.max(1, Math.sqrt(rho1 / 25)));
}

/** l_0,min = max(0,3 alpha_6 l_b,rqd ; 15 phi ; 200 mm), expression (8.11). */
export function longueurMinimaleRecouvrement(
  alpha_6: number,
  l_b_rqd: number,
  phi: number
): { valeur: number; origine: ResultatRecouvrement['origineL0Min'] } {
  const prop = 0.3 * alpha_6 * l_b_rqd;
  const quinze = 15 * phi;
  const valeur = Math.max(prop, quinze, 200);
  return { valeur, origine: valeur === prop ? 'proportionnelle' : valeur === quinze ? '15phi' : 'plancher' };
}

/**
 * Armatures transversales au droit d'un recouvrement de barres tendues,
 * §8.7.4.1, et comprimees, §8.7.4.2.
 *   phi < 20 mm ou rho_1 < 25 % : les armatures necessaires par ailleurs suffisent ;
 *   sinon Sigma A_st >= A_s d'une barre recouverte, la moitie dans chaque
 *   tiers extreme de l_0 ; si plus de 50 % des barres sont recouvertes et
 *   a <= 10 phi, cadres ou U ancres dans la masse ;
 *   en compression, une barre en plus au-dela de chaque extremite, a moins
 *   de 4 phi.
 * L'outil rend la section et sa repartition, jamais un plan de ferraillage.
 */
export function armatureDeCouture(
  phi: number,
  rho1: number,
  a: number,
  l_0: number,
  compression: boolean
): ResultatRecouvrement['armatureDeCouture'] {
  const As = (Math.PI * phi * phi) / 4;
  if (phi < 20 || rho1 < 25) {
    return {
      requise: false,
      A_st: 0,
      repartition: '',
      motif: `phi = ${phi} mm${phi < 20 ? ' < 20 mm' : ''}${rho1 < 25 ? `, rho_1 = ${rho1} % < 25 %` : ''} : les armatures transversales necessaires par ailleurs suffisent (§8.7.4.1(2)).`,
    };
  }
  const tiers = l_0 / 3;
  let repartition = `Sigma A_st / 2 = ${fr((As / 2), 0)} mm2 dans chacun des deux tiers extremes du recouvrement (${fr(tiers, 0)} mm), parallele au lit des barres recouvertes (§8.7.4.1(3) et (4)).`;
  if (rho1 > 50 && a <= 10 * phi) {
    repartition += ` Plus de 50 % recouverts et a = ${a} mm <= 10 phi : cadres ou U ancres dans la masse du beton.`;
  }
  if (compression) {
    repartition += ` Barres comprimees : une barre transversale en plus au-dela de chaque extremite, a moins de 4 phi = ${4 * phi} mm (§8.7.4.2).`;
  }
  return {
    requise: true,
    A_st: As,
    repartition,
    motif: `phi = ${phi} mm >= 20 mm et rho_1 = ${rho1} % >= 25 % : Sigma A_st >= A_s d une barre recouverte.`,
  };
}

/**
 * Longueur de recouvrement, §8.7.3(1) :
 *   l_0 = alpha_1 alpha_2 alpha_3 alpha_5 alpha_6 l_b,rqd >= l_0,min.
 * alpha_4 N'INTERVIENT PAS : ce n'est pas un oubli, c'est l'expression
 * (8.10). Pour alpha_3, Sigma A_st,min = 1,0 A_s sigma_sd / f_yd, A_s etant
 * l'aire d'une barre recouverte. La borne alpha_2 alpha_3 alpha_5 >= 0,7 de
 * l'expression (8.5) est conservee.
 */
export function verifierRecouvrement(d: DonneesRecouvrement, profil: ProfilEc2): ResultatRecouvrement {
  if (d.methode !== 'generale') {
    throw new Error('Le recouvrement se calcule par l expression (8.10) : la methode simplifiee de l ancrage ne s y applique pas.');
  }
  // L'ancrage fournit l_b,rqd, c_d et alpha_1, alpha_2, alpha_5 ; la
  // longueur disponible n'y est pas jugee (elle l'est sur l_0).
  const ancrage = calculerAncrage({ ...d, longueurDisponible: null }, profil, true);
  const phi = ancrage.phi_calcul;
  const alpha_6 = coefficientAlpha6(d.rho1);

  let alpha_3: OrigineCoefficient;
  if (d.sollicitation === 'compression') {
    alpha_3 = { statut: 'fixe-par-la-norme', valeur: 1, motif: 'barre comprimee : 1,0 (tableau 8.2)' };
  } else if (d.confinement === null) {
    alpha_3 = { statut: 'non-applicable', motif: 'aucune armature transversale prise en compte' };
  } else {
    exigerPositifOuNul(d.confinement.sommeAst, 'La section des armatures transversales Sigma A_st', 'mm2');
    const As = (Math.PI * d.phi * d.phi) / 4;
    const min = (As * ancrage.sigma_sd) / ancrage.f_yd;
    const lambda = lambdaConfinement(d.confinement.sommeAst, min, As);
    const K = coefficientK(d.confinement.position);
    const brut = 1 - K * lambda;
    alpha_3 = {
      statut: 'calcule',
      valeur: Math.min(1, Math.max(0.7, brut)),
      detail: `Sigma A_st,min = A_s sigma_sd / f_yd = ${fr(min, 0)} mm2 ; 1 - K lambda = ${fr(brut, 3)}, borne a [0,7 ; 1,0]`,
    };
  }

  const brut235 = valeurDe(ancrage.alphas.alpha_2) * valeurDe(alpha_3) * valeurDe(ancrage.alphas.alpha_5);
  const retenu235 = Math.max(0.7, brut235);
  const l_calcul = valeurDe(ancrage.alphas.alpha_1) * retenu235 * alpha_6 * ancrage.l_b_rqd;
  const min = longueurMinimaleRecouvrement(alpha_6, ancrage.l_b_rqd, phi);
  const l_0 = Math.max(l_calcul, min.valeur);
  const v = verdictLongueur(l_0, d.longueurDisponible, 'l_0');
  exigerPositif(d.distanceEntreRecouvrements, 'La distance libre entre recouvrements adjacents', 'mm');

  return {
    verdict: v.verdict,
    motif: v.motif,
    ancrage,
    rho1: d.rho1,
    alpha_6,
    alpha_3,
    produit235: brut235,
    borneProduitActivee: brut235 < 0.7,
    l_calcul,
    l_0_min: min.valeur,
    origineL0Min: min.origine,
    l_0,
    armatureDeCouture: armatureDeCouture(d.phi, d.rho1, d.distanceEntreRecouvrements, l_0, d.sollicitation === 'compression'),
  };
}
