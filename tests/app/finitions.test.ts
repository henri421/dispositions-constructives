/**
 * Tests d'acceptation de l'etape 8.2 (finitions) : notations, arrondis,
 * accents, titre, avertissements. Ils portent sur le texte VISIBLE (ecran,
 * croquis, note, CSV, page), pas sur le code.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { noteDeCalculHtml, resultatsEnCsv, type BlocResultat } from 'aedificium-ui';
import { ec2Recommande, tableauParDiametre, verifierAncrage, verifierCadre, verifierMandrin, verifierRecouvrement } from '../../src/index';
import { modeleParDefaut, type ModeleSaisie } from '../../app/src/form';
import { croquisAncrage, croquisRecouvrement } from '../../app/src/croquis';
import {
  avertissementsHtml,
  blocEntrees,
  blocSynthese,
  blocVerdict,
  lignesAncrage,
  lignesMandrinEtCadre,
  lignesRecouvrement,
  syntheseHtml,
  tableHtml,
  verdictHtml,
} from '../../app/src/vue';
import { STYLES_TRACE, blocsEnTexte } from '../../app/src/export';
import { noteDuCalcul } from '../../app/src/note';
import { CONFINEMENT_POUTRE, donneesBase, donneesRecouvrement } from '../fixtures';

const P = ec2Recommande();
const lire = (chemin: string): string => readFileSync(fileURLToPath(new URL(chemin, import.meta.url)), 'utf8');

/** Texte visible d'un fragment HTML ou SVG : balises retirees, entites decodees. */
function texteVisible(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&[A-Za-z0-9#]+;/g, ' ')
    .replace(/\s+/g, ' ');
}

const NOMS_GRECS =
  /\b(alpha|beta|gamma|delta|epsilon|eps|zeta|eta|theta|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Phi|Psi|Omega)\b/;

/** Mots affiches sans leurs accents dans la version d'origine de l'outil. */
const SANS_ACCENT = [
  'activee', 'adherence', 'beton', 'calculees', 'comprimee', 'comprimees', 'coulee', 'decalage', 'declaree', 'declarees',
  'declarez', 'deduites', 'degres', 'dela', 'depasse', 'diametre', 'donnees', 'ecartement', 'echelle', 'element',
  'equivalent', 'exterieures', 'extremite', 'generale', 'hypotheses', 'isolee', 'materiaux', 'mecaniques', 'memes',
  'methode', 'moitie', 'necessaires', 'parallele', 'perimetre', 'precontrainte', 'recommandees', 'reference', 'releve',
  'relevent', 'resultat', 'resultats', 'simplifiee', 'soudee', 'soudees', 'supposees', 'synthese', 'verifications',
  'lateral', 'recopiees', 'limite a', 'borne a', 'plafonne a', 'n a pas',
];
const SANS_ACCENT_RE = new RegExp(`\\b(${SANS_ACCENT.join('|')})\\b`, 'i');

function constats(texte: string): string[] {
  const c: string[] = [];
  if (texte.includes('_')) c.push(`« _ » affiche : ${extrait(texte, texte.indexOf('_'))}`);
  if (texte.includes('^')) c.push(`« ^ » affiche : ${extrait(texte, texte.indexOf('^'))}`);
  const grec = NOMS_GRECS.exec(texte);
  if (grec) c.push(`nom de lettre grecque : ${extrait(texte, grec.index)}`);
  const zero = /\d,\d*0(?!\d)/.exec(texte);
  if (zero) c.push(`zero inutile : ${extrait(texte, zero.index)}`);
  const long = /\d,\d{4,}/.exec(texte);
  if (long) c.push(`plus de 3 decimales : ${extrait(texte, long.index)}`);
  const accent = SANS_ACCENT_RE.exec(texte);
  if (accent) c.push(`accent manquant : ${extrait(texte, accent.index)}`);
  const apostrophe = /(^|[^A-Za-z])[dlnDLN] (?=[aeiouyhéèêàâAEIOUYHÉ])/.exec(texte);
  if (apostrophe) c.push(`apostrophe manquante : ${extrait(texte, apostrophe.index)}`);
  const a = /\ba (la|le|les|l')/.exec(texte);
  if (a) c.push(`« a » pour « à » : ${extrait(texte, a.index)}`);
  return c;
}

function extrait(texte: string, i: number): string {
  return `« ${texte.slice(Math.max(0, i - 30), i + 30)} »`;
}

const AVERTISSEMENT_TYPE = /aide au calcul|ne prescrit pas|responsabilit|incombe|justification r[eé]glementaire/i;

function messageDe(f: () => unknown): string {
  try {
    f();
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
  throw new Error('une erreur etait attendue');
}

/** Tous les cas affiches par l'outil, comme main.ts les assemble. */
function cas() {
  const ancrages = [
    donneesBase(),
    donneesBase({ a: 120, c1: 60, c: 60, confinement: { ...CONFINEMENT_POUTRE, sommeAst: 1000 }, pressionTransversale: 10, forme: 'coude-ou-crochet' }),
    donneesBase({ sollicitation: 'compression' }),
    donneesBase({ groupe: { nb: 2, verticalesComprimees: false } }),
    donneesBase({ longueurDisponible: 400 }),
    donneesBase({ longueurDisponible: 900 }),
  ].map((d) => verifierAncrage(d, P));
  const recouvrements = [donneesRecouvrement(), donneesRecouvrement({ phi: 25 })].map((d) => verifierRecouvrement(d, P));
  const mandrins = lignesMandrinEtCadre(verifierMandrin(16, P, 64, null), verifierCadre(8, 'crochet', P, 80));
  const synthese = tableauParDiametre(donneesBase(), P, 50);
  const erreurs = [
    messageDe(() => verifierAncrage(donneesBase({ methode: 'simplifiee' }), P)),
    messageDe(() => verifierAncrage(donneesBase({ methode: 'simplifiee', sollicitation: 'compression' }), P)),
    messageDe(() => verifierAncrage(donneesBase({ contrainte: { mode: 'saisie', sigma_sd: 500 } }), P)),
    messageDe(() => verifierAncrage(donneesBase({ phi: 12, groupe: { nb: 4, verticalesComprimees: false } }), P)),
  ];

  const ecran: string[] = [];
  const dessins: string[] = [];
  const blocs: BlocResultat[] = [];
  for (const r of ancrages) {
    ecran.push(verdictHtml(r.verdict, r.motif), avertissementsHtml(r.avertissements), tableHtml(lignesAncrage(r)));
    dessins.push(croquisAncrage(r, 'coude-ou-crochet', true), croquisAncrage(r, 'droite', false));
    blocs.push({ titre: 'Ancrage (§8.4)', lignes: lignesAncrage(r), note: null }, blocVerdict(r.verdict, r.motif));
  }
  for (const r of recouvrements) {
    const couture = r.armatureDeCouture.requise ? [r.armatureDeCouture.repartition] : [];
    ecran.push(verdictHtml(r.verdict, r.motif), avertissementsHtml([...r.ancrage.avertissements, ...couture]), tableHtml(lignesRecouvrement(r)));
    dessins.push(croquisRecouvrement(r));
    blocs.push({ titre: 'Recouvrement (§8.7)', lignes: lignesRecouvrement(r), note: couture[0] ?? null }, blocVerdict(r.verdict, r.motif));
  }
  ecran.push(tableHtml(mandrins), syntheseHtml(synthese), avertissementsHtml(erreurs));
  blocs.push({ titre: 'Mandrins et cadres (§8.3, §8.5)', lignes: mandrins, note: null }, blocSynthese(synthese));
  blocs.push(...erreurs.map((e) => ({ titre: 'Ancrage', lignes: [], note: e })));

  const entrees = [blocEntrees(modeleParDefaut())];
  // La note : les memes cas, par la saisie, dont un calcul impossible.
  const d = modeleParDefaut();
  const modeles: ModeleSaisie[] = [
    d,
    { ...d, disponible: 400 },
    { ...d, disponible: 900, phiM: 64, retour: 80 },
    { ...d, forme: 'coude-ou-crochet', confinement: true },
    { ...d, sollicitation: 'compression' },
    { ...d, mode: 'recouvrement' },
    { ...d, mode: 'recouvrement', phi: 25, disponible: 1500 },
    { ...d, sigMode: 'saisie', sigma: 500 },
  ];
  const note = modeles
    .map((m) => noteDeCalculHtml(noteDuCalcul(P, m, { projet: 'Parking', element: '', date: '2026-10-24' }), STYLES_TRACE))
    .join('');
  const csv = resultatsEnCsv(blocsEnTexte([...entrees, ...blocs]));
  return { ecran, dessins, note, csv };
}

describe('texte visible : notations, arrondis, accents', () => {
  const c = cas();

  it('ecran', () => {
    expect(c.ecran.flatMap((h) => constats(texteVisible(h)))).toEqual([]);
  });

  it('croquis', () => {
    expect(c.dessins.flatMap((s) => constats(texteVisible(s)))).toEqual([]);
  });

  it('note de calcul', () => {
    expect(constats(texteVisible(c.note))).toEqual([]);
  });

  it('page (index.html)', () => {
    expect(constats(texteVisible(lire('../../app/index.html')))).toEqual([]);
  });

  it('CSV : texte brut, ni « _ » ni nom de lettre grecque, ni balise', () => {
    expect(c.csv).not.toContain('_');
    expect(c.csv).not.toMatch(NOMS_GRECS);
    expect(c.csv).not.toContain('<sub>');
    expect(c.csv).toContain('lbd');
    expect(c.csv).toContain('α₁');
  });
});

describe('rendu des notations', () => {
  it('colonne des symboles, libelle et valeur en vrais indices', () => {
    const html = tableHtml([{ symbole: 'l_bd', libelle: 'avec sigma_sd < f_yd', valeur: '561 mm' }]);
    expect(html).toContain('<th>l<sub>bd</sub></th>');
    expect(html).toContain('σ<sub>sd</sub> &lt; f<sub>yd</sub>');
  });

  it('en-tete de la synthese', () => {
    expect(syntheseHtml([])).toContain('f<sub>bd</sub> (MPa)');
  });

  it('avertissements de l ecran : notation rendue, texte echappe', () => {
    const html = avertissementsHtml(['sigma_sd < 0']);
    expect(html).toBe('<p class="alerte">σ<sub>sd</sub> &lt; 0</p>');
  });

  it('blocsEnTexte ne touche pas aux blocs recus', () => {
    const bloc: BlocResultat = { titre: 'alpha_1', lignes: [{ symbole: 'l_0', libelle: 'phi', valeur: '1 mm2' }], note: 'M_Ed' };
    const [t] = blocsEnTexte([bloc]);
    expect(t).toEqual({ titre: 'α₁', lignes: [{ symbole: 'l₀', libelle: 'φ', valeur: '1 mm²' }], note: 'MEd' });
    expect(bloc.titre).toBe('alpha_1');
  });
});

describe('titre et avertissements types', () => {
  const page = lire('../../app/index.html');

  it('titre de la page sans tiret, majuscule initiale', () => {
    expect(/<h1>([^<]*)<\/h1>/.exec(page)?.[1]).toBe('Dispositions constructives');
    expect(/<title>([^<]*)<\/title>/.exec(page)?.[1].startsWith('Dispositions constructives')).toBe(true);
  });

  it('titre en grand', () => {
    const css = lire('../../app/src/style.css');
    const regle = /(^|\n)h1\s*\{([^}]*)\}/.exec(css)?.[2] ?? '';
    expect(regle).toMatch(/font-size:\s*1\.75rem/);
    expect(regle).toMatch(/font-weight:\s*600/);
  });

  it('plus aucune phrase type, ni sur la page ni dans la note', () => {
    expect(texteVisible(page)).not.toMatch(AVERTISSEMENT_TYPE);
    expect(texteVisible(cas().note)).not.toMatch(AVERTISSEMENT_TYPE);
  });

  it('la phrase utile sur les conditions d adherence reste sur la page', () => {
    expect(texteVisible(page)).toContain('ne sont jamais supposées');
  });
});

describe('main.ts passe par les fonctions testees', () => {
  const main = lire('../../app/src/main.ts');

  it('avertissements, entrees, hypotheses et CSV', () => {
    expect(main).not.toContain('class="alerte"');
    expect(main).toContain('avertissementsHtml(');
    expect(main).toContain('blocEntrees(');
    expect(main).toContain('noteDuCalcul(');
    expect(main).toContain('blocsEnTexte(');
  });
});
