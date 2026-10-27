/**
 * Contenu de la note de calcul commune (`noteDeCalculHtml` d'aedificium-ui).
 *
 * Module PUR. La note refait le calcul depuis la saisie, avec les memes
 * fonctions que `main.ts` (noyau, `vue`, `croquis`) : elle porte donc les
 * memes lignes que l'ecran et le CSV, sans dependre de l'etat de la page.
 */

import { nombreAffiche, type BlocResultat, type ElementNote, type LigneResultat, type NoteDeCalcul, type VerificationNote } from 'aedificium-ui';
import {
  tableauParDiametre,
  verifierAncrage,
  verifierCadre,
  verifierMandrin,
  verifierRecouvrement,
  type ProfilEc2,
  type ResultatAncrage,
  type ResultatRecouvrement,
  type VerificationCadre,
  type VerificationMandrin,
} from '../../src/index';
import { donneesAncrage, donneesRecouvrement, type ModeleSaisie } from './form';
import { croquisAncrage, croquisRecouvrement } from './croquis';
import { blocEntrees, blocSynthese, lignesAncrage, lignesMandrinEtCadre, lignesRecouvrement, messageDErreur } from './vue';

/** Hypotheses et limites rappelees dans la note de calcul. */
export const HYPOTHESES_NOTE: string[] = [
  "Valeurs recommandées de l'EN 1992-1-1 ; aucune annexe nationale codée.",
  'Borne alpha_2 alpha_3 alpha_5 >= 0,7 appliquée aux ancrages et aux recouvrements.',
  'Méthode simplifiée : l_b,eq porté à l_b,min, du côté de la sécurité.',
];

const aff = (v: number, d = 3): string => nombreAffiche(v, Math.min(d, 3));
const L = (symbole: string, libelle: string, valeur: string): LigneResultat => ({ symbole, libelle, valeur });
const bloc = (b: BlocResultat): ElementNote => ({ type: 'bloc', bloc: b });

type Principal = { type: 'ancrage'; r: ResultatAncrage } | { type: 'recouvrement'; r: ResultatRecouvrement };

/** Nom de l'element quand il n'est pas renseigne. */
export function nomDeLElement(m: ModeleSaisie): string {
  return `${m.mode === 'ancrage' ? 'Ancrage' : 'Recouvrement'} HA${aff(m.phi, 0)}`;
}

function ligneContrainte(m: ModeleSaisie): LigneResultat {
  if (m.sigMode === 'saisie') return L('sigma_sd', "contrainte à l'origine, saisie", `${aff(m.sigma, 1)} MPa`);
  if (m.sigMode === 'reduite') return L('sigma_sd', "f_yd A_s,req / A_s,prov, contrainte à l'origine réduite", `A_s,req ${aff(m.asReq, 0)} mm2 ; A_s,prov ${aff(m.asProv, 0)} mm2`);
  return L('sigma_sd', "contrainte à l'origine", 'f_yd');
}

/**
 * Verifications : la longueur disponible face a la longueur requise (rien
 * sans longueur saisie : l'outil constate), puis le mandrin et le cadre
 * quand ils sont juges.
 */
export function verificationsDeLaNote(
  m: ModeleSaisie,
  principal: Principal | null,
  mandrin: VerificationMandrin | null,
  cadre: VerificationCadre | null
): VerificationNote[] {
  const v: VerificationNote[] = [];
  if (principal !== null && m.disponible !== null) {
    const requise = principal.type === 'ancrage' ? principal.r.l_bd : principal.r.l_0;
    v.push({
      nom: principal.type === 'ancrage' ? "Longueur d'ancrage" : 'Longueur de recouvrement',
      clause: principal.type === 'ancrage' ? '§8.4.4' : '§8.7.3',
      taux: requise / m.disponible,
      ok: principal.r.verdict === 'conforme',
    });
  }
  if (mandrin !== null && mandrin.conforme !== null) v.push({ nom: 'Diamètre du mandrin', clause: '§8.3, tableau 8.1N', taux: null, ok: mandrin.conforme });
  if (cadre !== null && cadre.conforme !== null) v.push({ nom: 'Ancrage des cadres', clause: '§8.5, figure 8.5', taux: null, ok: cadre.conforme });
  return v;
}

/** Note du calcul de la saisie `m`. */
export function noteDuCalcul(profil: ProfilEc2, m: ModeleSaisie, cartouche: { projet: string; element: string; date: string }): NoteDeCalcul {
  const [calcul, phi, materiaux, forme, enrobages] = blocEntrees(m).lignes;
  const calculs: ElementNote[] = [];
  const avertissements: string[] = [];
  let principal: Principal | null = null;
  let croquis = '';

  try {
    if (m.mode === 'ancrage') {
      const r = verifierAncrage(donneesAncrage(m), profil);
      principal = { type: 'ancrage', r };
      croquis = croquisAncrage(r, m.forme, m.confinement);
      avertissements.push(...r.avertissements);
      calculs.push(bloc({ titre: 'Ancrage (§8.4)', lignes: lignesAncrage(r), note: r.motif }));
    } else {
      const r = verifierRecouvrement(donneesRecouvrement(m), profil);
      principal = { type: 'recouvrement', r };
      croquis = croquisRecouvrement(r);
      avertissements.push(...r.ancrage.avertissements, ...(r.armatureDeCouture.requise ? [r.armatureDeCouture.repartition] : []));
      calculs.push(
        bloc({ titre: 'Adhérence et longueur de référence (§8.4)', lignes: lignesAncrage(r.ancrage).slice(0, 7), note: null }),
        bloc({ titre: 'Recouvrement (§8.7)', lignes: lignesRecouvrement(r), note: r.motif })
      );
    }
  } catch (e) {
    calculs.push(bloc({ titre: m.mode === 'ancrage' ? 'Ancrage' : 'Recouvrement', lignes: [], note: messageDErreur(e) }));
  }

  let mandrin: VerificationMandrin | null = null;
  let cadre: VerificationCadre | null = null;
  try {
    mandrin = verifierMandrin(m.phi, profil, m.phiM, null);
    cadre = verifierCadre(m.phiCadre, m.typeCadre, profil, m.retour);
    calculs.push(bloc({ titre: 'Mandrins et cadres (§8.3, §8.5)', lignes: lignesMandrinEtCadre(mandrin, cadre), note: null }));
  } catch (e) {
    mandrin = null;
    cadre = null;
    calculs.push(bloc({ titre: 'Mandrins et cadres (§8.3, §8.5)', lignes: [], note: messageDErreur(e) }));
  }

  calculs.push(bloc(blocSynthese(tableauParDiametre(donneesAncrage({ ...m, mode: 'ancrage' }), profil, m.rho1))));

  return {
    cartouche: {
      projet: cartouche.projet,
      element: cartouche.element.trim() === '' ? nomDeLElement(m) : cartouche.element,
      date: cartouche.date,
      norme: 'EN 1992-1-1:2004',
      outil: 'dispositions-constructives',
    },
    sections: {
      geometrie: [
        bloc({
          titre: 'Barres et enrobages',
          lignes: [
            phi,
            forme,
            enrobages,
            L('l_disponible', 'longueur disponible', m.disponible === null ? 'non saisie' : `${aff(m.disponible, 0)} mm`),
            ...(m.mode === 'recouvrement' ? [L('rho_1', 'proportion de barres recouvertes dans la section', `${aff(m.rho1, 0)} %`)] : []),
          ],
          note: null,
        }),
        ...(croquis === '' ? [] : [{ type: 'figure' as const, svg: croquis, legende: m.mode === 'ancrage' ? "Croquis de l'ancrage" : 'Croquis du recouvrement' }]),
      ],
      materiaux: [bloc({ titre: 'Matériaux', lignes: [materiaux], note: null })],
      hypotheses: [
        { type: 'texte', texte: `Profil normatif : ${profil.nom}, données consultées le ${profil.date}.` },
        bloc({
          titre: 'Objet du calcul',
          lignes: [calcul, ...(m.mode === 'ancrage' ? [L('méthode', 'longueur équivalente', m.methode === 'simplifiee' ? 'simplifiée, §8.4.4(2)' : 'générale, expression (8.4)')] : [])],
          note: null,
        }),
        { type: 'liste', items: HYPOTHESES_NOTE },
      ],
      charges: [bloc({ titre: 'Sollicitation de la barre', lignes: [L('sollicitation', 'barre', m.sollicitation), ligneContrainte(m)], note: null })],
      calculs,
    },
    verifications: verificationsDeLaNote(m, principal, mandrin, cadre),
    avertissements,
  };
}
