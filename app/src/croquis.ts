/**
 * Croquis cotes de la barre ancree ou du recouvrement.
 *
 * Module PUR : il rend une chaine SVG. La longueur est a l'echelle ;
 * l'epaisseur de la barre et l'enrobage sont exageres pour rester lisibles,
 * ce que la legende dit.
 */

import { echapper, nombreFr } from 'aedificium-ui';
import type { FormeExtremite, ResultatAncrage, ResultatRecouvrement } from '../../src/index';

const L = 640;
const H = 210;
const X0 = 90;
const UTILE = 470;

function cote(x0: number, x1: number, y: number, texte: string): string {
  return `<g class="cote"><line x1="${x0.toFixed(1)}" y1="${y}" x2="${x1.toFixed(1)}" y2="${y}"/><line x1="${x0.toFixed(1)}" y1="${y - 6}" x2="${x0.toFixed(1)}" y2="${y + 6}"/><line x1="${x1.toFixed(1)}" y1="${y - 6}" x2="${x1.toFixed(1)}" y2="${y + 6}"/><text x="${((x0 + x1) / 2).toFixed(1)}" y="${y - 6}">${echapper(texte)}</text></g>`;
}

function extremite(forme: FormeExtremite, x: number, y: number): string {
  if (forme === 'coude-ou-crochet') {
    return `<path class="barre" d="M ${x.toFixed(1)} ${y} q 18 0 18 18 l 0 26"/>`;
  }
  if (forme === 'boucle') {
    return `<path class="barre" d="M ${x.toFixed(1)} ${y} a 16 16 0 1 1 0 32 l -40 0"/>`;
  }
  return '';
}

/** Croquis d'un ancrage : origine a gauche, longueur l_bd dans le beton. */
export function croquisAncrage(r: ResultatAncrage, forme: FormeExtremite, confinement: boolean): string {
  const ech = UTILE / r.l_bd;
  const x1 = X0 + r.l_bd * ech;
  const yB = 90;
  const transversales = confinement
    ? Array.from({ length: 5 }, (_, i) => X0 + ((i + 0.5) * (x1 - X0)) / 5)
        .map((x) => `<circle class="transversale" cx="${x.toFixed(1)}" cy="${yB + 12}" r="4"/>`)
        .join('')
    : '';
  const lmin = X0 + r.l_b_min * ech;
  return `<svg class="croquis" viewBox="0 0 ${L} ${H}" role="img" aria-label="Croquis de l ancrage">
<rect class="beton" x="${X0}" y="40" width="${(x1 - X0 + 60).toFixed(1)}" height="100"/>
<line class="origine" x1="${X0}" y1="28" x2="${X0}" y2="152"/>
<text class="petit" x="${X0 - 60}" y="22">origine de l ancrage</text>
<line class="barre" x1="${X0 - 60}" y1="${yB}" x2="${x1.toFixed(1)}" y2="${yB}"/>
${extremite(forme, x1, yB)}${transversales}
<line class="lmin" x1="${lmin.toFixed(1)}" y1="${yB - 18}" x2="${lmin.toFixed(1)}" y2="${yB + 18}"/>
<text class="petit" x="${lmin.toFixed(1)}" y="${yB - 22}" text-anchor="middle">l_b,min</text>
${cote(X0, x1, 175, `l_bd = ${nombreFr(r.l_bd, 0)} mm`)}
<text class="petit" x="${X0 + 4}" y="54">c_d = ${nombreFr(r.c_d, 0)} mm · phi${r.phi_calcul === Math.round(r.phi_calcul) ? '' : '_n'} = ${nombreFr(r.phi_calcul, 1)} mm · ${echapper(r.sollicitation)} · adherence ${echapper(r.conditionsAdherence)}</text>
<text class="legende" x="12" y="${H - 6}">Longueur a l echelle ; diametre et enrobage non a l echelle.</text>
</svg>`;
}

/** Croquis d'un recouvrement : deux barres chevauchant sur l_0, tiers extremes marques si une couture est requise. */
export function croquisRecouvrement(r: ResultatRecouvrement): string {
  const ech = UTILE / r.l_0;
  const xa = X0;
  const xb = X0 + r.l_0 * ech;
  const tiers = (xb - xa) / 3;
  const couture = r.armatureDeCouture.requise
    ? [0, 1, 2, 3]
        .map((i) => {
          const x = i < 2 ? xa + ((i + 0.5) * tiers) / 2 : xb - tiers + ((i - 2 + 0.5) * tiers) / 2;
          return `<line class="couture" x1="${x.toFixed(1)}" y1="62" x2="${x.toFixed(1)}" y2="118"/>`;
        })
        .join('') +
      `<rect class="tiers" x="${xa}" y="58" width="${tiers.toFixed(1)}" height="64"/><rect class="tiers" x="${(xb - tiers).toFixed(1)}" y="58" width="${tiers.toFixed(1)}" height="64"/>`
    : '';
  return `<svg class="croquis" viewBox="0 0 ${L} ${H}" role="img" aria-label="Croquis du recouvrement">
<rect class="beton" x="20" y="40" width="${L - 40}" height="100"/>
${couture}
<line class="barre" x1="30" y1="82" x2="${xb.toFixed(1)}" y2="82"/>
<line class="barre" x1="${xa}" y1="98" x2="${L - 30}" y2="98"/>
${cote(xa, xb, 175, `l_0 = ${nombreFr(r.l_0, 0)} mm`)}
<text class="petit" x="24" y="54">rho_1 = ${nombreFr(r.rho1, 0)} % · alpha_6 = ${nombreFr(r.alpha_6, 3)}${r.armatureDeCouture.requise ? ` · couture Sigma A_st = ${nombreFr(r.armatureDeCouture.A_st, 0)} mm2, moitie par tiers extreme` : ''}</text>
<text class="legende" x="12" y="${H - 6}">Longueur a l echelle ; diametre et ecartement non a l echelle.</text>
</svg>`;
}
