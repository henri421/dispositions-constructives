/**
 * Mise en forme des resultats : HTML de la page et blocs des sorties.
 * Module PUR. Unites : mm, mm2, MPa.
 */

import { echapper, nombreFr, type BlocResultat, type LigneResultat } from 'aedificium-ui';
import type {
  LigneSynthese,
  NomAlpha,
  OrigineCoefficient,
  ResultatAncrage,
  ResultatRecouvrement,
  VerificationCadre,
  VerificationMandrin,
} from '../../src/index';

export function messageDErreur(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

const NOMS: NomAlpha[] = ['alpha_1', 'alpha_2', 'alpha_3', 'alpha_4', 'alpha_5'];

/** Texte d'un coefficient : jamais un 1,0 muet pour un coefficient sans objet. */
export function texteCoefficient(o: OrigineCoefficient): { valeur: string; statut: string; detail: string } {
  if (o.statut === 'non-applicable') return { valeur: '—', statut: 'non applicable', detail: o.motif };
  if (o.statut === 'fixe-par-la-norme') return { valeur: nombreFr(o.valeur, 3), statut: 'fixe par la norme', detail: o.motif };
  return { valeur: nombreFr(o.valeur, 3), statut: 'calcule', detail: o.detail };
}

const L = (symbole: string, libelle: string, valeur: string): LigneResultat => ({ symbole, libelle, valeur });

/** Lignes de l'ancrage, valeurs intermediaires comprises. */
export function lignesAncrage(r: ResultatAncrage): LigneResultat[] {
  return [
    L('adherence', r.motifAdherence, r.conditionsAdherence),
    L('phi', r.phi_calcul === Math.round(r.phi_calcul) ? 'diametre' : 'diametre equivalent du paquet phi_n', `${nombreFr(r.phi_calcul, 1)} mm`),
    L('f_ctd', `alpha_ct f_ctk,0.05 / gamma_C${r.fckPlafonne ? ', f_ck plafonne a 60 MPa' : ''}`, `${nombreFr(r.fctd, 3)} MPa`),
    L('eta_1 x eta_2', 'conditions d adherence x diametre', `${nombreFr(r.eta_1, 2)} x ${nombreFr(r.eta_2, 2)}`),
    L('f_bd', '2,25 eta_1 eta_2 f_ctd, expression (8.2)', `${nombreFr(r.f_bd, 3)} MPa`),
    L('sigma_sd', `contrainte a l origine (${r.origineSigma})`, `${nombreFr(r.sigma_sd, 1)} MPa`),
    L('l_b,rqd', '(phi / 4) (sigma_sd / f_bd), expression (8.3)', `${nombreFr(r.l_b_rqd, 0)} mm`),
    L('c_d', 'enrobage equivalent, figure 8.3', `${nombreFr(r.c_d, 0)} mm`),
    ...(r.lambda === null ? [] : [L('K, lambda', 'confinement, figure 8.4', `${nombreFr(r.K ?? 0, 2)} ; ${nombreFr(r.lambda, 3)}`)]),
    ...NOMS.map((n) => {
      const t = texteCoefficient(r.alphas[n]);
      return L(n, `${t.statut} : ${t.detail}`, t.valeur);
    }),
    L(
      'alpha_2 alpha_3 alpha_5',
      r.borneProduitActivee ? 'borne 0,7 ACTIVEE, expression (8.5)' : 'au-dessus de la borne 0,7',
      `${nombreFr(r.produit235, 3)}${r.borneProduitActivee ? ' -> 0,700' : ''}`
    ),
    L(r.methode === 'simplifiee' ? 'l_b,eq' : 'produit x l_b,rqd', r.methode === 'simplifiee' ? 'longueur equivalente, §8.4.4(2)' : 'expression (8.4)', `${nombreFr(r.l_calcul, 0)} mm`),
    L('l_b,min', `expression (8.6) ou (8.7), borne ${r.origineLbMin}`, `${nombreFr(r.l_b_min, 0)} mm`),
    L('l_bd', 'longueur d ancrage de calcul', `${nombreFr(r.l_bd, 0)} mm`),
  ];
}

export function lignesRecouvrement(r: ResultatRecouvrement): LigneResultat[] {
  const t3 = texteCoefficient(r.alpha_3);
  return [
    L('l_b,rqd', 'longueur de reference', `${nombreFr(r.ancrage.l_b_rqd, 0)} mm`),
    L('alpha_1', texteCoefficient(r.ancrage.alphas.alpha_1).detail, texteCoefficient(r.ancrage.alphas.alpha_1).valeur),
    L('alpha_2', texteCoefficient(r.ancrage.alphas.alpha_2).detail, texteCoefficient(r.ancrage.alphas.alpha_2).valeur),
    L('alpha_3', `${t3.statut} : ${t3.detail}`, t3.valeur),
    L('alpha_4', 'n intervient pas dans l_0 (expression 8.10)', '—'),
    L('alpha_5', texteCoefficient(r.ancrage.alphas.alpha_5).detail, texteCoefficient(r.ancrage.alphas.alpha_5).valeur),
    L('alpha_6', `(rho_1 / 25)^0,5, rho_1 = ${nombreFr(r.rho1, 0)} %`, nombreFr(r.alpha_6, 3)),
    L('alpha_2 alpha_3 alpha_5', r.borneProduitActivee ? 'borne 0,7 ACTIVEE' : 'au-dessus de la borne 0,7', nombreFr(r.produit235, 3)),
    L('produit x l_b,rqd', 'expression (8.10)', `${nombreFr(r.l_calcul, 0)} mm`),
    L('l_0,min', `expression (8.11), borne ${r.origineL0Min}`, `${nombreFr(r.l_0_min, 0)} mm`),
    L('l_0', 'longueur de recouvrement', `${nombreFr(r.l_0, 0)} mm`),
    L('Sigma A_st', r.armatureDeCouture.motif, r.armatureDeCouture.requise ? `${nombreFr(r.armatureDeCouture.A_st, 0)} mm2` : 'non requise'),
  ];
}

export function lignesMandrinEtCadre(m: VerificationMandrin, c: VerificationCadre): LigneResultat[] {
  return [
    L('phi_m,min', 'mandrin de la barre, tableau 8.1N', `${nombreFr(m.phi_m_min_tableau, 0)} mm`),
    L('mandrin', m.motif, m.conforme === null ? 'constat' : m.conforme ? 'conforme' : 'non conforme'),
    L('retour cadre', `${c.type === 'crochet' ? 'crochet >= 135 degres' : 'coude 90 a 135 degres'}, figure 8.5`, `${nombreFr(c.retourMin, 0)} mm`),
    L('mandrin cadre', 'tableau 8.1N', `${nombreFr(c.mandrinMin, 0)} mm`),
    L('cadre', c.motif, c.conforme === null ? 'constat' : c.conforme ? 'conforme' : 'non conforme'),
  ];
}

export function tableHtml(lignes: readonly LigneResultat[]): string {
  return `<table class="grandeurs"><tbody>${lignes
    .map(
      (l) =>
        `<tr><th>${echapper(l.symbole)}</th><td class="libelle">${echapper(l.libelle)}</td><td class="valeur">${echapper(l.valeur)}</td></tr>`
    )
    .join('')}</tbody></table>`;
}

const TITRES: Record<string, string> = {
  conforme: 'Conforme',
  'non-conforme': 'Non conforme',
  'longueur-requise': 'Longueur requise (constat)',
};

export function verdictHtml(verdict: string, motif: string): string {
  return `<p class="verdict verdict-${echapper(verdict)}">${echapper(TITRES[verdict] ?? verdict)}</p><p class="motif">${echapper(motif)}</p>`;
}

export function syntheseHtml(lignes: ReadonlyArray<LigneSynthese | { phi: number; erreur: string }>): string {
  return `<table class="zones"><thead><tr><th>phi (mm)</th><th>f_bd (MPa)</th><th>l_b,rqd (mm)</th><th>l_bd (mm)</th><th>l_0 (mm)</th></tr></thead><tbody>${lignes
    .map((l) =>
      'erreur' in l
        ? `<tr><td>${l.phi}</td><td colspan="4" class="libelle">${echapper(l.erreur)}</td></tr>`
        : `<tr><td>${l.phi}</td><td class="valeur">${nombreFr(l.f_bd, 2)}</td><td class="valeur">${nombreFr(l.l_b_rqd, 0)}</td><td class="valeur">${nombreFr(l.l_bd, 0)}</td><td class="valeur">${nombreFr(l.l_0, 0)}</td></tr>`
    )
    .join('')}</tbody></table>`;
}

export function blocSynthese(lignes: ReadonlyArray<LigneSynthese | { phi: number; erreur: string }>): BlocResultat {
  return {
    titre: 'Synthese par diametre (memes conditions)',
    lignes: lignes.map((l) =>
      'erreur' in l
        ? L(`HA${l.phi}`, l.erreur, 'hors domaine')
        : L(`HA${l.phi}`, `f_bd ${nombreFr(l.f_bd, 2)} MPa, l_b,rqd ${nombreFr(l.l_b_rqd, 0)} mm, l_bd ${nombreFr(l.l_bd, 0)} mm`, `l_0 ${nombreFr(l.l_0, 0)} mm`)
    ),
    note: 'Longueurs calculees par les formules, aux conditions saisies ; l_0 pour le rho_1 saisi.',
  };
}
