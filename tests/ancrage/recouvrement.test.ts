import { describe, expect, it } from 'vitest';
import { armatureDeCouture, coefficientAlpha6, ec2Recommande, longueurMinimaleRecouvrement, verifierRecouvrement } from '../../src/index';
import { CONFINEMENT_POUTRE, donneesRecouvrement } from '../fixtures';

const P = ec2Recommande();

describe('alpha_6, expression (8.10)', () => {
  it('borne a [1,0 ; 1,5]', () => {
    expect(coefficientAlpha6(20)).toBe(1);
    expect(coefficientAlpha6(50)).toBeCloseTo(Math.SQRT2, 10);
    expect(coefficientAlpha6(100)).toBe(1.5);
    expect(() => coefficientAlpha6(0)).toThrow('rho_1');
  });
});

describe('verifierRecouvrement, HA16 en C25/30, 50 % recouverts', () => {
  it('l_0 = 0,86875 x 1,41421 x 645,75 = 793,36 mm', () => {
    const r = verifierRecouvrement(donneesRecouvrement(), P);
    expect(r.alpha_6).toBeCloseTo(1.414214, 5);
    expect(r.l_0).toBeCloseTo(793.362, 2);
  });

  it('alpha_4 n intervient PAS dans l_0, meme avec barres transversales soudees', () => {
    const sans = verifierRecouvrement(donneesRecouvrement(), P);
    const avec = verifierRecouvrement(donneesRecouvrement({ barresTransversalesSoudees: true }), P);
    expect(avec.l_0).toBe(sans.l_0);
    // alors que l'ancrage, lui, en beneficie
    expect(avec.ancrage.l_bd).toBeLessThan(sans.ancrage.l_bd);
  });

  it('alpha_3 du recouvrement : Sigma A_st,min = A_s sigma_sd / f_yd, d ou lambda = 0 et alpha_3 = 1 ici', () => {
    const r = verifierRecouvrement(donneesRecouvrement({ confinement: CONFINEMENT_POUTRE }), P);
    expect(r.alpha_3.statut).toBe('calcule');
    expect(r.alpha_3.statut === 'calcule' && r.alpha_3.valeur).toBe(1);
    // l'ancrage, avec Sigma A_st,min = 0,25 A_s, obtient 0,925
    expect(r.ancrage.alphas.alpha_3.statut === 'calcule' && r.ancrage.alphas.alpha_3.valeur).toBeCloseTo(0.925, 10);
  });

  it('l_0,min = max(0,3 alpha_6 l_b,rqd ; 15 phi ; 200 mm) et sa borne gouvernante', () => {
    expect(longueurMinimaleRecouvrement(1, 100, 10)).toEqual({ valeur: 200, origine: 'plancher' });
    expect(longueurMinimaleRecouvrement(1, 100, 16)).toEqual({ valeur: 240, origine: '15phi' });
    expect(longueurMinimaleRecouvrement(1.5, 1000, 16).origine).toBe('proportionnelle');
  });

  it('verdict sur la longueur disponible du recouvrement', () => {
    expect(verifierRecouvrement(donneesRecouvrement({ longueurDisponible: 800 }), P).verdict).toBe('conforme');
    expect(verifierRecouvrement(donneesRecouvrement({ longueurDisponible: 700 }), P).verdict).toBe('non-conforme');
  });

  it('paquet de 4 barres admis dans un recouvrement', () => {
    expect(() => verifierRecouvrement(donneesRecouvrement({ phi: 12, groupe: { nb: 4, verticalesComprimees: false } }), P)).not.toThrow();
  });

  it('refuse la methode simplifiee', () => {
    expect(() => verifierRecouvrement(donneesRecouvrement({ methode: 'simplifiee' }), P)).toThrow('expression (8.10)');
  });
});

describe('armature de couture, §8.7.4', () => {
  it('phi < 20 mm : non requise specifiquement, avec motif', () => {
    const r = armatureDeCouture(16, 50, 100, 800, false);
    expect(r.requise).toBe(false);
    expect(r.motif).toContain('< 20 mm');
  });

  it('rho_1 < 25 % : non requise specifiquement', () => {
    expect(armatureDeCouture(25, 20, 100, 1000, false).requise).toBe(false);
  });

  it('phi >= 20 et rho_1 >= 25 % : Sigma A_st = A_s d une barre, moitie dans chaque tiers extreme', () => {
    const r = armatureDeCouture(20, 50, 300, 900, false);
    expect(r.requise).toBe(true);
    expect(r.A_st).toBeCloseTo(314.159, 2);
    expect(r.repartition).toContain('300 mm');
    expect(r.repartition).not.toContain('cadres ou U');
  });

  it('plus de 50 % et a <= 10 phi : cadres ou U ; en compression, barre au-dela des extremites', () => {
    const r = armatureDeCouture(20, 100, 150, 900, true);
    expect(r.repartition).toContain('cadres ou U');
    expect(r.repartition).toContain('4 phi = 80 mm');
  });
});
