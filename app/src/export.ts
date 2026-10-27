/**
 * Les sorties : SVG autonome et CSV.
 *
 * Tout ici est PUR — aucun `document`. Le telechargement et la note de calcul
 * vivent dans `aedificium-ui` (`telecharger`, `ouvrirOuTelecharger`,
 * `noteDeCalculHtml`) ; le contenu de la note est bati par `note.ts`.
 */

import { JETONS, notationTexte, type BlocResultat } from 'aedificium-ui';

/** Copie des blocs ou tout le texte affiche passe en notation texte (CSV). */
export function blocsEnTexte(blocs: readonly BlocResultat[]): BlocResultat[] {
  return blocs.map((b) => ({
    titre: notationTexte(b.titre),
    lignes: b.lignes.map((l) => ({
      symbole: notationTexte(l.symbole),
      libelle: notationTexte(l.libelle),
      valeur: notationTexte(l.valeur),
    })),
    note: b.note === null ? null : notationTexte(b.note),
  }));
}

/**
 * Styles du trace, jetons compris : un document exporte ne voit pas la
 * feuille de la page, et les jetons seuls DEFINISSENT des couleurs sans en
 * appliquer aucune — le dessin sortirait en aplat noir. Les regles de
 * peinture de `style.css` sont donc recopiees ici ; toute evolution de l'une
 * doit etre reportee dans l'autre.
 */
export const STYLES_TRACE = `${JETONS}

svg { background: var(--surface); color-scheme: light; font-family: var(--sans); }
svg .beton { fill: var(--beton); stroke: none; }
svg .barre { fill: none; stroke: var(--traction); stroke-width: 5; stroke-linecap: round; }
svg .transversale { fill: var(--surface); stroke: var(--texte); stroke-width: 2; }
svg .origine { stroke: var(--texte); stroke-width: 1.5; stroke-dasharray: 6 4; }
svg .lmin { stroke: var(--neutre); stroke-width: 1.5; }
svg .couture { stroke: var(--texte); stroke-width: 2.5; }
svg .tiers { fill: var(--accent); fill-opacity: 0.08; stroke: var(--accent); stroke-dasharray: 4 3; }
svg .cote line { stroke: var(--texte); stroke-width: 1; }
svg .cote text { fill: var(--texte); font-size: 13px; text-anchor: middle; font-family: var(--mono); }
svg .petit { fill: var(--texte-doux); font-size: 11px; }
svg .legende { fill: var(--texte-faible); font-size: 10px; }`;
