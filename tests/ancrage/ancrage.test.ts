import { describe, expect, it } from 'vitest';
import { contrainteOrigine, diametreEquivalent, ec2Recommande, longueurMinimale, verifierAncrage } from '../../src/index';
import { CONFINEMENT_POUTRE, donneesBase } from '../fixtures';

const P = ec2Recommande();

describe('verifierAncrage, HA16 en C25/30', () => {
  it('l_b,rqd = 645,75 mm ; f_bd = 2,6932 MPa', () => {
    const r = verifierAncrage(donneesBase(), P);
    expect(r.f_bd).toBeCloseTo(2.693212, 5);
    expect(r.l_b_rqd).toBeCloseTo(645.7458, 3);
    expect(r.origineSigma).toBe('f_yd');
  });

  it('sans confinement : l_bd = 0,86875 x 645,75 = 560,99 mm, verdict de constat', () => {
    const r = verifierAncrage(donneesBase(), P);
    expect(r.l_bd).toBeCloseTo(560.9917, 3);
    expect(r.verdict).toBe('longueur-requise');
    expect(r.alphas.alpha_3.statut).toBe('non-applicable');
  });

  it('confinement de poutre, quatre brins HA8 dans l angle : lambda = 0,75, alpha_3 = 0,925, l_bd = 518,92 mm', () => {
    const r = verifierAncrage(donneesBase({ confinement: CONFINEMENT_POUTRE }), P);
    expect(r.lambda).toBeCloseTo(0.75, 10);
    expect(r.l_bd).toBeCloseTo(518.9173, 3);
  });

  it('dalle : Sigma A_st,min = 0, lambda = 1', () => {
    const r = verifierAncrage(donneesBase({ confinement: { ...CONFINEMENT_POUTRE, typeElement: 'dalle' } }), P);
    expect(r.lambda).toBeCloseTo(1, 10);
  });

  it('borne 0,7 activee : l_bd = 0,7 x 645,75 = 452,02 mm, et le resultat le dit', () => {
    const r = verifierAncrage(
      donneesBase({ a: 120, c1: 60, c: 60, confinement: { ...CONFINEMENT_POUTRE, sommeAst: 1000 }, pressionTransversale: 10 }),
      P
    );
    expect(r.borneProduitActivee).toBe(true);
    expect(r.l_bd).toBeCloseTo(452.0221, 3);
  });

  it('barre superieure de poutre haute : eta_1 = 0,7, l_b,rqd = 922,49 mm', () => {
    const r = verifierAncrage(
      donneesBase({ adherence: { mode: 'geometrie', inclinaison: 0, hauteurElement: 700, distanceAuFond: 650 } }),
      P
    );
    expect(r.conditionsAdherence).toBe('mauvaises');
    expect(r.eta_1).toBe(0.7);
    expect(r.l_b_rqd).toBeCloseTo(922.494, 2);
  });

  it('compression : alpha_1 a alpha_3 = 1, alpha_5 non applicable, l_b,min = 0,6 l_b,rqd', () => {
    const r = verifierAncrage(donneesBase({ sollicitation: 'compression', pressionTransversale: 5 }), P);
    expect(r.alphas.alpha_5.statut).toBe('non-applicable');
    expect(r.l_bd).toBeCloseTo(645.7458, 3);
    expect(r.l_b_min).toBeCloseTo(387.4475, 3);
  });

  it('compression avec barres soudees : alpha_4 = 0,7 s applique', () => {
    const r = verifierAncrage(donneesBase({ sollicitation: 'compression', barresTransversalesSoudees: true }), P);
    expect(r.l_bd).toBeCloseTo(452.0221, 3);
  });

  it('verdict avec longueur disponible', () => {
    expect(verifierAncrage(donneesBase({ longueurDisponible: 600 }), P).verdict).toBe('conforme');
    expect(verifierAncrage(donneesBase({ longueurDisponible: 500 }), P).verdict).toBe('non-conforme');
  });

  it('C80/95 : plafond C60/75, avertissement', () => {
    const r = verifierAncrage(donneesBase({ fck: 80 }), P);
    expect(r.fckPlafonne).toBe(true);
    expect(r.avertissements.join(' ')).toContain('C60/75');
  });
});

describe('methode simplifiee, §8.4.4(2)', () => {
  it('crochet, c_d = 60 > 3 phi : l_b,eq = 0,7 l_b,rqd = 452,02 mm', () => {
    const r = verifierAncrage(donneesBase({ forme: 'coude-ou-crochet', a: 120, c1: 60, methode: 'simplifiee' }), P);
    expect(r.l_bd).toBeCloseTo(452.0221, 3);
  });

  it('crochet, c_d = 30 : alpha_1 = 1, l_b,eq = l_b,rqd', () => {
    const r = verifierAncrage(donneesBase({ forme: 'coude-ou-crochet', methode: 'simplifiee' }), P);
    expect(r.l_bd).toBeCloseTo(645.7458, 3);
  });

  it('refusee en compression et pour une barre droite sans soudure', () => {
    expect(() => verifierAncrage(donneesBase({ methode: 'simplifiee', sollicitation: 'compression' }), P)).toThrow('traction');
    expect(() => verifierAncrage(donneesBase({ methode: 'simplifiee' }), P)).toThrow('methode generale');
  });
});

describe('l_b,min : chacune des trois bornes gouverne tour a tour', () => {
  it('proportionnelle, 10 phi, plancher', () => {
    expect(longueurMinimale(645.7458, 16, 'traction')).toEqual({ valeur: 0.3 * 645.7458, origine: 'proportionnelle' });
    expect(longueurMinimale(148.5, 16, 'traction')).toEqual({ valeur: 160, origine: '10phi' });
    expect(longueurMinimale(74.3, 8, 'traction')).toEqual({ valeur: 100, origine: 'plancher' });
  });

  it('dans verifierAncrage, origineLbMin le dit', () => {
    const r = verifierAncrage(donneesBase({ phi: 8, contrainte: { mode: 'saisie', sigma_sd: 100 } }), P);
    expect(r.origineLbMin).toBe('plancher');
    expect(r.l_bd).toBe(100);
  });
});

describe('contrainte sigma_sd, trois modes', () => {
  it('f_yd par defaut, saisie, reduite', () => {
    expect(contrainteOrigine({ mode: 'f_yd' }, 434.78).origine).toBe('f_yd');
    expect(contrainteOrigine({ mode: 'saisie', sigma_sd: 300 }, 434.78)).toEqual({ sigma_sd: 300, origine: 'saisie' });
    const r = contrainteOrigine({ mode: 'reduite', A_s_req: 150, A_s_prov: 200 }, 434.78);
    expect(r.sigma_sd).toBeCloseTo(326.085, 3);
    expect(r.origine).toBe('f_yd-reduit');
  });

  it('refus : sigma_sd > f_yd, A_s,req > A_s,prov', () => {
    expect(() => contrainteOrigine({ mode: 'saisie', sigma_sd: 500 }, 434.78)).toThrow('depasse f_yd');
    expect(() => contrainteOrigine({ mode: 'reduite', A_s_req: 250, A_s_prov: 200 }, 434.78)).toThrow('A_s,req');
  });
});

describe('paquets de barres, §8.9', () => {
  it('phi_n = phi sqrt(n_b)', () => {
    expect(diametreEquivalent(20, { nb: 2, verticalesComprimees: false }, false)).toBeCloseTo(28.2843, 4);
    expect(diametreEquivalent(16, null, false)).toBe(16);
  });

  it('phi_n > 55 mm leve', () => {
    expect(() => diametreEquivalent(32, { nb: 3, verticalesComprimees: false }, false)).toThrow('55 mm');
  });

  it('n_b limite a 3, ou 4 pour des barres verticales comprimees et les recouvrements', () => {
    expect(() => diametreEquivalent(12, { nb: 4, verticalesComprimees: false }, false)).toThrow('limite a 3');
    expect(diametreEquivalent(12, { nb: 4, verticalesComprimees: true }, false)).toBe(24);
    expect(diametreEquivalent(12, { nb: 4, verticalesComprimees: false }, true)).toBe(24);
  });

  it('dans verifierAncrage, phi_n remplace phi et un avertissement le signale', () => {
    const r = verifierAncrage(donneesBase({ phi: 20, groupe: { nb: 2, verticalesComprimees: false } }), P);
    expect(r.phi_calcul).toBeCloseTo(28.2843, 4);
    expect(r.avertissements.join(' ')).toContain('phi_n');
  });
});
