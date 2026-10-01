import { describe, expect, it } from 'vitest';
import { ec2Recommande, fctmDepuisFck, fcd, fyd, tractionPourAdherence, verifierProfil } from '../../src/index';

const P = ec2Recommande();

describe('materiaux', () => {
  it('f_ctm : 2,5650 MPa en C25, expression logarithmique au-dela de C50 (C60 : 4,3547)', () => {
    expect(fctmDepuisFck(25)).toBeCloseTo(2.564964, 5);
    expect(fctmDepuisFck(60)).toBeCloseTo(4.354742, 5);
  });

  it('f_ctd = alpha_ct x 0,7 f_ctm / gamma_C : 1,1970 MPa en C25', () => {
    const t = tractionPourAdherence(25, P);
    expect(t.fctd).toBeCloseTo(1.196983, 5);
    expect(t.plafonne).toBe(false);
  });

  it('f_ctk,0.05 plafonne a la valeur du C60/75 pour un C80/95', () => {
    const t80 = tractionPourAdherence(80, P);
    const t60 = tractionPourAdherence(60, P);
    expect(t80.plafonne).toBe(true);
    expect(t80.fck_retenu).toBe(60);
    expect(t80.fctd).toBeCloseTo(t60.fctd, 12);
    expect(t80.fctd).toBeCloseTo(2.032213, 5);
  });

  it('alpha_ct du profil intervient dans f_ctd', () => {
    const p = ec2Recommande();
    p.alpha_ct = { valeur: 0.8, source: 'profil fictif de test' };
    expect(tractionPourAdherence(25, p).fctd).toBeCloseTo(0.8 * 1.196983, 5);
  });

  it('f_cd et f_yd', () => {
    expect(fcd(30, P)).toBe(20);
    expect(fyd(500, P)).toBeCloseTo(434.7826, 4);
  });

  it('profil : une valeur sans source bloque', () => {
    const p = ec2Recommande();
    p.gamma_C = { valeur: 1.5, source: ' ' };
    expect(() => verifierProfil(p)).toThrow('n a pas de source');
    expect(() => verifierProfil(P)).not.toThrow();
  });

  it('refuse un f_ck nul', () => {
    expect(() => fctmDepuisFck(0)).toThrow('f_ck');
  });
});
