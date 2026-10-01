import { describe, expect, it } from 'vitest';
import { conditionsAdherence, contrainteAdherence, eta1, eta2 } from '../../src/index';

const geo = (inclinaison: number, hauteurElement: number, distanceAuFond: number) =>
  conditionsAdherence({ mode: 'geometrie', inclinaison, hauteurElement, distanceAuFond }).conditions;

describe('conditions d adherence, figure 8.2', () => {
  it('declarees : reprises telles quelles', () => {
    expect(conditionsAdherence({ mode: 'declarees', conditions: 'mauvaises' }).conditions).toBe('mauvaises');
  });

  it('barre inclinee d au moins 45 degres : bonnes quelle que soit la hauteur', () => {
    expect(geo(60, 1000, 950)).toBe('bonnes');
  });

  it('h <= 250 mm : bonnes', () => {
    expect(geo(0, 200, 170)).toBe('bonnes');
  });

  it('250 < h <= 600 mm : bonnes a 250 mm du fond au plus, mauvaises au-dela', () => {
    expect(geo(0, 500, 200)).toBe('bonnes');
    expect(geo(0, 500, 250)).toBe('bonnes');
    expect(geo(0, 500, 300)).toBe('mauvaises');
  });

  it('h > 600 mm : barre superieure de poutre haute en mauvaises conditions', () => {
    // poutre de 700 mm, acier superieur a 50 mm du dessus
    expect(geo(0, 700, 650)).toBe('mauvaises');
    // barre a 300 mm du dessus : bonnes
    expect(geo(0, 700, 400)).toBe('bonnes');
  });

  it('refuse une barre hors de l element', () => {
    expect(() => geo(0, 500, 600)).toThrow('depasse');
  });
});

describe('eta_1, eta_2, f_bd', () => {
  it('eta_1 = 1 en bonnes conditions, 0,7 en mauvaises', () => {
    expect(eta1('bonnes')).toBe(1);
    expect(eta1('mauvaises')).toBe(0.7);
  });

  it('eta_2 bascule a phi = 32 mm exactement : 1,0 a 32, (132 - 40)/100 = 0,92 a 40', () => {
    expect(eta2(32)).toBe(1);
    expect(eta2(32.0001)).toBeLessThan(1);
    expect(eta2(40)).toBeCloseTo(0.92, 10);
  });

  it('f_bd = 2,25 eta_1 eta_2 f_ctd', () => {
    expect(contrainteAdherence(1, 1, 1.196983)).toBeCloseTo(2.693212, 5);
    expect(contrainteAdherence(0.7, 1, 1.196983)).toBeCloseTo(1.885248, 5);
  });
});
