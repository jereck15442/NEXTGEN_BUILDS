import { productRepository } from '../repositories/product.repository.js';
import { conflict } from '../utils/errors.js';

export function normalize(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

export function checkCompatibility(products) {
  const warnings = [];
  const cpu = products.CPU;
  const motherboard = products.motherboard;
  const ram = products.RAM;
  const pcCase = products.case;
  const psu = products.PSU;
  const gpu = products.GPU;

  if (cpu && motherboard) {
    const cpuSocket = cpu.specifications?.socket;
    const boardSocket = motherboard.specifications?.socket;
    if (!cpuSocket || !boardSocket) warnings.push({ code: 'SOCKET_UNKNOWN', message: 'CPU or motherboard socket is not recorded.' });
    else if (normalize(cpuSocket) !== normalize(boardSocket)) warnings.push({ code: 'SOCKET_MISMATCH', message: 'CPU and motherboard sockets do not match.' });
  }

  if (ram && motherboard) {
    const ramType = normalize(ram.specifications?.memoryGeneration || ram.specifications?.type);
    const supported = motherboard.specifications?.memoryGenerations || motherboard.specifications?.supportedMemory || [];
    if (!ramType) warnings.push({ code: 'RAM_UNKNOWN', message: 'RAM memory generation is not recorded.' });
    else if (!Array.isArray(supported) || supported.length === 0) warnings.push({ code: 'RAM_SUPPORT_UNKNOWN', message: 'Motherboard memory support is not recorded.' });
    else if (!supported.map(normalize).includes(normalize(ramType))) warnings.push({ code: 'RAM_INCOMPATIBLE', message: 'RAM generation is not supported by the motherboard.' });
  }

  if (motherboard && pcCase) {
    const boardFactor = normalize(motherboard.specifications?.formFactor);
    const supported = pcCase.specifications?.supportedFormFactors || [];
    if (!boardFactor) warnings.push({ code: 'FORM_FACTOR_UNKNOWN', message: 'Motherboard form factor is not recorded.' });
    else if (!Array.isArray(supported) || supported.length === 0) warnings.push({ code: 'CASE_SUPPORT_UNKNOWN', message: 'Case supported form factors are not recorded.' });
    else if (!supported.map(normalize).includes(normalize(boardFactor))) warnings.push({ code: 'FORM_FACTOR_MISMATCH', message: 'Motherboard form factor is not supported by the case.' });
  }

  if (psu) {
    const wattages = [cpu, motherboard, gpu, ram]
      .filter(Boolean)
      .map((p) => Number(p.specifications?.powerWatts || p.specifications?.tdp || 0));
    const estimate = wattages.reduce((sum, value) => sum + value, 0) + 100;
    const capacity = Number(psu.specifications?.wattage || psu.specifications?.powerWatts || 0);
    if (!capacity) warnings.push({ code: 'PSU_UNKNOWN', message: 'PSU capacity is not recorded.' });
    else if (capacity < estimate) warnings.push({ code: 'INSUFFICIENT_PSU', message: `Estimated requirement is ${estimate}W; selected PSU provides ${capacity}W.` });
  }

  return { compatible: warnings.length === 0, warnings };
}

export async function resolveBuildComponents(componentIds) {
  const entries = Object.entries(componentIds || {});
  const products = Object.create(null);
  for (const [category, id] of entries) {
    if (!id) continue;
    const product = await productRepository.findActiveById(id);
    if (!product) throw conflict(`Selected ${category} is unavailable`);
    products[category] = product;
  }
  return products;
}
