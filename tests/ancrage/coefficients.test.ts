import { describe, expect, it } from 'vitest';
import { coefficientK, coefficientsAlpha, enrobageEquivalent, produitBorne, valeurDe } from '../../src/index';

describe('enrobage equivalent c_d, figure 8.3', () => {
  it('trois configurations, trois expressions', () => {
    // a = 80, c_1 = 35, c = 25
    expect(enrobageEquivalent('droite', 80, 35, 25)).toBe(25);
    expect(enrobageEquivalent('coude-ou-crochet', 80, 35, 25)).toBe(35);
    expect(enrobageEquivalent('boucle', 80, 35, 25)).toBe(25);
    expect(enrobageEquivalent('coude-ou-crochet', 50, 35, 25)).toBe(25);
  });
});

describe('K, figure 8.4', () => {
  it('0,1 dans l angle, 0,05 le long d un brin, 0 a l exterieur', () => {
    expect(coefficientK('angle')).toBe(0.1);
    expect(coefficientK('courant')).toBe(0.05);
    expect(coefficientK('exterieur')).toBe(0);
  });
});

const base = { forme: 'droite', phi: 16, c_d: 30, confinement: null, soudees: false, p: 0 } as const;

describe('coefficients alpha, tableau 8.2', () => {
  it('traction, barre droite : alpha_2 = 1 - 0,15 (30 - 16) / 16 = 0,86875', () => {
    const a = coefficientsAlpha({ ...base, sollicitation: 'traction' });
    expect(valeurDe(a.alpha_2)).toBeCloseTo(0.86875, 10);
    expect(a.alpha_1.statut).toBe('fixe-par-la-norme');
  });

  it('traction, crochet : alpha_1 = 0,7 si c_d > 3 phi, alpha_2 sur (c_d - 3 phi)', () => {
    const a = coefficientsAlpha({ ...base, sollicitation: 'traction', forme: 'coude-ou-crochet', c_d: 60 });
    expect(valeurDe(a.alpha_1)).toBe(0.7);
    // 1 - 0,15 (60 - 48) / 16 = 0,8875
    expect(valeurDe(a.alpha_2)).toBeCloseTo(0.8875, 10);
    const b = coefficientsAlpha({ ...base, sollicitation: 'traction', forme: 'coude-ou-crochet', c_d: 40 });
    expect(valeurDe(b.alpha_1)).toBe(1);
  });

  it('alpha_3 = 1 - K lambda, borne', () => {
    const a = coefficientsAlpha({ ...base, sollicitation: 'traction', confinement: { lambda: 0.75, K: 0.1 } });
    expect(valeurDe(a.alpha_3)).toBeCloseTo(0.925, 10);
    const b = coefficientsAlpha({ ...base, sollicitation: 'traction', confinement: { lambda: 5, K: 0.1 } });
    expect(valeurDe(b.alpha_3)).toBe(0.7);
  });

  it('alpha_5 = 1 - 0,04 p, borne', () => {
    expect(valeurDe(coefficientsAlpha({ ...base, sollicitation: 'traction', p: 5 }).alpha_5)).toBeCloseTo(0.8, 10);
    expect(valeurDe(coefficientsAlpha({ ...base, sollicitation: 'traction', p: 10 }).alpha_5)).toBe(0.7);
  });

  it('en COMPRESSION : alpha_1, alpha_2, alpha_3 fixes a 1,0 ; alpha_5 non applicable, pas egal a 1', () => {
    const a = coefficientsAlpha({ ...base, sollicitation: 'compression', c_d: 80, confinement: { lambda: 2, K: 0.1 }, p: 5 });
    for (const nom of ['alpha_1', 'alpha_2', 'alpha_3'] as const) {
      expect(a[nom]).toEqual({ statut: 'fixe-par-la-norme', valeur: 1, motif: 'barre comprimee : 1,0 (tableau 8.2)' });
    }
    expect(a.alpha_5.statut).toBe('non-applicable');
  });

  it('alpha_4 = 0,7 en traction comme en compression', () => {
    expect(valeurDe(coefficientsAlpha({ ...base, sollicitation: 'compression', soudees: true }).alpha_4)).toBe(0.7);
    expect(valeurDe(coefficientsAlpha({ ...base, sollicitation: 'traction', soudees: true }).alpha_4)).toBe(0.7);
    expect(coefficientsAlpha({ ...base, sollicitation: 'traction' }).alpha_4.statut).toBe('non-applicable');
  });
});

describe('borne alpha_2 alpha_3 alpha_5 >= 0,7, expression (8.5)', () => {
  it('s active et le dit', () => {
    const a = coefficientsAlpha({ ...base, sollicitation: 'traction', c_d: 60, confinement: { lambda: 4, K: 0.1 }, p: 10 });
    const r = produitBorne(a);
    expect(r.brut).toBeCloseTo(0.343, 10);
    expect(r.retenu).toBe(0.7);
    expect(r.activee).toBe(true);
  });

  it('ne s active pas au-dessus de 0,7', () => {
    const r = produitBorne(coefficientsAlpha({ ...base, sollicitation: 'traction' }));
    expect(r.activee).toBe(false);
    expect(r.retenu).toBeCloseTo(0.86875, 10);
  });
});
