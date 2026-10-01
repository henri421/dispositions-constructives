/**
 * Cablage de l'interface des ancrages et recouvrements.
 *
 * Ce module ne calcule RIEN : il lit les champs, appelle le noyau, et confie
 * a `form`, `vue`, `croquis` et `export` — tous purs — la mise en forme.
 */

import { echapper, ouvrirOuTelecharger, resultatsEnCsv, svgAutonome, telecharger, type BlocResultat } from 'aedificium-ui';
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
import {
  blocSynthese,
  lignesAncrage,
  lignesMandrinEtCadre,
  lignesRecouvrement,
  messageDErreur,
  syntheseHtml,
  tableHtml,
  verdictHtml,
} from './vue';
import { STYLES_TRACE, noteDeCalculHtml } from './export';
import './style.css';

function exige<T extends Element>(selecteur: string): T {
  const trouve = document.querySelector(selecteur);
  if (trouve === null) throw new Error(`element absent de la page : ${selecteur}`);
  return trouve as T;
}

const PROFIL = ec2Recommande();
const formulaire = exige<HTMLFormElement>('#formulaire');
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
  el.textContent = message ?? '';
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
      zones.avertissements.innerHTML = r.avertissements.map((a) => `<p class="alerte">${echapper(a)}</p>`).join('');
      const lignes = lignesAncrage(r);
      zones.corps.innerHTML = tableHtml(lignes);
      blocs.push({ titre: 'Ancrage (§8.4)', lignes, note: null }, { titre: 'Verdict', lignes: [], note: r.motif });
    } else {
      const r = verifierRecouvrement(donneesRecouvrement(m), PROFIL);
      resultat = { type: 'recouvrement', r };
      croquis = croquisRecouvrement(r);
      zones.verdict.innerHTML = verdictHtml(r.verdict, r.motif);
      zones.avertissements.innerHTML = [...r.ancrage.avertissements, ...(r.armatureDeCouture.requise ? [r.armatureDeCouture.repartition] : [])]
        .map((a) => `<p class="alerte">${echapper(a)}</p>`)
        .join('');
      const base = lignesAncrage(r.ancrage).slice(0, 7);
      const lignes = lignesRecouvrement(r);
      zones.corps.innerHTML = tableHtml([...base, ...lignes]);
      blocs.push(
        { titre: 'Adherence et longueur de reference (§8.4)', lignes: base, note: null },
        { titre: 'Recouvrement (§8.7)', lignes, note: r.armatureDeCouture.requise ? r.armatureDeCouture.repartition : null },
        { titre: 'Verdict', lignes: [], note: r.motif }
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
  }

  const synthese = tableauParDiametre(donneesAncrage({ ...m, mode: 'ancrage' }), PROFIL, m.rho1);
  zones.synthese.innerHTML = syntheseHtml(synthese);
  blocs.push(blocSynthese(synthese));

  etat = { modele: m, resultat, croquis, lignes: blocs };
}

function entrees(m: ModeleSaisie): BlocResultat {
  return {
    titre: 'Donnees',
    lignes: [
      { symbole: 'calcul', libelle: 'objet et sollicitation', valeur: `${m.mode}, ${m.sollicitation}` },
      { symbole: 'phi', libelle: m.paquet ? `paquet de ${m.nb} barres` : 'barre isolee', valeur: `${m.phi} mm` },
      { symbole: 'beton / acier', libelle: 'f_ck / f_yk', valeur: `${m.fck} / ${m.fyk} MPa` },
      { symbole: 'forme', libelle: 'extremite', valeur: m.forme },
      { symbole: 'a, c_1, c', libelle: 'distance libre et enrobages', valeur: `${m.a}, ${m.c1}, ${m.c} mm` },
    ],
    note: null,
  };
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
      montrer(zones.erreur, 'Aucun croquis valide a exporter : corriger la saisie.');
      return;
    }
    telecharger(`${base}.svg`, svgAutonome(e.croquis, STYLES_TRACE), 'image/svg+xml;charset=utf-8');
  } else if (action === 'exporter-resultats') {
    telecharger(`${base}.csv`, resultatsEnCsv([entrees(e.modele), ...e.lignes]), 'text/csv;charset=utf-8');
  } else if (action === 'exporter-note') {
    const avert =
      e.resultat === null ? [] : e.resultat.type === 'ancrage' ? e.resultat.r.avertissements : e.resultat.r.ancrage.avertissements;
    ouvrirOuTelecharger(
      `${base}-note.html`,
      noteDeCalculHtml(
        {
          titre: `${e.modele.mode === 'ancrage' ? 'Ancrage' : 'Recouvrement'} HA${e.modele.phi}`,
          date: new Date().toISOString().slice(0, 10),
          profil: `${PROFIL.nom} (${PROFIL.date})`,
          entrees: [entrees(e.modele)],
          dessins: e.croquis === '' ? [] : [e.croquis],
          resultats: e.lignes,
          avertissements: avert,
          hypotheses: [
            'Valeurs recommandees de l EN 1992-1-1 ; aucune annexe nationale codee.',
            'Borne alpha_2 alpha_3 alpha_5 >= 0,7 appliquee aux ancrages et aux recouvrements.',
            'Methode simplifiee : l_b,eq porte a l_b,min, du cote de la securite.',
          ],
        },
        STYLES_TRACE
      )
    );
  }
});

ecrireModele(modeleParDefaut());
formulaire.addEventListener('input', rafraichir);
formulaire.addEventListener('change', rafraichir);
rafraichir();

if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  void import('./pwa').then((m) => m.enregistrerServiceWorker());
}
