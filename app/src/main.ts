/**
 * Cablage de l'interface des ancrages et recouvrements.
 *
 * Ce module ne calcule RIEN : il lit les champs, appelle le noyau, et confie
 * a `form`, `vue`, `croquis` et `export` — tous purs — la mise en forme.
 */

import {
  noteDeCalculHtml,
  notationTexte,
  ouvrirOuTelecharger,
  resultatsEnCsv,
  svgAutonome,
  telecharger,
  type BlocResultat,
} from 'aedificium-ui';
import {
  ec2Recommande,
  tableauParDiametre,
  verifierAncrage,
  verifierCadre,
  verifierMandrin,
  verifierRecouvrement,
  type ResultatAncrage,
  type ResultatRecouvrement,
} from '../../src/index';
import { champsDepuisModele, donneesAncrage, donneesRecouvrement, modeleDepuisChamps, modeleParDefaut, type ModeleSaisie } from './form';
import { croquisAncrage, croquisRecouvrement } from './croquis';
import { noteDuCalcul } from './note';
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
} from './vue';
import { STYLES_TRACE, blocsEnTexte } from './export';
import './style.css';

function exige<T extends Element>(selecteur: string): T {
  const trouve = document.querySelector(selecteur);
  if (trouve === null) throw new Error(`élément absent de la page : ${selecteur}`);
  return trouve as T;
}

const PROFIL = ec2Recommande();
const CLE_CARTOUCHE = 'dispositions-constructives:cartouche';
const formulaire = exige<HTMLFormElement>('#formulaire');
const sorties = exige<HTMLElement>('#sorties');
const champProjet = exige<HTMLInputElement>('[data-role="projet"]');
const champElement = exige<HTMLInputElement>('[data-role="element"]');

/** Cartouche enregistre : toute valeur absente ou illisible vaut chaine vide. */
function lireCartouche(): { projet: string; element: string } {
  try {
    const brut: unknown = JSON.parse(localStorage.getItem(CLE_CARTOUCHE) ?? 'null');
    if (brut === null || typeof brut !== 'object') return { projet: '', element: '' };
    const o = brut as Record<string, unknown>;
    return {
      projet: typeof o.projet === 'string' ? o.projet : '',
      element: typeof o.element === 'string' ? o.element : '',
    };
  } catch {
    return { projet: '', element: '' };
  }
}

function enregistrerCartouche(): void {
  try {
    localStorage.setItem(CLE_CARTOUCHE, JSON.stringify({ projet: champProjet.value, element: champElement.value }));
  } catch {
    // Stockage indisponible : le cartouche reste valable pour la note courante.
  }
}

const zones = {
  erreurSaisie: exige<HTMLElement>('[data-role="erreur-saisie"]'),
  erreur: exige<HTMLElement>('[data-role="erreur"]'),
  avertissements: exige<HTMLElement>('[data-role="avertissements"]'),
  verdict: exige<HTMLElement>('[data-role="verdict"]'),
  croquis: exige<HTMLElement>('[data-role="croquis"]'),
  corps: exige<HTMLElement>('[data-role="corps"]'),
  erreurMandrin: exige<HTMLElement>('[data-role="erreur-mandrin"]'),
  mandrins: exige<HTMLElement>('[data-role="mandrins-corps"]'),
  synthese: exige<HTMLElement>('[data-role="synthese-corps"]'),
};

function champs(): (HTMLInputElement | HTMLSelectElement)[] {
  return Array.from(formulaire.querySelectorAll('[data-champ]'));
}

function valeursDesChamps(): Record<string, string> {
  const v: Record<string, string> = {};
  for (const el of champs()) {
    const nom = el.getAttribute('data-champ');
    if (nom === null) continue;
    v[nom] = el instanceof HTMLInputElement && el.type === 'checkbox' ? (el.checked ? 'oui' : 'non') : el.value;
  }
  return v;
}

function ecrireModele(m: ModeleSaisie): void {
  const v = champsDepuisModele(m);
  for (const el of champs()) {
    const nom = el.getAttribute('data-champ');
    if (nom === null || v[nom] === undefined) continue;
    if (el instanceof HTMLInputElement && el.type === 'checkbox') el.checked = v[nom] === 'oui';
    else el.value = v[nom];
  }
}

function ajusterLesGroupes(m: ModeleSaisie): void {
  const vis: Record<string, boolean> = {
    paquet: m.paquet,
    'sig-saisie': m.sigMode === 'saisie',
    'sig-reduite': m.sigMode === 'reduite',
    'adh-declarees': m.adhMode === 'declarees',
    'adh-geometrie': m.adhMode === 'geometrie',
    methode: m.mode === 'ancrage',
    confinement: m.confinement,
    recouvrement: m.mode === 'recouvrement',
  };
  for (const [g, visible] of Object.entries(vis)) exige<HTMLElement>(`[data-groupe="${g}"]`).hidden = !visible;
}

function montrer(el: HTMLElement, message: string | null): void {
  el.textContent = message === null ? '' : notationTexte(message);
  el.hidden = message === null;
}

interface Etat {
  modele: ModeleSaisie;
  resultat: { type: 'ancrage'; r: ResultatAncrage } | { type: 'recouvrement'; r: ResultatRecouvrement } | null;
  croquis: string;
  lignes: BlocResultat[];
}

let etat: Etat | null = null;

function rafraichir(): void {
  const lecture = modeleDepuisChamps(valeursDesChamps());
  if (!lecture.ok) {
    montrer(zones.erreurSaisie, lecture.message);
    return;
  }
  montrer(zones.erreurSaisie, null);
  const m = lecture.modele;
  ajusterLesGroupes(m);
  const blocs: BlocResultat[] = [];

  let resultat: Etat['resultat'] = null;
  let croquis = '';
  try {
    if (m.mode === 'ancrage') {
      const r = verifierAncrage(donneesAncrage(m), PROFIL);
      resultat = { type: 'ancrage', r };
      croquis = croquisAncrage(r, m.forme, m.confinement);
      zones.verdict.innerHTML = verdictHtml(r.verdict, r.motif);
      zones.avertissements.innerHTML = avertissementsHtml(r.avertissements);
      const lignes = lignesAncrage(r);
      zones.corps.innerHTML = tableHtml(lignes);
      blocs.push({ titre: 'Ancrage (§8.4)', lignes, note: null }, blocVerdict(r.verdict, r.motif));
    } else {
      const r = verifierRecouvrement(donneesRecouvrement(m), PROFIL);
      resultat = { type: 'recouvrement', r };
      croquis = croquisRecouvrement(r);
      zones.verdict.innerHTML = verdictHtml(r.verdict, r.motif);
      const couture = r.armatureDeCouture.requise ? [r.armatureDeCouture.repartition] : [];
      zones.avertissements.innerHTML = avertissementsHtml([...r.ancrage.avertissements, ...couture]);
      const base = lignesAncrage(r.ancrage).slice(0, 7);
      const lignes = lignesRecouvrement(r);
      zones.corps.innerHTML = tableHtml([...base, ...lignes]);
      blocs.push(
        { titre: 'Adhérence et longueur de référence (§8.4)', lignes: base, note: null },
        { titre: 'Recouvrement (§8.7)', lignes, note: r.armatureDeCouture.requise ? r.armatureDeCouture.repartition : null },
        blocVerdict(r.verdict, r.motif)
      );
    }
    zones.croquis.innerHTML = croquis;
    montrer(zones.erreur, null);
  } catch (e) {
    montrer(zones.erreur, messageDErreur(e));
    blocs.push({ titre: m.mode === 'ancrage' ? 'Ancrage' : 'Recouvrement', lignes: [], note: messageDErreur(e) });
  }

  try {
    const mandrin = verifierMandrin(m.phi, PROFIL, m.phiM, null);
    const cadre = verifierCadre(m.phiCadre, m.typeCadre, PROFIL, m.retour);
    const lignes = lignesMandrinEtCadre(mandrin, cadre);
    zones.mandrins.innerHTML = tableHtml(lignes);
    blocs.push({ titre: 'Mandrins et cadres (§8.3, §8.5)', lignes, note: null });
    montrer(zones.erreurMandrin, null);
  } catch (e) {
    montrer(zones.erreurMandrin, messageDErreur(e));
    // L'ecran affiche l'erreur : la note la porte aussi, plutot qu'un silence.
    blocs.push({ titre: 'Mandrins et cadres (§8.3, §8.5)', lignes: [], note: messageDErreur(e) });
  }

  const synthese = tableauParDiametre(donneesAncrage({ ...m, mode: 'ancrage' }), PROFIL, m.rho1);
  zones.synthese.innerHTML = syntheseHtml(synthese);
  blocs.push(blocSynthese(synthese));

  etat = { modele: m, resultat, croquis, lignes: blocs };
}

document.addEventListener('click', (ev) => {
  const cible = ev.target;
  if (!(cible instanceof HTMLElement)) return;
  const action = cible.dataset.action;
  if (action === undefined || !action.startsWith('exporter-')) return;
  if (etat === null) return;
  const e = etat;
  const base = `${e.modele.mode}-HA${e.modele.phi}`;
  if (action === 'exporter-croquis') {
    if (e.croquis === '') {
      montrer(zones.erreur, 'Aucun croquis valide à exporter : corriger la saisie.');
      return;
    }
    telecharger(`${base}.svg`, svgAutonome(e.croquis, STYLES_TRACE), 'image/svg+xml;charset=utf-8');
  } else if (action === 'exporter-resultats') {
    telecharger(`${base}.csv`, resultatsEnCsv(blocsEnTexte([blocEntrees(e.modele), ...e.lignes])), 'text/csv;charset=utf-8');
  } else if (action === 'exporter-note') {
    ouvrirOuTelecharger(
      `${base}-note.html`,
      noteDeCalculHtml(
        noteDuCalcul(PROFIL, e.modele, {
          projet: champProjet.value,
          element: champElement.value,
          date: new Date().toISOString().slice(0, 10),
        }),
        STYLES_TRACE
      )
    );
  }
});

ecrireModele(modeleParDefaut());
formulaire.addEventListener('input', rafraichir);
formulaire.addEventListener('change', rafraichir);
const cartouche = lireCartouche();
champProjet.value = cartouche.projet;
champElement.value = cartouche.element;
// Hors formulaire : un changement de cartouche ne relance pas le calcul.
sorties.addEventListener('input', enregistrerCartouche);
rafraichir();

if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  void import('./pwa').then((m) => m.enregistrerServiceWorker());
}
