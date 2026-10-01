import { describe, expect, it } from 'vitest';
import { DIAMETRES_COURANTS, ec2Recommande, tableauParDiametre } from '../../src/index';
import { donneesBase } from '../fixtures';

describe('tableau de synthese par diametre', () => {
  const lignes = tableauParDiametre(donneesBase({ longueurDisponible: 10 }), ec2Recommande(), 50);

  it('une ligne par diametre courant', () => {
    expect(lignes.map((l) => l.phi)).toEqual([...DIAMETRES_COURANTS]);
  });

  it('la ligne HA16 reprend le cas de reference', () => {
    const l = lignes.find((x) => x.phi === 16);
    if (l === undefined || 'erreur' in l) throw new Error('ligne absente');
    expect(l.l_b_rqd).toBeCloseTo(645.7458, 3);
    expect(l.l_0).toBeCloseTo(793.362, 2);
  });

  it('une erreur de diametre est rendue dans sa ligne sans interrompre le tableau', () => {
    const r = tableauParDiametre(donneesBase({ groupe: { nb: 3, verticalesComprimees: false } }), ec2Recommande(), 50, [16, 32]);
    expect('erreur' in r[1]).toBe(true);
    expect('erreur' in r[0]).toBe(false);
  });
});
