/**
 * Types d'entree et de sortie des ancrages et recouvrements, EN 1992-1-1 §8.
 *
 * Unites : longueurs en mm, aires en mm2, contraintes en MPa, efforts en kN,
 * angles en degres.
 */

export type Sollicitation = 'traction' | 'compression';
export type ConditionsAdherence = 'bonnes' | 'mauvaises';

/** Extremite de la barre, figure 8.3 : elle change la definition de c_d et de alpha_1, alpha_2. */
export type FormeExtremite = 'droite' | 'coude-ou-crochet' | 'boucle';

/**
 * Conditions d'adherence : JAMAIS supposees. Soit declarees, soit deduites
 * de la position de coulage (figure 8.2). Prendre « bonnes » par defaut
 * serait non conservatif pour le cas le plus courant, les aciers superieurs
 * de poutre.
 */
export type DonneesAdherence =
  | { mode: 'declarees'; conditions: ConditionsAdherence }
  | {
      mode: 'geometrie';
      /** Inclinaison de la barre sur l'horizontale pendant le betonnage (degres). */
      inclinaison: number;
      /** Hauteur totale h de l'element coule (mm). */
      hauteurElement: number;
      /** Distance de la barre au fond du coffrage (mm). */
      distanceAuFond: number;
    };

/**
 * Contrainte sigma_sd a l'origine de l'ancrage, §8.4.3(2).
 * - 'f_yd' : conservatif, mode par defaut ;
 * - 'saisie' : contrainte reelle connue ;
 * - 'reduite' : f_yd A_s,req / A_s,prov, usage courant, qui suppose la
 *   section requise connue.
 */
export type DonneesContrainte =
  | { mode: 'f_yd' }
  | { mode: 'saisie'; sigma_sd: number }
  | { mode: 'reduite'; A_s_req: number; A_s_prov: number };

/** Position des armatures transversales par rapport a la barre ancree, figure 8.4. */
export type PositionTransversale = 'angle' | 'courant' | 'exterieur';

export interface DonneesConfinement {
  /** Element : la poutre impose Sigma A_st,min = 0,25 A_s, la dalle 0 (tableau 8.2). */
  typeElement: 'poutre' | 'dalle';
  /** Section totale des armatures transversales le long de l_bd (mm2). */
  sommeAst: number;
  position: PositionTransversale;
}

export interface DonneesGroupe {
  /** Nombre de barres du paquet n_b. */
  nb: number;
  /** Barres verticales comprimees : n_b jusqu'a 4 (§8.9.1(2)). */
  verticalesComprimees: boolean;
}

export interface DonneesAncrage {
  /** Diametre de la barre (mm). */
  phi: number;
  /** Paquet de barres, §8.9 ; null pour une barre isolee. */
  groupe: DonneesGroupe | null;
  /** Resistance caracteristique du beton (MPa). */
  fck: number;
  /** Limite d'elasticite caracteristique de l'acier (MPa). */
  fyk: number;
  sollicitation: Sollicitation;
  adherence: DonneesAdherence;
  contrainte: DonneesContrainte;
  forme: FormeExtremite;
  /** Distance libre entre barres adjacentes a (mm), figure 8.3. */
  a: number;
  /** Enrobage lateral c_1 (mm), figure 8.3. */
  c1: number;
  /** Enrobage de fond c (mm), figure 8.3. */
  c: number;
  /** Armatures transversales non soudees ; null si aucune n'est prise en compte. */
  confinement: DonneesConfinement | null;
  /** Barres transversales soudees conformes a la figure 8.1 e). */
  barresTransversalesSoudees: boolean;
  /** Pression transversale p a l'ELU le long de l_bd (MPa) ; 0 si aucune. */
  pressionTransversale: number;
  /** Methode generale §8.4.4(1), ou longueur equivalente simplifiee §8.4.4(2). */
  methode: 'generale' | 'simplifiee';
  /** Longueur disponible (mm) pour conclure ; null pour seulement constater la longueur requise. */
  longueurDisponible: number | null;
}

export interface DonneesRecouvrement extends DonneesAncrage {
  /** Pourcentage de barres recouvertes dans une meme section rho_1 (%), §8.7.3(1). */
  rho1: number;
  /** Distance libre entre recouvrements adjacents (mm), §8.7.4.1(3). */
  distanceEntreRecouvrements: number;
}

/**
 * Coeur de la tracabilite : un coefficient calcule, fixe par le tableau,
 * ou sans objet. La note dit « alpha_5 non applicable, barre comprimee » au
 * lieu d'afficher un 1,0 muet.
 */
export type OrigineCoefficient =
  | { statut: 'calcule'; valeur: number; detail: string }
  | { statut: 'fixe-par-la-norme'; valeur: number; motif: string }
  | { statut: 'non-applicable'; motif: string };

export type NomAlpha = 'alpha_1' | 'alpha_2' | 'alpha_3' | 'alpha_4' | 'alpha_5';

export type VerdictAncrage = 'conforme' | 'non-conforme' | 'longueur-requise';

export interface ResultatAncrage {
  verdict: VerdictAncrage;
  motif: string;
  sollicitation: Sollicitation;
  methode: 'generale' | 'simplifiee';
  conditionsAdherence: ConditionsAdherence;
  motifAdherence: string;
  /** Diametre de calcul : phi, ou phi_n pour un paquet (mm). */
  phi_calcul: number;
  origineSigma: 'saisie' | 'f_yd' | 'f_yd-reduit';
  fck_retenu: number;
  fckPlafonne: boolean;
  fctd: number;
  eta_1: number;
  eta_2: number;
  f_bd: number;
  f_yd: number;
  sigma_sd: number;
  l_b_rqd: number;
  c_d: number;
  /** Lambda du confinement, null sans armature transversale prise en compte. */
  lambda: number | null;
  K: number | null;
  alphas: Record<NomAlpha, OrigineCoefficient>;
  /** Produit alpha_2 alpha_3 alpha_5 avant borne. */
  produit235: number;
  /** true si la borne 0,7 sur alpha_2 alpha_3 alpha_5 a ete activee (§8.4.4(1), expression 8.5). */
  borneProduitActivee: boolean;
  /** Longueur avant plancher : produit des alphas x l_b,rqd, ou l_b,eq (mm). */
  l_calcul: number;
  l_b_min: number;
  origineLbMin: 'proportionnelle' | '10phi' | 'plancher';
  /** Longueur d'ancrage de calcul retenue (mm). */
  l_bd: number;
  avertissements: string[];
}

export interface ResultatRecouvrement {
  verdict: VerdictAncrage;
  motif: string;
  ancrage: ResultatAncrage;
  rho1: number;
  alpha_6: number;
  /** alpha_3 recalcule avec Sigma A_st,min = A_s sigma_sd / f_yd (§8.7.3(1)). */
  alpha_3: OrigineCoefficient;
  produit235: number;
  borneProduitActivee: boolean;
  l_calcul: number;
  l_0_min: number;
  origineL0Min: 'proportionnelle' | '15phi' | 'plancher';
  l_0: number;
  armatureDeCouture: { requise: boolean; A_st: number; repartition: string; motif: string };
}
