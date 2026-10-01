/**
 * Tableau de synthese par diametre courant, a conditions fixees.
 *
 * Unites : mm, MPa.
 *
 * C'est l'usage le plus frequent en bureau d'etudes. Les longueurs sont
 * CALCULEES par les formules, jamais recopiees d'un tableau publie.
 */

import type { DonneesAncrage } from './resultat';
import type { ProfilEc2 } from '../norms/profil';
import { verifierAncrage } from '../ancrage/ancrage';
import { verifierRecouvrement } from '../ancrage/recouvrement';

export const DIAMETRES_COURANTS = [8, 10, 12, 14, 16, 20, 25, 32] as const;

export interface LigneSynthese {
  phi: number;
  f_bd: number;
  l_b_rqd: number;
  l_bd: number;
  /** l_0 pour le rho_1 demande. */
  l_0: number;
}

/**
 * Une ligne par diametre ; la longueur disponible eventuelle est ignoree.
 * Une erreur pour un diametre (paquet hors domaine...) est rendue telle
 * quelle dans la ligne, plutot que d'interrompre tout le tableau.
 */
export function tableauParDiametre(
  base: DonneesAncrage,
  profil: ProfilEc2,
  rho1: number,
  diametres: readonly number[] = DIAMETRES_COURANTS
): Array<LigneSynthese | { phi: number; erreur: string }> {
  return diametres.map((phi) => {
    try {
      const d = { ...base, phi, longueurDisponible: null };
      const a = verifierAncrage(d, profil);
      const r = verifierRecouvrement({ ...d, methode: 'generale', rho1, distanceEntreRecouvrements: 10 * phi }, profil);
      return { phi, f_bd: a.f_bd, l_b_rqd: a.l_b_rqd, l_bd: a.l_bd, l_0: r.l_0 };
    } catch (e) {
      return { phi, erreur: e instanceof Error ? e.message : String(e) };
    }
  });
}
