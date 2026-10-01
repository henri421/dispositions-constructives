/**
 * Valeurs recommandees de l'EN 1992-1-1:2004, sans annexe nationale.
 */

import type { ProfilEc2 } from './profil';

const EN = 'EN 1992-1-1:2004, valeur recommandee';

export function ec2Recommande(): ProfilEc2 {
  return {
    nom: 'Eurocode 2, valeurs recommandees',
    date: '2026-10-01',
    gamma_C: { valeur: 1.5, source: `${EN}, tableau 2.1N` },
    gamma_S: { valeur: 1.15, source: `${EN}, tableau 2.1N` },
    alpha_cc: { valeur: 1.0, source: `${EN}, §3.1.6(1)P` },
    alpha_ct: { valeur: 1.0, source: `${EN}, §3.1.6(2)P` },
    mandrin_petits: { valeur: 4, source: `${EN}, tableau 8.1N` },
    mandrin_grands: { valeur: 7, source: `${EN}, tableau 8.1N` },
    mandrin_seuil: { valeur: 16, source: `${EN}, tableau 8.1N` },
  };
}
