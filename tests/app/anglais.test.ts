/**
 * Version anglaise (lot 8.8) : page `en/index.html` de meme squelette que la
 * page francaise, et AUCUN reste de francais dans ce qui s'affiche en anglais
 * (ecran, croquis, note, CSV, messages). Le francais, lui, est couvert par
 * `finitions.test.ts`, inchange.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { constatsAffichage, contenuBalise, definirLangue, noteDeCalculHtml, notationHtml, resultatsEnCsv, texteVisible, type BlocResultat } from 'aedificium-ui';
import { ec2Recommande, tableauParDiametre, verifierAncrage, verifierCadre, verifierMandrin, verifierRecouvrement } from '../../src/index';
import { champsDepuisModele, modeleDepuisChamps, modeleParDefaut, type ModeleSaisie } from '../../app/src/form';
import { croquisAncrage, croquisRecouvrement } from '../../app/src/croquis';
import {
  avertissementsHtml,
  blocEntrees,
  blocSynthese,
  blocVerdict,
  lignesAncrage,
  lignesMandrinEtCadre,
  lignesRecouvrement,
  messageDErreur,
  syntheseHtml,
  tableHtml,
  verdictHtml,
} from '../../app/src/vue';
import { STYLES_TRACE, blocsEnTexte } from '../../app/src/export';
import { noteDuCalcul } from '../../app/src/note';
import { textes } from '../../app/src/textes';
import { CONFINEMENT_POUTRE, donneesBase, donneesRecouvrement } from '../fixtures';

const P = ec2Recommande();
const lire = (chemin: string): string => readFileSync(fileURLToPath(new URL(chemin, import.meta.url)), 'utf8');
const controler = (nom: string, html: string): string[] => constatsAffichage(texteVisible(html), { langue: 'en' }).map((c) => `${nom} : ${c}`);
/** CSV : la virgule y est le separateur, pas une virgule decimale. */
const controlerCsv = (nom: string, csv: string): string[] =>
  constatsAffichage(csv, { langue: 'en' })
    .filter((c) => !c.startsWith('virgule decimale'))
    .map((c) => `${nom} : ${c}`);

/** Squelette d'une page : les attributs que lit le script, dans l'ordre. */
function squelette(html: string): string[] {
  return [...html.matchAll(/\s(id|data-[a-z-]+|type|inputmode|accept|value)="([^"]*)"/g)].map((m) => `${m[1]}=${m[2]}`);
}

function messageDe(f: () => unknown): string {
  try {
    f();
  } catch (e) {
    return messageDErreur(e);
  }
  throw new Error('une erreur etait attendue');
}

describe('page anglaise', () => {
  const fr = lire('../../app/index.html');
  const en = lire('../../app/en/index.html');

  it('meme squelette que la page francaise', () => {
    expect(squelette(en)).toEqual(squelette(fr));
  });

  it('langue, script commun, liens entre les deux versions', () => {
    expect(en).toContain('<html lang="en">');
    expect(en).toContain('src="../src/main.ts"');
    expect(en).toMatch(/class="barre-langue" href="\.\.\/"/);
    expect(fr).toMatch(/class="barre-langue" href="en\/"/);
  });

  it('titre anglais, aucun reste de francais', () => {
    expect(contenuBalise(en, 'h1')).toBe('Detailing');
    expect(controler('page', en.replace(/lang="fr"[^>]*>FR</, '>'))).toEqual([]);
  });
});

describe('affichage en anglais', () => {
  beforeEach(() => definirLangue('en'));
  afterEach(() => definirLangue('fr'));

  it('ecran, croquis, note et CSV', () => {
    const ancrages = [
      donneesBase(),
      donneesBase({ a: 120, c1: 60, c: 60, confinement: { ...CONFINEMENT_POUTRE, sommeAst: 1000 }, pressionTransversale: 10, forme: 'coude-ou-crochet' }),
      donneesBase({ sollicitation: 'compression' }),
      donneesBase({ groupe: { nb: 2, verticalesComprimees: false } }),
      donneesBase({ longueurDisponible: 400 }),
      donneesBase({ longueurDisponible: 900 }),
      donneesBase({ fck: 70 }),
      donneesBase({ forme: 'coude-ou-crochet', methode: 'simplifiee' }),
      donneesBase({ barresTransversalesSoudees: true }),
      donneesBase({ contrainte: { mode: 'reduite', A_s_req: 400, A_s_prov: 500 } }),
      donneesBase({ contrainte: { mode: 'saisie', sigma_sd: 300 } }),
      donneesBase({ adherence: { mode: 'geometrie', inclinaison: 60, hauteurElement: 500, distanceAuFond: 450 } }),
      donneesBase({ adherence: { mode: 'geometrie', inclinaison: 0, hauteurElement: 200, distanceAuFond: 150 } }),
      donneesBase({ adherence: { mode: 'geometrie', inclinaison: 0, hauteurElement: 500, distanceAuFond: 200 } }),
      donneesBase({ adherence: { mode: 'geometrie', inclinaison: 0, hauteurElement: 500, distanceAuFond: 400 } }),
      donneesBase({ adherence: { mode: 'geometrie', inclinaison: 0, hauteurElement: 800, distanceAuFond: 400 } }),
      donneesBase({ adherence: { mode: 'geometrie', inclinaison: 0, hauteurElement: 800, distanceAuFond: 700 } }),
    ].map((d) => verifierAncrage(d, P));
    const recouvrements = [
      donneesRecouvrement(),
      donneesRecouvrement({ phi: 25 }),
      donneesRecouvrement({ phi: 25, rho1: 100, distanceEntreRecouvrements: 100 }),
      donneesRecouvrement({ phi: 25, sollicitation: 'compression' }),
      donneesRecouvrement({ confinement: CONFINEMENT_POUTRE }),
      donneesRecouvrement({ rho1: 10 }),
    ].map((d) => verifierRecouvrement(d, P));

    const constats: string[] = [];
    const blocs: BlocResultat[] = [];
    ancrages.forEach((r, i) => {
      constats.push(...controler(`ancrage ${i}`, verdictHtml(r.verdict, r.motif) + avertissementsHtml(r.avertissements) + tableHtml(lignesAncrage(r))));
      constats.push(...controler(`croquis ${i}`, croquisAncrage(r, 'coude-ou-crochet', true) + croquisAncrage(r, 'droite', false)));
      blocs.push({ titre: textes().blocs.ancrage, lignes: lignesAncrage(r), note: null }, blocVerdict(r.verdict, r.motif));
    });
    recouvrements.forEach((r, i) => {
      const couture = r.armatureDeCouture.requise ? [r.armatureDeCouture.repartition] : [];
      constats.push(...controler(`recouvrement ${i}`, verdictHtml(r.verdict, r.motif) + avertissementsHtml([...r.ancrage.avertissements, ...couture]) + tableHtml(lignesRecouvrement(r))));
      constats.push(...controler(`croquis rec ${i}`, croquisRecouvrement(r)));
      blocs.push({ titre: textes().blocs.recouvrement, lignes: lignesRecouvrement(r), note: null }, blocVerdict(r.verdict, r.motif));
    });
    const mandrins = [
      lignesMandrinEtCadre(verifierMandrin(16, P, 64, null), verifierCadre(8, 'crochet', P, 80)),
      lignesMandrinEtCadre(verifierMandrin(16, P, 20, null), verifierCadre(8, 'coude', P, 20)),
      lignesMandrinEtCadre(verifierMandrin(16, P, null, null), verifierCadre(8, 'coude', P, null)),
    ];
    mandrins.forEach((l, i) => constats.push(...controler(`mandrins ${i}`, tableHtml(l))));
    const synthese = tableauParDiametre(donneesBase(), P, 50);
    constats.push(...controler('synthese', syntheseHtml(synthese)));
    blocs.push(...mandrins.map((lignes) => ({ titre: textes().blocs.mandrins, lignes, note: null })), blocSynthese(synthese));

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
      { ...d, sigMode: 'reduite', methode: 'simplifiee', forme: 'boucle', paquet: true },
      { ...d, phiCadre: 0 },
    ];
    modeles.forEach((m, i) => {
      constats.push(...controler(`note ${i}`, noteDeCalculHtml(noteDuCalcul(P, m, { projet: 'Car park', element: '', date: '2026-10-29' }), STYLES_TRACE)));
      constats.push(...controlerCsv(`entrees ${i}`, resultatsEnCsv(blocsEnTexte([blocEntrees(m)]))));
    });
    constats.push(...controlerCsv('csv', resultatsEnCsv(blocsEnTexte(blocs))));
    expect(constats).toEqual([]);
  });

  it('messages et erreurs', () => {
    const champs = champsDepuisModele(modeleParDefaut());
    const lectures = [
      modeleDepuisChamps({ ...champs, phi: 'abc' }),
      modeleDepuisChamps({ ...champs, disponible: 'abc' }),
      modeleDepuisChamps({ ...champs, mode: 'autre' }),
    ];
    const messages = [
      ...lectures.map((l) => (l.ok ? '' : l.message)),
      messageDe(() => verifierAncrage(donneesBase({ methode: 'simplifiee' }), P)),
      messageDe(() => verifierAncrage(donneesBase({ methode: 'simplifiee', sollicitation: 'compression' }), P)),
      messageDe(() => verifierAncrage(donneesBase({ contrainte: { mode: 'saisie', sigma_sd: 500 } }), P)),
      messageDe(() => verifierAncrage(donneesBase({ contrainte: { mode: 'reduite', A_s_req: 600, A_s_prov: 500 } }), P)),
      messageDe(() => verifierAncrage(donneesBase({ phi: 12, groupe: { nb: 4, verticalesComprimees: false } }), P)),
      messageDe(() => verifierAncrage(donneesBase({ phi: 40, groupe: { nb: 3, verticalesComprimees: false } }), P)),
      messageDe(() => verifierAncrage(donneesBase({ groupe: { nb: 0, verticalesComprimees: false } }), P)),
      messageDe(() => verifierAncrage(donneesBase({ phi: 0 }), P)),
      messageDe(() => verifierAncrage(donneesBase({ fck: 0 }), P)),
      messageDe(() => verifierAncrage(donneesBase({ fyk: 0 }), P)),
      messageDe(() => verifierAncrage(donneesBase({ a: -1 }), P)),
      messageDe(() => verifierAncrage(donneesBase({ c1: -1 }), P)),
      messageDe(() => verifierAncrage(donneesBase({ c: -1 }), P)),
      messageDe(() => verifierAncrage(donneesBase({ pressionTransversale: -1 }), P)),
      messageDe(() => verifierAncrage(donneesBase({ longueurDisponible: 0 }), P)),
      messageDe(() => verifierAncrage(donneesBase({ adherence: { mode: 'geometrie', inclinaison: 0, hauteurElement: 300, distanceAuFond: 400 } }), P)),
      messageDe(() => verifierAncrage(donneesBase({ adherence: { mode: 'geometrie', inclinaison: 120, hauteurElement: 300, distanceAuFond: 100 } }), P)),
      messageDe(() => verifierRecouvrement(donneesRecouvrement({ rho1: 0 }), P)),
      messageDe(() => verifierRecouvrement(donneesRecouvrement({ methode: 'simplifiee' }), P)),
      messageDe(() => verifierMandrin(0, P, null, null)),
      messageDe(() => verifierCadre(0, 'crochet', P, null)),
      messageDErreur(new Error('')),
      textes().messages.aucunCroquis,
      textes().messages.nouvelleVersion,
      textes().messages.elementAbsent('#x'),
    ];
    expect(messages.flatMap((m, i) => controler(`message ${i}`, notationHtml(m)))).toEqual([]);
  });
});
