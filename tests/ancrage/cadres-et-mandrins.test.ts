import { describe, expect, it } from 'vitest';
import { ec2Recommande, mandrinMinimal, verifierCadre, verifierMandrin } from '../../src/index';

const P = ec2Recommande();

describe('mandrins, §8.3', () => {
  it('tableau 8.1N : 4 phi jusqu a 16 mm, 7 phi au-dela', () => {
    expect(mandrinMinimal(16, P)).toBe(64);
    expect(mandrinMinimal(20, P)).toBe(140);
  });

  it('expression (8.1) : F_bt = 50 kN, a_b = 40 mm, phi 16, C30 -> 140,6 mm', () => {
    // 50 000 x (1/40 + 1/32) / 20 = 140,625 mm
    const r = verifierMandrin(16, P, 120, { F_bt: 50, a_b: 40, fck: 30 });
    expect(r.phi_m_min_ecrasement).toBeCloseTo(140.625, 6);
    expect(r.phi_m_requis).toBeCloseTo(140.625, 6);
    expect(r.conforme).toBe(false);
  });

  it('f_ck plafonne a 55 MPa dans (8.1)', () => {
    const r70 = verifierMandrin(16, P, null, { F_bt: 50, a_b: 40, fck: 70 });
    const r55 = verifierMandrin(16, P, null, { F_bt: 50, a_b: 40, fck: 55 });
    expect(r70.phi_m_min_ecrasement).toBe(r55.phi_m_min_ecrasement);
  });

  it('sans mandrin saisi : constat du minimum', () => {
    const r = verifierMandrin(12, P, null, null);
    expect(r.conforme).toBeNull();
    expect(r.phi_m_requis).toBe(48);
  });
});

describe('cadres, §8.5', () => {
  it('crochet : retour >= max(5 phi ; 50 mm) ; coude : max(10 phi ; 70 mm)', () => {
    expect(verifierCadre(8, 'crochet', P, null).retourMin).toBe(50);
    expect(verifierCadre(12, 'crochet', P, null).retourMin).toBe(60);
    expect(verifierCadre(6, 'coude', P, null).retourMin).toBe(70);
    expect(verifierCadre(8, 'coude', P, null).retourMin).toBe(80);
  });

  it('verdict sur le retour saisi', () => {
    expect(verifierCadre(8, 'crochet', P, 60).conforme).toBe(true);
    expect(verifierCadre(8, 'coude', P, 60).conforme).toBe(false);
  });
});
