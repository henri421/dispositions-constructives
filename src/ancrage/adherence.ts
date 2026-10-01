/**
 * Adherence, EN 1992-1-1 §8.4.2.
 *
 * Unites : mm, MPa, degres.
 */

import type { ConditionsAdherence, DonneesAdherence } from '../domaines/resultat';
import { exigerPositif, exigerPositifOuNul } from '../norms/profil';

/** Inclinaison a partir de laquelle l'adherence est toujours bonne, figure 8.2 a) (degres). */
const INCLINAISON_BONNE = 45;
/** Hauteur d'element jusqu'a laquelle toutes les barres sont en bonnes conditions, figure 8.2 b) (mm). */
const HAUTEUR_TOUT_BON = 250;
/** Zone basse en bonnes conditions pour 250 < h <= 600 mm, figure 8.2 c) (mm). */
const ZONE_BASSE = 250;
/** Hauteur au-dela de laquelle seule la zone haute est mauvaise, figure 8.2 d) (mm). */
const HAUTEUR_ZONE_HAUTE = 600;
/** Epaisseur de la zone haute en mauvaises conditions pour h > 600 mm, figure 8.2 d) (mm). */
const ZONE_HAUTE = 300;

export interface Adherence {
  conditions: ConditionsAdherence;
  motif: string;
}

/**
 * Conditions d'adherence, figure 8.2. Declarees : reprises telles quelles.
 * Deduites de la geometrie de coulage :
 *   inclinaison >= 45 degres                 : bonnes ;
 *   h <= 250 mm                              : bonnes ;
 *   250 < h <= 600 mm : bonnes si la barre est a au plus 250 mm du fond ;
 *   h > 600 mm        : bonnes si la barre est a au moins 300 mm du dessus.
 */
export function conditionsAdherence(d: DonneesAdherence): Adherence {
  if (d.mode === 'declarees') {
    return { conditions: d.conditions, motif: 'Conditions declarees par l utilisateur.' };
  }
  const h = exigerPositif(d.hauteurElement, 'La hauteur de l element coule h', 'mm');
  const z = exigerPositifOuNul(d.distanceAuFond, 'La distance de la barre au fond', 'mm');
  if (z > h) throw new Error('La distance de la barre au fond depasse la hauteur de l element (mm).');
  if (!Number.isFinite(d.inclinaison) || d.inclinaison < 0 || d.inclinaison > 90) {
    throw new Error('L inclinaison de la barre doit etre comprise entre 0 et 90 degres (degres).');
  }
  if (d.inclinaison >= INCLINAISON_BONNE) {
    return { conditions: 'bonnes', motif: `Barre inclinee de ${d.inclinaison} degres >= 45 : bonnes (figure 8.2 a).` };
  }
  if (h <= HAUTEUR_TOUT_BON) {
    return { conditions: 'bonnes', motif: `h = ${h} mm <= 250 mm : bonnes (figure 8.2 b).` };
  }
  if (h <= HAUTEUR_ZONE_HAUTE) {
    return z <= ZONE_BASSE
      ? { conditions: 'bonnes', motif: `h = ${h} mm, barre a ${z} mm du fond <= 250 mm : bonnes (figure 8.2 c).` }
      : { conditions: 'mauvaises', motif: `h = ${h} mm, barre a ${z} mm du fond > 250 mm : mauvaises (figure 8.2 c).` };
  }
  const dessus = h - z;
  return dessus >= ZONE_HAUTE
    ? { conditions: 'bonnes', motif: `h = ${h} mm > 600 mm, barre a ${dessus} mm du dessus >= 300 mm : bonnes (figure 8.2 d).` }
    : { conditions: 'mauvaises', motif: `h = ${h} mm > 600 mm, barre a ${dessus} mm du dessus < 300 mm : mauvaises (figure 8.2 d).` };
}

/** eta_1 : 1,0 en bonnes conditions, 0,7 sinon, §8.4.2(2). */
export function eta1(conditions: ConditionsAdherence): number {
  return conditions === 'bonnes' ? 1 : 0.7;
}

/** eta_2 : 1,0 pour phi <= 32 mm, (132 - phi) / 100 au-dela, §8.4.2(2). phi = 32 donne 1,0 exactement. */
export function eta2(phi: number): number {
  exigerPositif(phi, 'Le diametre phi', 'mm');
  return phi <= 32 ? 1 : (132 - phi) / 100;
}

/** f_bd = 2,25 eta_1 eta_2 f_ctd, expression (8.2) (MPa). */
export function contrainteAdherence(e1: number, e2: number, fctd: number): number {
  return 2.25 * e1 * e2 * fctd;
}
