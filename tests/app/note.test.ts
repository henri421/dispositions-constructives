/**
 * Tests d'acceptation du lot 8.7 : la note de calcul passe sur la note
 * commune d'aedificium-ui (cartouche, sections dans l'ordre fixe, croquis
 * dans la geometrie, conclusions sans verdict global).
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { noteDeCalculHtml, texteVisible, type ElementNote } from 'aedificium-ui';
import { ec2Recommande, verifierAncrage, verifierCadre, verifierMandrin, verifierRecouvrement } from '../../src/index';
import { donneesAncrage, donneesRecouvrement, modeleParDefaut, type ModeleSaisie } from '../../app/src/form';
import { croquisAncrage, croquisRecouvrement } from '../../app/src/croquis';
import { lignesAncrage, lignesMandrinEtCadre, lignesRecouvrement } from '../../app/src/vue';
import { HYPOTHESES_NOTE, noteDuCalcul } from '../../app/src/note';
import { STYLES_TRACE } from '../../app/src/export';

const P = ec2Recommande();
const lire = (chemin: string): string => readFileSync(fileURLToPath(new URL(chemin, import.meta.url)), 'utf8');
const CARTOUCHE = { projet: 'Parking', element: 'Poutre P3, appui', date: '2026-10-27' };

const DEF = modeleParDefaut();
const REC: ModeleSaisie = { ...DEF, mode: 'recouvrement' };
const MANDRIN: ModeleSaisie = { ...DEF, phiM: 64, retour: 80 };
const ERREUR: ModeleSaisie = { ...DEF, sigMode: 'saisie', sigma: 500 };

const note = (m: ModeleSaisie, c = CARTOUCHE) => noteDuCalcul(P, m, c);
const html = (m: ModeleSaisie) => noteDeCalculHtml(note(m), STYLES_TRACE);
const titresH2 = (h: string) => [...h.matchAll(/<h2>([^<]*)<\/h2>/g)].map((x) => x[1]);
const blocs = (els: ElementNote[] | undefined) => (els ?? []).flatMap((e) => (e.type === 'bloc' ? [e.bloc] : []));
const symboles = (els: ElementNote[] | undefined) => blocs(els).flatMap((b) => b.lignes.map((l) => l.symbole));
const figures = (els: ElementNote[] | undefined) => (els ?? []).flatMap((e) => (e.type === 'figure' ? [e] : []));

describe('cartouche', () => {
  it('projet, element, date, norme et outil', () => {
    expect(note(DEF).cartouche).toEqual({ ...CARTOUCHE, norme: 'EN 1992-1-1:2004', outil: 'dispositions-constructives' });
  });

  it('element vide : objet et diametre', () => {
    expect(note(DEF, { ...CARTOUCHE, element: '' }).cartouche.element).toBe('Ancrage HA16');
    expect(note(REC, { ...CARTOUCHE, element: ' ' }).cartouche.element).toBe('Recouvrement HA16');
  });

  it('le texte du cartouche est echappe', () => {
    const h = noteDeCalculHtml(note(DEF, { ...CARTOUCHE, projet: 'Parking <x>' }), STYLES_TRACE);
    expect(h).toContain('Parking &lt;x&gt;');
    expect(h).not.toContain('Parking <x>');
  });
});

describe('sections', () => {
  it('sans longueur disponible ni mandrin saisi : pas de conclusions', () => {
    expect(note(DEF).verifications).toEqual([]);
    expect(titresH2(html(DEF))).toEqual(['1. Géométrie', '2. Matériaux', '3. Hypothèses', '4. Cas de charges', '5. Calculs et vérifications']);
  });

  it('avec une longueur disponible : conclusions en dernier', () => {
    expect(titresH2(html({ ...DEF, disponible: 900 })).slice(-1)[0]).toBe('6. Conclusions');
  });

  it('geometrie : barres, enrobages, longueur disponible, puis le croquis', () => {
    const g = note(DEF).sections.geometrie;
    expect(symboles(g)).toEqual(['phi', 'forme', 'a, c_1, c', 'l_disponible']);
    const f = figures(g);
    expect(f).toHaveLength(1);
    expect(f[0].svg).toBe(croquisAncrage(verifierAncrage(donneesAncrage(DEF), P), DEF.forme, DEF.confinement));
  });

  it('recouvrement : rho_1 et le croquis du recouvrement', () => {
    const g = note(REC).sections.geometrie;
    expect(symboles(g)).toContain('rho_1');
    expect(figures(g)[0].svg).toBe(croquisRecouvrement(verifierRecouvrement(donneesRecouvrement(REC), P)));
  });

  it('materiaux, hypotheses, cas de charges', () => {
    const n = note(DEF);
    expect(symboles(n.sections.materiaux)).toEqual(['béton / acier']);
    expect(symboles(n.sections.hypotheses)).toEqual(['calcul', 'méthode']);
    expect((n.sections.hypotheses ?? []).some((e) => e.type === 'texte' && e.texte.includes(P.nom))).toBe(true);
    expect((n.sections.hypotheses ?? []).flatMap((e) => (e.type === 'liste' ? [e.items] : []))).toEqual([HYPOTHESES_NOTE]);
    expect(symboles(n.sections.charges)).toEqual(['sollicitation', 'sigma_sd']);
  });

  it('recouvrement : pas de ligne de methode', () => {
    expect(symboles(note(REC).sections.hypotheses)).toEqual(['calcul']);
  });
});

describe('calculs', () => {
  it('ancrage : bloc de l ecran avec son motif, mandrins, synthese ; pas de bloc Verdict', () => {
    const b = blocs(note(DEF).sections.calculs);
    const r = verifierAncrage(donneesAncrage(DEF), P);
    expect(b.map((x) => x.titre)).toEqual(['Ancrage (§8.4)', 'Mandrins et cadres (§8.3, §8.5)', 'Synthèse par diamètre (mêmes conditions)']);
    expect(b[0].lignes).toEqual(lignesAncrage(r));
    expect(b[0].note).toBe(r.motif);
    expect(b[1].lignes).toEqual(lignesMandrinEtCadre(verifierMandrin(16, P, null, null), verifierCadre(8, 'crochet', P, null)));
  });

  it('recouvrement : adherence puis recouvrement', () => {
    const b = blocs(note(REC).sections.calculs);
    const r = verifierRecouvrement(donneesRecouvrement(REC), P);
    expect(b.slice(0, 2).map((x) => x.titre)).toEqual(['Adhérence et longueur de référence (§8.4)', 'Recouvrement (§8.7)']);
    expect(b[0].lignes).toEqual(lignesAncrage(r.ancrage).slice(0, 7));
    expect(b[1].lignes).toEqual(lignesRecouvrement(r));
  });

  it('calcul impossible : le motif a la place du bloc, pas de croquis', () => {
    const n = note(ERREUR);
    const b = blocs(n.sections.calculs);
    expect(b[0].titre).toBe('Ancrage');
    expect(b[0].lignes).toEqual([]);
    expect(b[0].note).not.toBeNull();
    expect(figures(n.sections.geometrie)).toHaveLength(0);
  });

  it('avertissements du noyau repris', () => {
    const r = verifierAncrage(donneesAncrage(DEF), P);
    expect(note(DEF).avertissements).toEqual(r.avertissements);
  });
});

describe('conclusions', () => {
  for (const disponible of [400, 900]) {
    it(`longueur disponible ${disponible} mm : taux l_bd / disponible`, () => {
      const r = verifierAncrage(donneesAncrage({ ...DEF, disponible }), P);
      const v = note({ ...DEF, disponible }).verifications;
      expect(v).toHaveLength(1);
      expect(v[0].nom).toBe("Longueur d'ancrage");
      expect(v[0].clause).toBe('§8.4.4');
      expect(v[0].taux).toBeCloseTo(r.l_bd / disponible, 10);
      expect(v[0].ok).toBe(r.verdict === 'conforme');
    });
  }

  it('recouvrement : taux l_0 / disponible', () => {
    const m: ModeleSaisie = { ...REC, disponible: 1000 };
    const r = verifierRecouvrement(donneesRecouvrement(m), P);
    const v = note(m).verifications[0];
    expect(v.nom).toBe('Longueur de recouvrement');
    expect(v.taux).toBeCloseTo(r.l_0 / 1000, 10);
  });

  it('mandrin et cadre saisis : juges sans ratio', () => {
    const v = note(MANDRIN).verifications;
    expect(v.map((x) => [x.nom, x.taux])).toEqual([
      ['Diamètre du mandrin', null],
      ['Ancrage des cadres', null],
    ]);
    expect(v[0].ok).toBe(verifierMandrin(16, P, 64, null).conforme);
    expect(v[1].ok).toBe(verifierCadre(8, 'crochet', P, 80).conforme);
  });

  it('aucun verdict global', () => {
    const t = texteVisible(html({ ...MANDRIN, disponible: 900 }));
    expect(t).not.toContain('Conforme');
    expect(t).not.toContain('Longueur requise (constat)');
    expect(t).toContain('Vérification déterminante');
  });
});

describe('cablage', () => {
  const main = lire('../../app/src/main.ts');
  const page = lire('../../app/index.html');
  const sorties = page.slice(page.indexOf('id="sorties"'), page.indexOf('</section>', page.indexOf('id="sorties"')));

  it('la note passe par noteDuCalcul et la note commune', () => {
    expect(main).toContain('noteDuCalcul(');
    expect(main).toMatch(/import \{[^}]*\bnoteDeCalculHtml\b[^}]*\} from 'aedificium-ui'/);
    expect(main).not.toMatch(/import \{[^}]*\bnoteDeCalculHtml\b[^}]*\} from '\.\/export'/);
  });

  it('champs projet et element dans les sorties, memorises', () => {
    expect(sorties).toContain('data-role="projet"');
    expect(sorties).toContain('data-role="element"');
    expect(main).toContain("'dispositions-constructives:cartouche'");
  });

  it('l ancienne note locale a disparu', () => {
    const exp = lire('../../app/src/export.ts');
    expect(exp).not.toContain('function noteDeCalculHtml');
    expect(exp).not.toContain('HYPOTHESES_NOTE');
    expect(exp).toContain('export const STYLES_TRACE');
    expect(exp).toContain('export function blocsEnTexte');
  });
});
