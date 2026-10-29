/**
 * Mise en forme des resultats : HTML de la page et blocs des sorties.
 * Module PUR. Unites : mm, mm2, MPa.
 */

import { notationHtml, nombreAffiche, type BlocResultat, type LigneResultat } from 'aedificium-ui';
import type {
  LigneSynthese,
  NomAlpha,
  OrigineCoefficient,
  ResultatAncrage,
  ResultatRecouvrement,
  VerificationCadre,
  VerificationMandrin,
} from '../../src/index';
import type { ModeleSaisie } from './form';
import { phrase, textes } from './textes';

export function messageDErreur(e: unknown): string {
  return phrase(e instanceof Error ? e.message : String(e));
}

const NOMS: NomAlpha[] = ['alpha_1', 'alpha_2', 'alpha_3', 'alpha_4', 'alpha_5'];

/** Nombre affiche : trois decimales au plus, sans zeros inutiles. */
const aff = (v: number, d: number): string => nombreAffiche(v, Math.min(d, 3));

/** Texte d'un coefficient : jamais un 1,0 muet pour un coefficient sans objet. */
export function texteCoefficient(o: OrigineCoefficient): { valeur: string; statut: string; detail: string } {
  const s = textes().statuts;
  if (o.statut === 'non-applicable') return { valeur: '—', statut: s.nonApplicable, detail: phrase(o.motif) };
  if (o.statut === 'fixe-par-la-norme') return { valeur: aff(o.valeur, 3), statut: s.fixe, detail: phrase(o.motif) };
  return { valeur: aff(o.valeur, 3), statut: s.calcule, detail: phrase(o.detail) };
}

const L = (symbole: string, libelle: string, valeur: string): LigneResultat => ({ symbole, libelle, valeur });

/** Lignes de l'ancrage, valeurs intermediaires comprises. */
export function lignesAncrage(r: ResultatAncrage): LigneResultat[] {
  const t = textes();
  const x = t.ancrage;
  return [
    L(x.adherence, phrase(r.motifAdherence), t.conditions[r.conditionsAdherence]),
    L('phi', r.phi_calcul === Math.round(r.phi_calcul) ? x.diametre : x.diametrePaquet, `${aff(r.phi_calcul, 1)} mm`),
    L('f_ctd', x.fctd(r.fckPlafonne), `${aff(r.fctd, 3)} MPa`),
    L('eta_1 x eta_2', x.eta, `${aff(r.eta_1, 2)} x ${aff(r.eta_2, 2)}`),
    L('f_bd', x.fbd, `${aff(r.f_bd, 3)} MPa`),
    L('sigma_sd', x.sigma(t.originesSigma[r.origineSigma]), `${aff(r.sigma_sd, 1)} MPa`),
    L('l_b,rqd', x.lbrqd, `${aff(r.l_b_rqd, 0)} mm`),
    L('c_d', x.cd, `${aff(r.c_d, 0)} mm`),
    ...(r.lambda === null ? [] : [L('K, lambda', x.confinement, `${aff(r.K ?? 0, 2)} ; ${aff(r.lambda, 3)}`)]),
    ...NOMS.map((n) => {
      const c = texteCoefficient(r.alphas[n]);
      return L(n, `${c.statut}${x.deuxPoints}${c.detail}`, c.valeur);
    }),
    L(
      'alpha_2 alpha_3 alpha_5',
      r.borneProduitActivee ? x.borneActivee : x.auDessus,
      `${aff(r.produit235, 3)}${r.borneProduitActivee ? ` → ${aff(0.7, 1)}` : ''}`
    ),
    L(r.methode === 'simplifiee' ? 'l_b,eq' : x.produit, r.methode === 'simplifiee' ? x.lbeq : x.expr84, `${aff(r.l_calcul, 0)} mm`),
    L('l_b,min', x.lbmin(t.bornes[r.origineLbMin]), `${aff(r.l_b_min, 0)} mm`),
    L('l_bd', x.lbd, `${aff(r.l_bd, 0)} mm`),
  ];
}

export function lignesRecouvrement(r: ResultatRecouvrement): LigneResultat[] {
  const t = textes();
  const x = t.recouvrement;
  const t3 = texteCoefficient(r.alpha_3);
  return [
    L('l_b,rqd', x.reference, `${aff(r.ancrage.l_b_rqd, 0)} mm`),
    L('alpha_1', texteCoefficient(r.ancrage.alphas.alpha_1).detail, texteCoefficient(r.ancrage.alphas.alpha_1).valeur),
    L('alpha_2', texteCoefficient(r.ancrage.alphas.alpha_2).detail, texteCoefficient(r.ancrage.alphas.alpha_2).valeur),
    L('alpha_3', `${t3.statut}${t.ancrage.deuxPoints}${t3.detail}`, t3.valeur),
    L('alpha_4', x.alpha4, '—'),
    L('alpha_5', texteCoefficient(r.ancrage.alphas.alpha_5).detail, texteCoefficient(r.ancrage.alphas.alpha_5).valeur),
    L('alpha_6', x.alpha6(aff(r.rho1, 0)), aff(r.alpha_6, 3)),
    L('alpha_2 alpha_3 alpha_5', r.borneProduitActivee ? x.borneActivee : t.ancrage.auDessus, aff(r.produit235, 3)),
    L(t.ancrage.produit, x.formule810, `${aff(r.l_calcul, 0)} mm`),
    L('l_0,min', x.l0min(t.bornes[r.origineL0Min]), `${aff(r.l_0_min, 0)} mm`),
    L('l_0', x.l0, `${aff(r.l_0, 0)} mm`),
    L('Sigma A_st', phrase(r.armatureDeCouture.motif), r.armatureDeCouture.requise ? `${aff(r.armatureDeCouture.A_st, 0)} mm2` : x.nonRequise),
  ];
}

export function lignesMandrinEtCadre(m: VerificationMandrin, c: VerificationCadre): LigneResultat[] {
  const x = textes().mandrin;
  const constat = (ok: boolean | null): string => (ok === null ? x.constat : ok ? x.conforme : x.nonConforme);
  return [
    L('phi_m,min', x.tableau, `${aff(m.phi_m_min_tableau, 0)} mm`),
    L(x.mandrin, phrase(m.motif), constat(m.conforme)),
    L(x.retourCadre, `${c.type === 'crochet' ? x.crochet : x.coude}${x.figure85}`, `${aff(c.retourMin, 0)} mm`),
    L(x.mandrinCadre, x.tableau81, `${aff(c.mandrinMin, 0)} mm`),
    L(x.cadre, phrase(c.motif), constat(c.conforme)),
  ];
}

export function tableHtml(lignes: readonly LigneResultat[]): string {
  return `<table class="grandeurs"><tbody>${lignes
    .map(
      (l) =>
        `<tr><th>${notationHtml(l.symbole)}</th><td class="libelle">${notationHtml(l.libelle)}</td><td class="valeur">${notationHtml(l.valeur)}</td></tr>`
    )
    .join('')}</tbody></table>`;
}

/** Avertissements du noyau, un bloc d'alerte par element. */
export function avertissementsHtml(liste: readonly string[]): string {
  return liste.map((a) => `<p class="alerte">${notationHtml(phrase(a))}</p>`).join('');
}

/** Bloc des donnees saisies, pour le CSV et la note. */
export function blocEntrees(m: ModeleSaisie): BlocResultat {
  const t = textes();
  const x = t.entrees;
  return {
    titre: x.titre,
    lignes: [
      { symbole: x.calcul, libelle: x.objet, valeur: `${t.modes[m.mode]}, ${t.sollicitations[m.sollicitation]}` },
      { symbole: 'phi', libelle: m.paquet ? x.paquet(aff(m.nb, 0)) : x.isolee, valeur: `${aff(m.phi, 3)} mm` },
      { symbole: x.materiaux, libelle: 'f_ck / f_yk', valeur: `${aff(m.fck, 3)} / ${aff(m.fyk, 3)} MPa` },
      { symbole: x.forme, libelle: x.extremite, valeur: t.formes[m.forme] },
      { symbole: 'a, c_1, c', libelle: x.enrobages, valeur: `${aff(m.a, 3)}, ${aff(m.c1, 3)}, ${aff(m.c, 3)} mm` },
    ],
    note: null,
  };
}

/**
 * Le bloc du verdict pour le CSV et la note : le meme titre que l'ecran
 * (`verdictHtml`), suivi du motif. Sans lui, la note rapportait le motif
 * mais taisait le constat lui-meme.
 */
export function blocVerdict(verdict: string, motif: string): BlocResultat {
  const t = textes();
  return { titre: t.verdict.titre, lignes: [{ symbole: t.verdict.constat, libelle: t.verdict.libelle, valeur: t.verdicts[verdict] ?? verdict }], note: phrase(motif) };
}

export function verdictHtml(verdict: string, motif: string): string {
  return `<p class="verdict verdict-${verdict}">${notationHtml(textes().verdicts[verdict] ?? verdict)}</p><p class="motif">${notationHtml(phrase(motif))}</p>`;
}

export function syntheseHtml(lignes: ReadonlyArray<LigneSynthese | { phi: number; erreur: string }>): string {
  return `<table class="zones"><thead><tr><th>${notationHtml('phi (mm)')}</th><th>${notationHtml('f_bd (MPa)')}</th><th>${notationHtml('l_b,rqd (mm)')}</th><th>${notationHtml('l_bd (mm)')}</th><th>${notationHtml('l_0 (mm)')}</th></tr></thead><tbody>${lignes
    .map((l) =>
      'erreur' in l
        ? `<tr><td>${l.phi}</td><td colspan="4" class="libelle">${notationHtml(phrase(l.erreur))}</td></tr>`
        : `<tr><td>${l.phi}</td><td class="valeur">${aff(l.f_bd, 2)}</td><td class="valeur">${aff(l.l_b_rqd, 0)}</td><td class="valeur">${aff(l.l_bd, 0)}</td><td class="valeur">${aff(l.l_0, 0)}</td></tr>`
    )
    .join('')}</tbody></table>`;
}

export function blocSynthese(lignes: ReadonlyArray<LigneSynthese | { phi: number; erreur: string }>): BlocResultat {
  const x = textes().synthese;
  return {
    titre: x.titre,
    lignes: lignes.map((l) =>
      'erreur' in l
        ? L(`HA${l.phi}`, phrase(l.erreur), x.horsDomaine)
        : L(`HA${l.phi}`, `f_bd ${aff(l.f_bd, 2)} MPa, l_b,rqd ${aff(l.l_b_rqd, 0)} mm, l_bd ${aff(l.l_bd, 0)} mm`, `l_0 ${aff(l.l_0, 0)} mm`)
    ),
    note: x.note,
  };
}
