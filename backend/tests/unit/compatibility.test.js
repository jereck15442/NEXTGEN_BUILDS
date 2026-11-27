import { describe, expect, it } from 'vitest';
import { checkCompatibility } from '../../src/services/compatibility.service.js';

const product = (specifications) => ({ specifications });

describe('compatibility checker', () => {
  it('accepts matching sockets and ignores case', () => {
    const result = checkCompatibility({
      CPU: product({ socket: 'AM5', powerWatts: 65 }),
      motherboard: product({ socket: 'am5', memoryGenerations: ['DDR5'], formFactor: 'ATX' })
    });
    expect(result.compatible).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it('reports socket, RAM, form factor, and PSU problems together', () => {
    const result = checkCompatibility({
      CPU: product({ socket: 'LGA1700', powerWatts: 300 }),
      motherboard: product({ socket: 'AM5', memoryGenerations: ['DDR5'], formFactor: 'ATX' }),
      RAM: product({ memoryGeneration: 'DDR4' }),
      case: product({ supportedFormFactors: ['Mini ITX'] }),
      PSU: product({ wattage: 300 })
    });

    const codes = result.warnings.map((warning) => warning.code);
    expect(result.compatible).toBe(false);
    expect(codes).toEqual(expect.arrayContaining([
      'SOCKET_MISMATCH',
      'RAM_INCOMPATIBLE',
      'FORM_FACTOR_MISMATCH',
      'INSUFFICIENT_PSU'
    ]));
  });

  it('warns when required specifications are missing', () => {
    const result = checkCompatibility({
      CPU: product({}),
      motherboard: product({}),
      RAM: product({}),
      PSU: product({})
    });
    const codes = result.warnings.map((warning) => warning.code);
    expect(codes).toEqual(expect.arrayContaining(['SOCKET_UNKNOWN', 'RAM_UNKNOWN', 'PSU_UNKNOWN']));
  });
});
