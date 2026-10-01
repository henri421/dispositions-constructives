import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JETONS, valeursDesJetons } from 'aedificium-ui';
import { ec2Recommande, verifierAncrage, verifierRecouvrement } from '../../src/index';
import { champsDepuisModele, donneesAncrage, modeleDepuisChamps, modeleParDefaut } from '../../app/src/form';
import { croquisAncrage, croquisRecouvrement } from '../../app/src/croquis';
import { lignesAncrage, lignesRecouvrement, texteCoefficient } from '../../app/src/vue';
import { STYLES_TRACE, noteDeCalculHtml } from '../../app/src/export';
import { CONFINEMENT_POUTRE, donneesBase, donneesRecouvrement } from '../fixtures';

const P = ec2Recommande();

describe('saisie', () => {
  it('le formulaire part sur des conditions d adherence MAUVAISES, jamais un defaut favorable', () => {
    expect(modeleParDefaut().conditions).toBe('mauvaises');
  });

  it('aller-retour champs -> modele -> champs', () => {
    const champs = champsDepuisModele(modeleParDefaut());
    const l = modeleDepuisChamps(champs);
    expect(l.ok).toBe(true);
    if (l.ok) expect(champsDepuisModele(l.modele)).toEqual(champs);
  });

  it('longueur disponible vide : constat seul', () => {
    const l = modeleDepuisChamps({ ...champsDepuisModele(modeleParDefaut()), disponible: '' });
    if (!l.ok) throw new Error(l.message);
    expect(donneesAncrage(l.modele).longueurDisponible).toBeNull();
  });

  it('un recouvrement force la methode generale', () => {
    const l = modeleDepuisChamps({ ...champsDepuisModele(modeleParDefaut()), mode: 'recouvrement', methode: 'simplifiee' });
    if (!l.ok) throw new Error(l.message);
    expect(donneesAncrage(l.modele).methode).toBe('generale');
  });

  it('refus motive pour un nombre illisible', () => {
    const l = modeleDepuisChamps({ ...champsDepuisModele(modeleParDefaut()), phi: 'x' });
    expect(l.ok).toBe(false);
  });
});

describe('vues', () => {
  it('un coefficient non applicable s affiche par un tiret et son motif, jamais un 1,0 muet', () => {
    const t = texteCoefficient({ statut: 'non-applicable', motif: 'barre comprimee' });
    expect(t.valeur).toBe('—');
    expect(t.statut).toBe('non applicable');
  });

  it('les lignes de l ancrage disent si la borne 0,7 est activee', () => {
    const r = verifierAncrage(donneesBase({ a: 120, c1: 60, c: 60, confinement: { ...CONFINEMENT_POUTRE, sommeAst: 1000 }, pressionTransversale: 10 }), P);
    expect(lignesAncrage(r).some((l) => l.libelle.includes('ACTIVEE'))).toBe(true);
  });

  it('les lignes du recouvrement disent que alpha_4 n intervient pas', () => {
    const r = verifierRecouvrement(donneesRecouvrement(), P);
    expect(lignesRecouvrement(r).find((l) => l.symbole === 'alpha_4')?.libelle).toContain('n intervient pas');
  });
});

describe('croquis et export', () => {
  it('croquis d ancrage cote, sans NaN', () => {
    const svg = croquisAncrage(verifierAncrage(donneesBase(), P), 'coude-ou-crochet', true);
    expect(svg).toContain('l_bd = 561 mm');
    expect(svg).toContain('class="transversale"');
    expect(svg).not.toContain('NaN');
  });

  it('croquis de recouvrement : tiers extremes seulement si la couture est requise', () => {
    expect(croquisRecouvrement(verifierRecouvrement(donneesRecouvrement(), P))).not.toContain('class="tiers"');
    expect(croquisRecouvrement(verifierRecouvrement(donneesRecouvrement({ phi: 25 }), P))).toContain('class="tiers"');
  });

  it('le :root de style.css concorde avec les jetons communs', () => {
    const css = readFileSync(fileURLToPath(new URL('../../app/src/style.css', import.meta.url)), 'utf8');
    const page = valeursDesJetons(css);
    for (const [nom, valeur] of valeursDesJetons(JETONS)) expect(page.get(nom)).toBe(valeur);
  });

  it('la note porte le titre du chapitre 8 et echappe le texte', () => {
    const html = noteDeCalculHtml(
      { titre: 'HA16 <x>', date: '2026-10-01', profil: P.nom, entrees: [], dessins: [], resultats: [], avertissements: [], hypotheses: [] },
      STYLES_TRACE
    );
    expect(html).toContain('EN 1992-1-1 §8');
    expect(html).toContain('HA16 &lt;x&gt;');
  });
});
