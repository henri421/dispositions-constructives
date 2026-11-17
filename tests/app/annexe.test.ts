/**
 * Tests d'acceptation du lot E (audit R4), sur le modele de colonne-ec2 :
 * profil luxembourgeois prerempli, coefficients modifiables par l'utilisateur,
 * note qui montre l'annexe retenue, page qui porte le selecteur et les champs.
 * NE PAS MODIFIER (executant).
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { noteDeCalculHtml, texteVisible } from 'aedificium-ui';
import { ec2Recommande } from '../../src/index';
import { COEFS, coefsDeLAnnexe, ec2Lu, profilDeCalcul, profilDeLAnnexe } from '../../app/src/annexe';
import { champsDepuisModele, modeleDepuisChamps, modeleParDefaut } from '../../app/src/form';
import { noteDuCalcul } from '../../app/src/note';

const lire = (chemin: string): string => readFileSync(fileURLToPath(new URL(chemin, import.meta.url)), 'utf8');

describe('profil luxembourgeois (contenu, fourni)', () => {
  it('alpha_cc = 0,85 avec sa source AN-LU, les autres a la valeur recommandee', () => {
    const lu = ec2Lu();
    const rec = ec2Recommande();
    expect(lu.alpha_cc.valeur).toBe(0.85);
    expect(lu.alpha_cc.source).toMatch(/^ILNAS-EN 1992-1-1\/AN-LU:2020, 3\.1\.6\(1\)P : valeur présumée/);
    for (const k of COEFS.filter((c) => c !== 'alpha_cc')) {
      expect(lu[k].valeur).toBe(rec[k].valeur);
      expect(lu[k].source).toMatch(/AN-LU:2020.*recommandée présumée retenue/);
    }
    expect(profilDeLAnnexe('recommande')).toEqual(rec);
    const p = profilDeCalcul('lu', { ...coefsDeLAnnexe('lu'), gamma_C: 1.4 });
    expect(p.gamma_C.source).toMatch(/imposée/);
    expect(p.alpha_cc).toEqual(lu.alpha_cc);
  });
});

describe('saisie (T1)', () => {
  it('par defaut : annexe recommandee et coefficients recommandes', () => {
    const m = modeleParDefaut();
    expect(m.annexe).toBe('recommande');
    expect(m.coefs).toEqual(coefsDeLAnnexe('recommande'));
  });

  it('annexe et coefficients ecrits dans les champs puis relus', () => {
    const m = modeleParDefaut();
    const champs = champsDepuisModele({ ...m, annexe: 'lu', coefs: { ...m.coefs, alpha_cc: 0.85 } });
    expect(champs['annexe']).toBe('lu');
    expect(champs['coef_alpha_cc']).toBe('0,85');
    for (const k of COEFS) expect(champs[`coef_${k}`]).toBeDefined();
    const lu = modeleDepuisChamps(champs);
    expect(lu.ok).toBe(true);
    if (lu.ok) {
      expect(lu.modele.annexe).toBe('lu');
      expect(lu.modele.coefs.alpha_cc).toBe(0.85);
    }
  });

  it('feuille ancienne sans annexe : valeurs recommandees', () => {
    const champs = champsDepuisModele(modeleParDefaut());
    delete champs['annexe'];
    const lu = modeleDepuisChamps(champs);
    expect(lu.ok && lu.modele.annexe).toBe('recommande');
  });
});

describe('note (T2)', () => {
  it('annexe retenue, coefficients et sources, avertissement en tete', () => {
    const m = { ...modeleParDefaut(), annexe: 'lu' as const, coefs: coefsDeLAnnexe('lu') };
    const note = noteDuCalcul(profilDeCalcul('lu', m.coefs), m, { projet: 'P', element: 'E', date: '2026-11-17' });
    expect(note.avertissements?.[0]).toMatch(/^Annexe nationale luxembourgeoise/);
    const texte = texteVisible(noteDeCalculHtml(note, ''));
    expect(texte).toContain('Luxembourg (AN-LU:2020');
    expect(texte).toContain('αcc');
    expect(texte).toContain('ILNAS-EN 1992-1-1/AN-LU:2020, 3.1.6(1)P');
    expect(texte).not.toContain('aucune annexe nationale codée');
  });

  it('valeurs recommandees : pas d avertissement d annexe', () => {
    const m = modeleParDefaut();
    const note = noteDuCalcul(profilDeCalcul('recommande', m.coefs), m, { projet: 'P', element: 'E', date: '2026-11-17' });
    expect((note.avertissements ?? []).some((a) => /luxembourgeoise/.test(a))).toBe(false);
  });
});

describe('pages (T3)', () => {
  for (const page of ['../../app/index.html', '../../app/en/index.html']) {
    it(`${page} : selecteur d annexe et un champ par coefficient`, () => {
      const html = lire(page);
      expect(html).toMatch(/<select data-champ="annexe">/);
      for (const k of COEFS) expect(html).toContain(`data-champ="coef_${k}"`);
    });
  }

  it('main.ts : profil de calcul lu dans la saisie, options et remplissage au changement d annexe', () => {
    const main = lire('../../app/src/main.ts');
    expect(main).not.toMatch(/const PROFIL = ec2Recommande\(\)/);
    expect(main).toContain('profilDeCalcul(');
    expect(main).toContain('optionsAnnexe(');
    expect(main).toContain('coefsDeLAnnexe(');
    expect(main).toContain('avertissementAnnexeLu(');
  });
});
