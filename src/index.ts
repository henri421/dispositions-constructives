/**
 * dispositions-constructives — noyau de calcul.
 *
 * Ancrages et recouvrements des armatures de beton arme, EN 1992-1-1 §8.
 */

export * from './domaines/resultat';
export { verifierProfil, type ProfilEc2, type ValeurSourcee } from './norms/profil';
export { ec2Recommande } from './norms/ec2-recommande';
export { fctmDepuisFck, fctk005DepuisFctm, tractionPourAdherence, fcd, fyd, FCK_PLAFOND_ADHERENCE } from './materiaux/materiaux';
export { conditionsAdherence, eta1, eta2, contrainteAdherence } from './ancrage/adherence';
export { enrobageEquivalent, coefficientK, coefficientsAlpha, produitBorne, valeurDe, aireBarre } from './ancrage/coefficients';
export {
  verifierAncrage,
  diametreEquivalent,
  longueurDeReference,
  longueurMinimale,
  contrainteOrigine,
  PHI_N_MAX,
} from './ancrage/ancrage';
export { verifierRecouvrement, coefficientAlpha6, longueurMinimaleRecouvrement, armatureDeCouture } from './ancrage/recouvrement';
export {
  mandrinMinimal,
  verifierMandrin,
  verifierCadre,
  type AncrageCadre,
  type VerificationCadre,
  type VerificationMandrin,
} from './ancrage/cadres-et-mandrins';
export { tableauParDiametre, DIAMETRES_COURANTS, type LigneSynthese } from './domaines/synthese';
