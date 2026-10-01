/**
 * Enrobage equivalent c_d et coefficients alpha_1 a alpha_5, EN 1992-1-1
 * §8.4.4, figure 8.3, figure 8.4 et tableau 8.2.
 *
 * Unites : mm, mm2, MPa.
 */

import type {
  DonneesConfinement,
  FormeExtremite,
  NomAlpha,
  OrigineCoefficient,
  PositionTransversale,
  Sollicitation,
} from '../domaines/resultat';
import { exigerPositifOuNul } from '../norms/profil';

/** Nombre a la francaise pour les motifs affiches. */
function fr(x: number, d: number): string {
  return x.toFixed(d).replace('.', ',');
}

const BORNE_BASSE = 0.7;

function borner(v: number): number {
  return Math.min(1, Math.max(BORNE_BASSE, v));
}

/**
 * c_d, figure 8.3 :
 *   barre droite            : min(a/2 ; c_1 ; c)
 *   coude ou crochet        : min(a/2 ; c_1)
 *   boucle                  : c
 * Trois configurations, trois expressions : c_d n'est pas l'enrobage.
 */
export function enrobageEquivalent(forme: FormeExtremite, a: number, c1: number, c: number): number {
  exigerPositifOuNul(a, 'La distance libre entre barres a', 'mm');
  exigerPositifOuNul(c1, 'L enrobage lateral c_1', 'mm');
  exigerPositifOuNul(c, 'L enrobage de fond c', 'mm');
  switch (forme) {
    case 'droite':
      return Math.min(a / 2, c1, c);
    case 'coude-ou-crochet':
      return Math.min(a / 2, c1);
    case 'boucle':
      return c;
  }
}

/** K, figure 8.4 : 0,1 barre ancree dans l'angle d'un cadre, 0,05 le long d'un brin, 0 transversales exterieures. */
export function coefficientK(position: PositionTransversale): number {
  return position === 'angle' ? 0.1 : position === 'courant' ? 0.05 : 0;
}

/** Aire d'une barre (mm2). */
export function aireBarre(phi: number): number {
  return (Math.PI * phi * phi) / 4;
}

/**
 * lambda = (Sigma A_st - Sigma A_st,min) / A_s, tableau 8.2.
 * `sommeAstMin` est passee par l'appelant : 0,25 A_s (poutre) ou 0 (dalle)
 * pour un ancrage, A_s sigma_sd / f_yd pour un recouvrement (§8.7.3(1)).
 */
export function lambdaConfinement(sommeAst: number, sommeAstMin: number, As: number): number {
  return (sommeAst - sommeAstMin) / As;
}

export interface EntreesAlphas {
  sollicitation: Sollicitation;
  forme: FormeExtremite;
  phi: number;
  c_d: number;
  /** lambda et K, ou null sans armature transversale prise en compte. */
  confinement: { lambda: number; K: number } | null;
  soudees: boolean;
  p: number;
}

/** Valeur numerique d'un coefficient ; un coefficient sans objet vaut 1 dans le produit. */
export function valeurDe(o: OrigineCoefficient): number {
  return o.statut === 'non-applicable' ? 1 : o.valeur;
}

/**
 * Les cinq coefficients du tableau 8.2.
 *
 * En COMPRESSION, le tableau fixe alpha_1 = alpha_2 = alpha_3 = 1,0 : ils
 * sont rendus « fixes par la norme », avec leur motif. alpha_4 = 0,7 vaut en
 * traction COMME en compression. alpha_5 n'a pas de valeur en compression
 * (tiret du tableau) : il est NON APPLICABLE, pas egal a 1.
 */
export function coefficientsAlpha(e: EntreesAlphas): Record<NomAlpha, OrigineCoefficient> {
  const droite = e.forme === 'droite';
  const comprime = e.sollicitation === 'compression';
  const motifC = 'barre comprimee : 1,0 (tableau 8.2)';

  const alpha_1: OrigineCoefficient = comprime
    ? { statut: 'fixe-par-la-norme', valeur: 1, motif: motifC }
    : droite
      ? { statut: 'fixe-par-la-norme', valeur: 1, motif: 'barre droite : 1,0 (tableau 8.2)' }
      : e.c_d > 3 * e.phi
        ? { statut: 'calcule', valeur: 0.7, detail: `c_d = ${e.c_d} mm > 3 phi = ${3 * e.phi} mm : 0,7` }
        : { statut: 'calcule', valeur: 1, detail: `c_d = ${e.c_d} mm <= 3 phi = ${3 * e.phi} mm : 1,0` };

  let alpha_2: OrigineCoefficient;
  if (comprime) {
    alpha_2 = { statut: 'fixe-par-la-norme', valeur: 1, motif: motifC };
  } else {
    const ref = droite ? e.phi : 3 * e.phi;
    const brut = 1 - (0.15 * (e.c_d - ref)) / e.phi;
    alpha_2 = {
      statut: 'calcule',
      valeur: borner(brut),
      detail: `1 - 0,15 (c_d - ${droite ? 'phi' : '3 phi'}) / phi = ${fr(brut, 3)}, borne a [0,7 ; 1,0]`,
    };
  }

  let alpha_3: OrigineCoefficient;
  if (comprime) {
    alpha_3 = { statut: 'fixe-par-la-norme', valeur: 1, motif: motifC };
  } else if (e.confinement === null) {
    alpha_3 = { statut: 'non-applicable', motif: 'aucune armature transversale prise en compte' };
  } else {
    const brut = 1 - e.confinement.K * e.confinement.lambda;
    alpha_3 = {
      statut: 'calcule',
      valeur: borner(brut),
      detail: `1 - K lambda = 1 - ${e.confinement.K} x ${fr(e.confinement.lambda, 3)} = ${fr(brut, 3)}, borne a [0,7 ; 1,0]`,
    };
  }

  const alpha_4: OrigineCoefficient = e.soudees
    ? { statut: 'fixe-par-la-norme', valeur: 0.7, motif: 'barres transversales soudees, figure 8.1 e) : 0,7 (tableau 8.2)' }
    : { statut: 'non-applicable', motif: 'aucune barre transversale soudee' };

  let alpha_5: OrigineCoefficient;
  if (comprime) {
    alpha_5 = { statut: 'non-applicable', motif: 'barre comprimee : sans objet (tableau 8.2)' };
  } else if (exigerPositifOuNul(e.p, 'La pression transversale p', 'MPa') === 0) {
    alpha_5 = { statut: 'non-applicable', motif: 'aucune pression transversale declaree' };
  } else {
    const brut = 1 - 0.04 * e.p;
    alpha_5 = { statut: 'calcule', valeur: borner(brut), detail: `1 - 0,04 p = ${fr(brut, 3)}, borne a [0,7 ; 1,0]` };
  }

  return { alpha_1, alpha_2, alpha_3, alpha_4, alpha_5 };
}

/** Lambda et K a partir des donnees de confinement d'un ancrage (Sigma A_st,min = 0,25 A_s poutre, 0 dalle). */
export function confinementAncrage(c: DonneesConfinement | null, As: number): { lambda: number; K: number } | null {
  if (c === null) return null;
  exigerPositifOuNul(c.sommeAst, 'La section des armatures transversales Sigma A_st', 'mm2');
  const min = c.typeElement === 'poutre' ? 0.25 * As : 0;
  return { lambda: lambdaConfinement(c.sommeAst, min, As), K: coefficientK(c.position) };
}

/**
 * Borne de l'expression (8.5) : alpha_2 alpha_3 alpha_5 >= 0,7. Tres souvent
 * omise dans les tableurs, et son oubli est non conservatif.
 */
export function produitBorne(alphas: Record<NomAlpha, OrigineCoefficient>): { brut: number; retenu: number; activee: boolean } {
  const brut = valeurDe(alphas.alpha_2) * valeurDe(alphas.alpha_3) * valeurDe(alphas.alpha_5);
  return { brut, retenu: Math.max(BORNE_BASSE, brut), activee: brut < BORNE_BASSE };
}
