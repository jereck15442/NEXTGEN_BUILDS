import { describe, expect, it } from 'vitest';
import {
  calculateMinimumBudget,
  normalizeComponents,
  parseJson,
  requiredCategoriesFor,
  selectDeterministic,
  validateAiSelection
} from '../../src/services/advisor.service.js';

const products = [
  {
    _id: 'cpu',
    name: 'AMD Ryzen 5 7600',
    category: 'CPU',
    price: 12995,
    stock: 5,
    specifications: { socket: 'AM5', powerWatts: 65 }
  },
  {
    _id: 'motherboard',
    name: 'MSI B650 Tomahawk',
    category: 'motherboard',
    price: 11995,
    stock: 5,
    specifications: { socket: 'AM5', memoryGenerations: ['DDR5'], formFactor: 'ATX' }
  },
  {
    _id: 'gpu',
    name: 'NVIDIA GeForce RTX 4060',
    category: 'GPU',
    price: 18995,
    stock: 5,
    specifications: { powerWatts: 115 }
  },
  {
    _id: 'ram',
    name: 'Corsair Vengeance 32GB DDR5',
    category: 'RAM',
    price: 4495,
    stock: 5,
    specifications: { memoryGeneration: 'DDR5', powerWatts: 10 }
  },
  {
    _id: 'storage',
    name: 'Samsung 990 EVO 1TB',
    category: 'storage',
    price: 4995,
    stock: 5,
    specifications: { powerWatts: 8 }
  },
  {
    _id: 'psu',
    name: 'Corsair RM750e 750W',
    category: 'PSU',
    price: 5795,
    stock: 5,
    specifications: { wattage: 750 }
  },
  {
    _id: 'case',
    name: 'Fractal Meshify 2 Compact',
    category: 'case',
    price: 7495,
    stock: 5,
    specifications: { supportedFormFactors: ['ATX'] }
  }
];

const allComponents = Object.fromEntries(products.map((product) => [product.category, product._id]));
const fullBuildTotal = products.reduce((sum, product) => sum + product.price, 0);

function totalOf(selected) {
  return Object.values(selected).reduce((sum, product) => sum + product.price, 0);
}

describe('advisor category rules', () => {
  it('requires a GPU for gaming and video editing', () => {
    expect(requiredCategoriesFor('gaming')).toContain('GPU');
    expect(requiredCategoriesFor('video-editing')).toContain('GPU');
  });

  it('treats a GPU as optional for programming and office work', () => {
    expect(requiredCategoriesFor('programming')).not.toContain('GPU');
    expect(requiredCategoriesFor('office-work')).not.toContain('GPU');
  });
});

describe('advisor minimum budget', () => {
  it('sums the cheapest required part in every category', () => {
    const result = calculateMinimumBudget(products, requiredCategoriesFor('gaming'));

    expect(result.minimumBudget).toBe(fullBuildTotal);
    expect(result.unavailableCategories).toEqual([]);
  });

  it('reports categories that have no in-stock product', () => {
    const withoutGpu = products.filter((product) => product.category !== 'GPU');
    const result = calculateMinimumBudget(withoutGpu, requiredCategoriesFor('gaming'));

    expect(result.unavailableCategories).toEqual(['GPU']);
  });
});

describe('advisor deterministic selection', () => {
  it('returns a complete build when the budget covers every required part', () => {
    const result = selectDeterministic({ products, budget: 70000, usage: 'gaming' });

    expect(result.partial).toBe(false);
    expect(result.omittedCategories).toEqual([]);
    expect(Object.keys(result.selected)).toHaveLength(products.length);
    expect(totalOf(result.selected)).toBeLessThanOrEqual(70000);
  });

  it('returns a partial build with the minimum budget when the budget is too low', () => {
    const result = selectDeterministic({ products, budget: 50000, usage: 'gaming' });

    expect(result.partial).toBe(true);
    expect(result.minimumBudget).toBe(fullBuildTotal);
    expect(result.omittedCategories).toEqual(expect.arrayContaining(['storage', 'PSU', 'case']));
    expect(totalOf(result.selected)).toBeLessThanOrEqual(50000);
  });

  it('never selects more than the budget', () => {
    for (const budget of [10000, 20000, 30000, 50000, 66765]) {
      const result = selectDeterministic({ products, budget, usage: 'gaming' });
      expect(totalOf(result.selected)).toBeLessThanOrEqual(budget);
    }
  });
});

describe('advisor AI validation', () => {
  it('accepts a complete, compatible selection inside the budget', () => {
    const result = validateAiSelection({
      parsed: { components: allComponents, explanation: 'Test build' },
      candidates: products,
      budget: 70000,
      required: requiredCategoriesFor('gaming')
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.total).toBe(fullBuildTotal);
  });

  it('accepts a component array with category and productId pairs', () => {
    const components = products.map((product) => ({
      category: product.category,
      productId: product._id
    }));

    const result = validateAiSelection({
      parsed: { components, explanation: 'Array build' },
      candidates: products,
      budget: 70000,
      required: requiredCategoriesFor('gaming')
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(Object.keys(result.selected)).toHaveLength(products.length);
  });

  it('repairs a response that packs several categories into one string', () => {
    const packed = {
      CPU: 'cpu',
      motherboard: 'motherboard',
      storage: `storage RAM: ram GPU: gpu PSU: psu case: case`
    };

    const result = validateAiSelection({
      parsed: { components: packed },
      candidates: products,
      budget: 70000,
      required: requiredCategoriesFor('gaming')
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.total).toBe(fullBuildTotal);
  });

  it('keeps the leading id when a packed string starts with the id', () => {
    const entries = normalizeComponents({
      storage: 'storage RAM: ram GPU: gpu PSU: psu case: case'
    });

    expect(entries).toEqual([
      { category: 'storage', productId: 'storage' },
      { category: 'RAM', productId: 'ram' },
      { category: 'GPU', productId: 'gpu' },
      { category: 'PSU', productId: 'psu' },
      { category: 'case', productId: 'case' }
    ]);
  });

  it('rejects a selection that exceeds the budget', () => {
    const result = validateAiSelection({
      parsed: { components: allComponents },
      candidates: products,
      budget: 50000,
      required: requiredCategoriesFor('gaming')
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('exceeds');
  });

  it('rejects unknown products', () => {
    const result = validateAiSelection({
      parsed: { components: { CPU: 'missing-product' } },
      candidates: products,
      budget: 70000,
      required: requiredCategoriesFor('gaming')
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('Unknown product');
  });

  it('rejects a product placed under the wrong category', () => {
    const result = validateAiSelection({
      parsed: { components: { CPU: 'gpu' } },
      candidates: products,
      budget: 70000,
      required: requiredCategoriesFor('gaming')
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('CPU must be a CPU product');
  });

  it('rejects a selection with missing required categories', () => {
    const result = validateAiSelection({
      parsed: { components: { CPU: 'cpu' } },
      candidates: products,
      budget: 70000,
      required: requiredCategoriesFor('gaming')
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('Missing required categories');
  });

  it('rejects unknown categories', () => {
    const result = validateAiSelection({
      parsed: { components: [{ category: 'sound-card', productId: 'gpu' }] },
      candidates: products,
      budget: 70000,
      required: requiredCategoriesFor('gaming')
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('Unknown category');
  });

  it('rejects the same category twice', () => {
    const result = validateAiSelection({
      parsed: {
        components: [
          { category: 'CPU', productId: 'cpu' },
          { category: 'CPU', productId: 'cpu' }
        ]
      },
      candidates: products,
      budget: 70000,
      required: requiredCategoriesFor('gaming')
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('Duplicate category');
  });

  it('rejects incompatible parts', () => {
    const incompatible = products.map((product) => (
      product.category === 'motherboard'
        ? { ...product, specifications: { ...product.specifications, socket: 'LGA1700' } }
        : product
    ));

    const result = validateAiSelection({
      parsed: { components: allComponents },
      candidates: incompatible,
      budget: 70000,
      required: requiredCategoriesFor('gaming')
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('Compatibility warnings');
  });
});

describe('advisor JSON parsing', () => {
  it('parses plain JSON', () => {
    expect(parseJson('{"components":{}}')).toEqual({ components: {} });
  });

  it('parses JSON inside a markdown fence', () => {
    expect(parseJson('```json\n{"components":{}}\n```')).toEqual({ components: {} });
  });

  it('parses JSON surrounded by text', () => {
    expect(parseJson('Here is the build: {"components":{}} Done.')).toEqual({ components: {} });
  });
});
