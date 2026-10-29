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
import { phrase, textes } from './textes';

/** Hypotheses et limites rappelees dans la note de calcul. */
export const HYPOTHESES_NOTE: string[] = textes().note.hypotheses;

const aff = (v: number, d = 3): string => nombreAffiche(v, Math.min(d, 3));
const L = (symbole: string, libelle: string, valeur: string): LigneResultat => ({ symbole, libelle, valeur });
const bloc = (b: BlocResultat): ElementNote => ({ type: 'bloc', bloc: b });

type Principal = { type: 'ancrage'; r: ResultatAncrage } | { type: 'recouvrement'; r: ResultatRecouvrement };

/** Nom de l'element quand il n'est pas renseigne. */
export function nomDeLElement(m: ModeleSaisie): string {
  return textes().note.element(m.mode, aff(m.phi, 0));
}

function ligneContrainte(m: ModeleSaisie): LigneResultat {
  const x = textes().note;
  if (m.sigMode === 'saisie') return L('sigma_sd', x.sigmaSaisie, `${aff(m.sigma, 1)} MPa`);
  if (m.sigMode === 'reduite') return L('sigma_sd', x.sigmaReduite, `A_s,req ${aff(m.asReq, 0)} mm2 ; A_s,prov ${aff(m.asProv, 0)} mm2`);
  return L('sigma_sd', x.sigmaOrigine, 'f_yd');
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
  const x = textes().note;
  const v: VerificationNote[] = [];
  if (principal !== null && m.disponible !== null) {
    const requise = principal.type === 'ancrage' ? principal.r.l_bd : principal.r.l_0;
    v.push({
      nom: principal.type === 'ancrage' ? x.longueurAncrage : x.longueurRecouvrement,
      clause: principal.type === 'ancrage' ? x.clauseAncrage : x.clauseRecouvrement,
      taux: requise / m.disponible,
      ok: principal.r.verdict === 'conforme',
    });
  }
  if (mandrin !== null && mandrin.conforme !== null) v.push({ nom: x.diametreMandrin, clause: x.clauseMandrin, taux: null, ok: mandrin.conforme });
  if (cadre !== null && cadre.conforme !== null) v.push({ nom: x.ancrageCadres, clause: x.clauseCadres, taux: null, ok: cadre.conforme });
  return v;
}

/** Note du calcul de la saisie `m`. */
export function noteDuCalcul(profil: ProfilEc2, m: ModeleSaisie, cartouche: { projet: string; element: string; date: string }): NoteDeCalcul {
  const t = textes();
  const x = t.note;
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
      avertissements.push(...r.avertissements.map(phrase));
      calculs.push(bloc({ titre: t.blocs.ancrage, lignes: lignesAncrage(r), note: phrase(r.motif) }));
    } else {
      const r = verifierRecouvrement(donneesRecouvrement(m), profil);
      principal = { type: 'recouvrement', r };
      croquis = croquisRecouvrement(r);
      avertissements.push(...[...r.ancrage.avertissements, ...(r.armatureDeCouture.requise ? [r.armatureDeCouture.repartition] : [])].map(phrase));
      calculs.push(
        bloc({ titre: t.blocs.adherence, lignes: lignesAncrage(r.ancrage).slice(0, 7), note: null }),
        bloc({ titre: t.blocs.recouvrement, lignes: lignesRecouvrement(r), note: phrase(r.motif) })
      );
    }
  } catch (e) {
    calculs.push(bloc({ titre: m.mode === 'ancrage' ? t.blocs.ancrageSeul : t.blocs.recouvrementSeul, lignes: [], note: messageDErreur(e) }));
  }

  let mandrin: VerificationMandrin | null = null;
  let cadre: VerificationCadre | null = null;
  try {
    mandrin = verifierMandrin(m.phi, profil, m.phiM, null);
    cadre = verifierCadre(m.phiCadre, m.typeCadre, profil, m.retour);
    calculs.push(bloc({ titre: t.blocs.mandrins, lignes: lignesMandrinEtCadre(mandrin, cadre), note: null }));
  } catch (e) {
    mandrin = null;
    cadre = null;
    calculs.push(bloc({ titre: t.blocs.mandrins, lignes: [], note: messageDErreur(e) }));
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
          titre: x.barres,
          lignes: [
            phi,
            forme,
            enrobages,
            L('l_disponible', x.disponible, m.disponible === null ? x.nonSaisie : `${aff(m.disponible, 0)} mm`),
            ...(m.mode === 'recouvrement' ? [L('rho_1', x.rho1, `${aff(m.rho1, 0)} %`)] : []),
          ],
          note: null,
        }),
        ...(croquis === '' ? [] : [{ type: 'figure' as const, svg: croquis, legende: m.mode === 'ancrage' ? t.croquis.ancrage : t.croquis.recouvrement }]),
      ],
      materiaux: [bloc({ titre: x.materiaux, lignes: [materiaux], note: null })],
      hypotheses: [
        { type: 'texte', texte: x.profil(phrase(profil.nom), profil.date) },
        bloc({
          titre: x.objet,
          lignes: [calcul, ...(m.mode === 'ancrage' ? [L(x.methode, x.longueurEquivalente, m.methode === 'simplifiee' ? x.simplifiee : x.generale)] : [])],
          note: null,
        }),
        { type: 'liste', items: x.hypotheses },
      ],
      charges: [bloc({ titre: x.sollicitationBarre, lignes: [L(x.sollicitation, x.barre, t.sollicitations[m.sollicitation]), ligneContrainte(m)], note: null })],
      calculs,
    },
    verifications: verificationsDeLaNote(m, principal, mandrin, cadre),
    avertissements,
  };
}
