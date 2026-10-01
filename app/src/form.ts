/**
 * Saisie de l'interface : modele, lecture des champs, traduction vers le
 * noyau. Module PUR.
 *
 * Unites : mm, mm2, MPa, kN, degres.
 */

import { lireNombre } from 'aedificium-ui';
import type {
  DonneesAncrage,
  DonneesRecouvrement,
  FormeExtremite,
  PositionTransversale,
  Sollicitation,
} from '../../src/index';
import type { AncrageCadre } from '../../src/index';

export interface ModeleSaisie {
  mode: 'ancrage' | 'recouvrement';
  phi: number;
  paquet: boolean;
  nb: number;
  verticales: boolean;
  fck: number;
  fyk: number;
  sollicitation: Sollicitation;
  adhMode: 'declarees' | 'geometrie';
  conditions: 'bonnes' | 'mauvaises';
  inclinaison: number;
  hElement: number;
  zFond: number;
  sigMode: 'f_yd' | 'saisie' | 'reduite';
  sigma: number;
  asReq: number;
  asProv: number;
  forme: FormeExtremite;
  a: number;
  c1: number;
  c: number;
  confinement: boolean;
  typeElement: 'poutre' | 'dalle';
  sommeAst: number;
  position: PositionTransversale;
  soudees: boolean;
  p: number;
  methode: 'generale' | 'simplifiee';
  /** null : aucune longueur disponible, l'outil constate seulement. */
  disponible: number | null;
  rho1: number;
  aRec: number;
  /** Mandrin mis en oeuvre (mm), null s'il n'est pas saisi. */
  phiM: number | null;
  phiCadre: number;
  typeCadre: AncrageCadre;
  retour: number | null;
}

export type Lecture = { ok: true; modele: ModeleSaisie } | { ok: false; message: string };

/**
 * Depart : HA16 en traction, C25/30, B500. Les conditions d'adherence sont
 * a declarer : le formulaire part sur « mauvaises », le cas defavorable, pour
 * qu'aucun defaut ne puisse etre non conservatif.
 */
export function modeleParDefaut(): ModeleSaisie {
  return {
    mode: 'ancrage',
    phi: 16,
    paquet: false,
    nb: 2,
    verticales: false,
    fck: 25,
    fyk: 500,
    sollicitation: 'traction',
    adhMode: 'declarees',
    conditions: 'mauvaises',
    inclinaison: 0,
    hElement: 500,
    zFond: 450,
    sigMode: 'f_yd',
    sigma: 300,
    asReq: 400,
    asProv: 500,
    forme: 'droite',
    a: 60,
    c1: 30,
    c: 30,
    confinement: false,
    typeElement: 'poutre',
    sommeAst: 201,
    position: 'angle',
    soudees: false,
    p: 0,
    methode: 'generale',
    disponible: null,
    rho1: 50,
    aRec: 100,
    phiM: null,
    phiCadre: 8,
    typeCadre: 'crochet',
    retour: null,
  };
}

const LIBELLES: Record<string, string> = {
  phi: 'phi (mm)',
  nb: 'n_b (-)',
  fck: 'f_ck (MPa)',
  fyk: 'f_yk (MPa)',
  inclinaison: 'Inclinaison (degres)',
  h_element: 'Hauteur de l element (mm)',
  z_fond: 'Distance au fond (mm)',
  sigma: 'sigma_sd (MPa)',
  as_req: 'A_s,req (mm2)',
  as_prov: 'A_s,prov (mm2)',
  a: 'a (mm)',
  c1: 'c_1 (mm)',
  c: 'c (mm)',
  somme_ast: 'Sigma A_st (mm2)',
  p: 'p (MPa)',
  disponible: 'Longueur disponible (mm)',
  rho1: 'rho_1 (%)',
  a_rec: 'Distance entre recouvrements (mm)',
  phi_m: 'Mandrin phi_m (mm)',
  phi_cadre: 'phi du cadre (mm)',
  retour: 'Retour droit (mm)',
};

class ErreurDeSaisie extends Error {}

function choix<T extends string>(v: Record<string, string>, nom: string, permis: readonly T[]): T {
  const x = v[nom];
  if ((permis as readonly string[]).includes(x)) return x as T;
  throw new ErreurDeSaisie(`Valeur inattendue pour ${nom} : « ${x ?? ''} ».`);
}

function nombre(v: Record<string, string>, nom: string, requis: boolean, repli: number): number {
  const x = lireNombre(v[nom] ?? '');
  if (x === null) {
    if (requis) throw new ErreurDeSaisie(`${LIBELLES[nom] ?? nom} : nombre attendu.`);
    return repli;
  }
  return x;
}

function nombreOuVide(v: Record<string, string>, nom: string): number | null {
  const t = (v[nom] ?? '').trim();
  if (t === '') return null;
  const x = lireNombre(t);
  if (x === null) throw new ErreurDeSaisie(`${LIBELLES[nom] ?? nom} : nombre attendu, ou champ vide.`);
  return x;
}

const oui = (v: Record<string, string>, nom: string): boolean => v[nom] === 'oui';

export function modeleDepuisChamps(v: Record<string, string>): Lecture {
  const d = modeleParDefaut();
  try {
    const mode = choix(v, 'mode', ['ancrage', 'recouvrement'] as const);
    const paquet = oui(v, 'paquet');
    const adhMode = choix(v, 'adh_mode', ['declarees', 'geometrie'] as const);
    const sigMode = choix(v, 'sig_mode', ['f_yd', 'saisie', 'reduite'] as const);
    const confinement = oui(v, 'confinement');
    return {
      ok: true,
      modele: {
        mode,
        phi: nombre(v, 'phi', true, d.phi),
        paquet,
        nb: nombre(v, 'nb', paquet, d.nb),
        verticales: oui(v, 'verticales'),
        fck: nombre(v, 'fck', true, d.fck),
        fyk: nombre(v, 'fyk', true, d.fyk),
        sollicitation: choix(v, 'sollicitation', ['traction', 'compression'] as const),
        adhMode,
        conditions: choix(v, 'conditions', ['bonnes', 'mauvaises'] as const),
        inclinaison: nombre(v, 'inclinaison', adhMode === 'geometrie', d.inclinaison),
        hElement: nombre(v, 'h_element', adhMode === 'geometrie', d.hElement),
        zFond: nombre(v, 'z_fond', adhMode === 'geometrie', d.zFond),
        sigMode,
        sigma: nombre(v, 'sigma', sigMode === 'saisie', d.sigma),
        asReq: nombre(v, 'as_req', sigMode === 'reduite', d.asReq),
        asProv: nombre(v, 'as_prov', sigMode === 'reduite', d.asProv),
        forme: choix(v, 'forme', ['droite', 'coude-ou-crochet', 'boucle'] as const),
        a: nombre(v, 'a', true, d.a),
        c1: nombre(v, 'c1', true, d.c1),
        c: nombre(v, 'c', true, d.c),
        confinement,
        typeElement: choix(v, 'type_element', ['poutre', 'dalle'] as const),
        sommeAst: nombre(v, 'somme_ast', confinement, d.sommeAst),
        position: choix(v, 'position', ['angle', 'courant', 'exterieur'] as const),
        soudees: oui(v, 'soudees'),
        p: nombre(v, 'p', false, 0),
        methode: choix(v, 'methode', ['generale', 'simplifiee'] as const),
        disponible: nombreOuVide(v, 'disponible'),
        rho1: nombre(v, 'rho1', mode === 'recouvrement', d.rho1),
        aRec: nombre(v, 'a_rec', mode === 'recouvrement', d.aRec),
        phiM: nombreOuVide(v, 'phi_m'),
        phiCadre: nombre(v, 'phi_cadre', true, d.phiCadre),
        typeCadre: choix(v, 'type_cadre', ['crochet', 'coude'] as const),
        retour: nombreOuVide(v, 'retour'),
      },
    };
  } catch (e) {
    if (e instanceof ErreurDeSaisie) return { ok: false, message: e.message };
    throw e;
  }
}

export function champsDepuisModele(m: ModeleSaisie): Record<string, string> {
  const n = (x: number): string => String(x).replace('.', ',');
  const nv = (x: number | null): string => (x === null ? '' : n(x));
  const c = (x: boolean): string => (x ? 'oui' : 'non');
  return {
    mode: m.mode,
    phi: n(m.phi),
    paquet: c(m.paquet),
    nb: n(m.nb),
    verticales: c(m.verticales),
    fck: n(m.fck),
    fyk: n(m.fyk),
    sollicitation: m.sollicitation,
    adh_mode: m.adhMode,
    conditions: m.conditions,
    inclinaison: n(m.inclinaison),
    h_element: n(m.hElement),
    z_fond: n(m.zFond),
    sig_mode: m.sigMode,
    sigma: n(m.sigma),
    as_req: n(m.asReq),
    as_prov: n(m.asProv),
    forme: m.forme,
    a: n(m.a),
    c1: n(m.c1),
    c: n(m.c),
    confinement: c(m.confinement),
    type_element: m.typeElement,
    somme_ast: n(m.sommeAst),
    position: m.position,
    soudees: c(m.soudees),
    p: n(m.p),
    methode: m.methode,
    disponible: nv(m.disponible),
    rho1: n(m.rho1),
    a_rec: n(m.aRec),
    phi_m: nv(m.phiM),
    phi_cadre: n(m.phiCadre),
    type_cadre: m.typeCadre,
    retour: nv(m.retour),
  };
}

export function donneesAncrage(m: ModeleSaisie): DonneesAncrage {
  return {
    phi: m.phi,
    groupe: m.paquet ? { nb: m.nb, verticalesComprimees: m.verticales } : null,
    fck: m.fck,
    fyk: m.fyk,
    sollicitation: m.sollicitation,
    adherence:
      m.adhMode === 'declarees'
        ? { mode: 'declarees', conditions: m.conditions }
        : { mode: 'geometrie', inclinaison: m.inclinaison, hauteurElement: m.hElement, distanceAuFond: m.zFond },
    contrainte:
      m.sigMode === 'f_yd'
        ? { mode: 'f_yd' }
        : m.sigMode === 'saisie'
          ? { mode: 'saisie', sigma_sd: m.sigma }
          : { mode: 'reduite', A_s_req: m.asReq, A_s_prov: m.asProv },
    forme: m.forme,
    a: m.a,
    c1: m.c1,
    c: m.c,
    confinement: m.confinement ? { typeElement: m.typeElement, sommeAst: m.sommeAst, position: m.position } : null,
    barresTransversalesSoudees: m.soudees,
    pressionTransversale: m.p,
    methode: m.mode === 'recouvrement' ? 'generale' : m.methode,
    longueurDisponible: m.disponible,
  };
}

export function donneesRecouvrement(m: ModeleSaisie): DonneesRecouvrement {
  return { ...donneesAncrage(m), rho1: m.rho1, distanceEntreRecouvrements: m.aRec };
}
