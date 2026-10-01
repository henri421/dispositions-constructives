/**
 * Cas de reference : HA16 en C25/30, B500, bonnes conditions d'adherence,
 * barre droite, a = 60 mm, c_1 = c = 30 mm (c_d = 30 mm), sigma_sd = f_yd.
 *
 * Valeurs calculees a la main :
 *   f_ctm = 0,30 x 25^(2/3) = 2,5650 MPa ; f_ctd = 0,7 x 2,5650 / 1,5 = 1,1970 MPa
 *   f_bd = 2,25 x 1,1970 = 2,6932 MPa ; f_yd = 500 / 1,15 = 434,78 MPa
 *   l_b,rqd = 16 / 4 x 434,78 / 2,6932 = 645,75 mm
 */

import type { DonneesAncrage, DonneesRecouvrement } from '../src/index';

export function donneesBase(modifs: Partial<DonneesAncrage> = {}): DonneesAncrage {
  return {
    phi: 16,
    groupe: null,
    fck: 25,
    fyk: 500,
    sollicitation: 'traction',
    adherence: { mode: 'declarees', conditions: 'bonnes' },
    contrainte: { mode: 'f_yd' },
    forme: 'droite',
    a: 60,
    c1: 30,
    c: 30,
    confinement: null,
    barresTransversalesSoudees: false,
    pressionTransversale: 0,
    methode: 'generale',
    longueurDisponible: null,
    ...modifs,
  };
}

export function donneesRecouvrement(modifs: Partial<DonneesRecouvrement> = {}): DonneesRecouvrement {
  return { ...donneesBase(), rho1: 50, distanceEntreRecouvrements: 100, ...modifs };
}

/** Confinement de poutre : quatre brins HA8 (201,06 mm2), barre dans l'angle (K = 0,1). */
export const CONFINEMENT_POUTRE = { typeElement: 'poutre', sommeAst: (4 * Math.PI * 64) / 4, position: 'angle' } as const;
