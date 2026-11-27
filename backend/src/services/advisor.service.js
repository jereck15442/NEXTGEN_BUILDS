import { env } from '../config/env.js';
import { productRepository } from '../repositories/product.repository.js';
import { checkCompatibility } from './compatibility.service.js';
import { serviceUnavailable } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const ALLOWED_CATEGORIES = ['CPU', 'motherboard', 'GPU', 'RAM', 'storage', 'PSU', 'case'];
const ESSENTIAL_CATEGORIES = ['CPU', 'motherboard', 'RAM', 'storage', 'PSU', 'case'];
const CATEGORY_LABELS = {
  CPU: 'CPU',
  motherboard: 'motherboard',
  GPU: 'GPU',
  RAM: 'RAM',
  storage: 'storage',
  PSU: 'PSU',
  case: 'case'
};

const AI_ATTEMPT_TIMEOUT_MS = 20_000;
const AI_TOTAL_BUDGET_MS = 50_000;
const AI_MODELS = ['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-3.8-flash'];

const AI_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    components: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          category: { type: 'STRING', enum: ALLOWED_CATEGORIES },
          productId: { type: 'STRING' }
        },
        required: ['category', 'productId']
      }
    },
    explanation: { type: 'STRING' }
  },
  required: ['components', 'explanation']
};

const CATEGORY_BY_LOWER = Object.fromEntries(
  ALLOWED_CATEGORIES.map((category) => [category.toLowerCase(), category])
);

function formatMoney(value) {
  return Number(value || 0).toLocaleString('en-US');
}

function joinLabels(categories) {
  const labels = categories.map((category) => CATEGORY_LABELS[category] || category);
  if (labels.length === 0) return '';
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}

function cleanExplanation(text, fallback) {
  if (typeof text !== 'string' || !text.trim()) return fallback;
  const cleaned = text
    .replace(/\s*—\s*/g, ', ')
    .replace(/\s*--\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.length > 600 ? `${cleaned.slice(0, 597)}...` : cleaned;
}

export function requiredCategoriesFor(usage) {
  const normalized = String(usage || '').trim().toLowerCase();
  if (normalized === 'gaming' || normalized === 'video-editing') return [...ALLOWED_CATEGORIES];
  return [...ESSENTIAL_CATEGORIES];
}

function partialPriorityFor(usage) {
  const normalized = String(usage || '').trim().toLowerCase();
  if (normalized === 'gaming' || normalized === 'video-editing') {
    return ['CPU', 'GPU', 'motherboard', 'RAM', 'storage', 'PSU', 'case'];
  }
  return ['CPU', 'motherboard', 'RAM', 'storage', 'PSU', 'case', 'GPU'];
}

function upgradePriorityFor(usage) {
  const normalized = String(usage || '').trim().toLowerCase();
  if (normalized === 'gaming' || normalized === 'video-editing') {
    return ['GPU', 'CPU', 'RAM', 'storage', 'PSU', 'case', 'motherboard'];
  }
  if (normalized === 'office-work') {
    return ['CPU', 'RAM', 'storage', 'PSU', 'case', 'motherboard', 'GPU'];
  }
  return ['CPU', 'RAM', 'storage', 'GPU', 'PSU', 'case', 'motherboard'];
}

function cheapestByCategory(products) {
  const cheapest = Object.create(null);
  for (const product of products) {
    if (!ALLOWED_CATEGORIES.includes(product.category)) continue;
    const current = cheapest[product.category];
    if (!current || Number(product.price) < Number(current.price)) {
      cheapest[product.category] = product;
    }
  }
  return cheapest;
}

export function calculateMinimumBudget(products, required) {
  const cheapest = cheapestByCategory(products);
  const unavailableCategories = required.filter((category) => !cheapest[category]);
  const minimumBudget = required.reduce(
    (sum, category) => sum + (Number(cheapest[category]?.price) || 0),
    0
  );
  return { cheapest, minimumBudget, unavailableCategories };
}

function sumSelected(selected) {
  return Object.values(selected).reduce((sum, product) => sum + (Number(product.price) || 0), 0);
}

export function selectDeterministic({ products, budget, usage }) {
  const required = requiredCategoriesFor(usage);
  const { cheapest, minimumBudget, unavailableCategories } = calculateMinimumBudget(products, required);
  const selected = Object.create(null);

  if (minimumBudget > budget) {
    const priority = partialPriorityFor(usage);
    let total = 0;
    for (const category of priority) {
      const product = cheapest[category];
      if (!product) continue;
      const price = Number(product.price) || 0;
      if (total + price <= budget) {
        selected[category] = product;
        total += price;
      }
    }
    const omittedCategories = required.filter((category) => !selected[category]);
    return {
      selected,
      minimumBudget,
      omittedCategories,
      unavailableCategories,
      partial: omittedCategories.length > 0 || unavailableCategories.length > 0
    };
  }

  for (const category of required) {
    if (cheapest[category]) selected[category] = cheapest[category];
  }

  if (!required.includes('GPU') && cheapest.GPU) {
    const total = sumSelected(selected);
    if (total + Number(cheapest.GPU.price) <= budget) {
      selected.GPU = cheapest.GPU;
    }
  }

  let upgraded = true;
  while (upgraded) {
    upgraded = false;
    for (const category of upgradePriorityFor(usage)) {
      const current = selected[category];
      const currentPrice = Number(current?.price) || 0;
      const options = products
        .filter((product) => product.category === category)
        .sort((a, b) => Number(b.price) - Number(a.price));

      for (const option of options) {
        const optionPrice = Number(option.price) || 0;
        if (optionPrice <= currentPrice) continue;
        const nextTotal = sumSelected(selected) - currentPrice + optionPrice;
        if (nextTotal <= budget) {
          selected[category] = option;
          upgraded = true;
          break;
        }
      }
    }
  }

  const omittedCategories = required.filter((category) => !selected[category]);
  return {
    selected,
    minimumBudget,
    omittedCategories,
    unavailableCategories,
    partial: omittedCategories.length > 0 || unavailableCategories.length > 0
  };
}

export function normalizeComponents(components) {
  if (Array.isArray(components)) {
    return components
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const rawCategory = String(entry.category || entry.type || '').trim();
        const category = CATEGORY_BY_LOWER[rawCategory.toLowerCase()] || rawCategory;
        const productId = String(entry.productId || entry.id || entry.product || '').trim();
        return category && productId ? { category, productId } : null;
      })
      .filter(Boolean);
  }

  if (!components || typeof components !== 'object') return [];

  const entries = [];
  for (const [rawCategory, rawValue] of Object.entries(components)) {
    const category = CATEGORY_BY_LOWER[String(rawCategory).trim().toLowerCase()] || String(rawCategory).trim();
    const value = String(rawValue ?? '').trim();
    if (!category || !value) continue;

    // Some models pack several categories into one string: "<id> RAM: <id> GPU: <id>".
    const labeled = [...value.matchAll(/(CPU|motherboard|GPU|RAM|storage|PSU|case)\s*:\s*([^\s,;]+)/gi)];
    if (labeled.length === 0) {
      entries.push({ category, productId: value });
      continue;
    }

    const leadingId = value.slice(0, labeled[0].index).replace(/[\s,;]+$/, '').trim();
    if (leadingId) entries.push({ category, productId: leadingId });

    for (const match of labeled) {
      const packedCategory = CATEGORY_BY_LOWER[match[1].toLowerCase()];
      if (packedCategory) entries.push({ category: packedCategory, productId: match[2] });
    }
  }

  return entries;
}

export function validateAiSelection({ parsed, candidates, budget, required }) {
  const errors = [];
  const selected = Object.create(null);

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, errors: ['Response is not a JSON object'], selected, total: 0 };
  }

  const entries = normalizeComponents(parsed.components);
  if (entries.length === 0) {
    return { ok: false, errors: ['Response is missing components'], selected, total: 0 };
  }

  const byId = new Map(candidates.map((product) => [String(product._id), product]));
  const seen = new Set();

  for (const { category, productId } of entries) {
    if (!ALLOWED_CATEGORIES.includes(category)) {
      errors.push(`Unknown category: ${category}`);
      continue;
    }
    if (selected[category]) {
      errors.push(`Duplicate category: ${category}`);
      continue;
    }

    const product = byId.get(productId);
    if (!product) {
      errors.push(`Unknown product for ${category}: ${productId}`);
      continue;
    }
    if (product.category !== category) {
      errors.push(`${category} must be a ${category} product`);
      continue;
    }
    if (seen.has(String(product._id))) {
      errors.push('Duplicate product selected');
      continue;
    }

    selected[category] = product;
    seen.add(String(product._id));
  }

  const total = sumSelected(selected);
  if (total > budget) {
    errors.push(`Total PHP ${formatMoney(total)} exceeds the PHP ${formatMoney(budget)} budget`);
  }

  const missing = required.filter((category) => !selected[category]);
  if (missing.length > 0) {
    errors.push(`Missing required categories: ${joinLabels(missing)}`);
  }

  const compatibility = checkCompatibility(selected);
  if (!compatibility.compatible) {
    errors.push(`Compatibility warnings: ${compatibility.warnings.map((warning) => warning.code).join(', ')}`);
  }

  return { ok: errors.length === 0, errors, selected, total };
}

export function parseJson(text) {
  if (typeof text !== 'string' || !text.trim()) throw new Error('Empty AI response');
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('AI response did not contain JSON');
    return JSON.parse(match[0]);
  }
}

function buildPrompt({ candidates, budget, usage, required }) {
  const products = candidates.map((product) => ({
    id: String(product._id),
    name: product.name,
    category: product.category,
    price: product.price,
    specifications: product.specifications
  }));

  return [
    `Recommend one PC build for PHP ${budget} for ${usage}.`,
    `Required categories: ${required.join(', ')}.`,
    `Use only these products, identified by id.`,
    `Each component entry must use one of these exact category values: ${ALLOWED_CATEGORIES.join(', ')}.`,
    `The server calculates the total. The selected products must cost no more than PHP ${budget} in total.`,
    `Do not invent products or prices. Do not put a product under the wrong category.`,
    `Do not claim frame rates, benchmark scores, or performance numbers. Describe only the selected parts, compatibility, and total cost.`,
    `Return one component entry per category, each with a category and a productId. Add a short explanation.`,
    `Candidates: ${JSON.stringify(products)}`
  ].join('\n');
}

async function callGemini(model, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': env.GEMINI_API_KEY
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: AI_RESPONSE_SCHEMA,
        temperature: 0.2,
        maxOutputTokens: 2048
      }
    }),
    signal: AbortSignal.timeout(AI_ATTEMPT_TIMEOUT_MS)
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Gemini ${response.status}: ${detail.slice(0, 200)}`);
  }

  const data = await response.json();
  return (
    data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || '')
      .join('') || ''
  );
}

function modelChain() {
  return [...new Set([env.GEMINI_MODEL, ...AI_MODELS].filter(Boolean))].slice(0, 3);
}

function describeFallback({ selected, budget, usage, minimumBudget, omittedCategories, unavailableCategories }) {
  const total = formatMoney(sumSelected(selected));
  const selectedLabels = joinLabels(Object.keys(selected));

  if (unavailableCategories.length > 0) {
    return `Some required parts are out of stock: ${joinLabels(unavailableCategories)}. The catalog-based selection covers ${selectedLabels || 'no parts'} and totals PHP ${total}.`;
  }

  if (omittedCategories.length > 0) {
    const shortfall = Math.max(0, minimumBudget - budget);
    return `A complete build needs at least PHP ${formatMoney(minimumBudget)}. This selection covers ${selectedLabels} and totals PHP ${total}. Add PHP ${formatMoney(shortfall)} to cover ${joinLabels(omittedCategories)}.`;
  }

  return `A complete ${usage} build from in-stock parts. Total: PHP ${total}.`;
}

function buildResult({
  selected,
  source,
  budget,
  usage,
  minimumBudget,
  omittedCategories,
  unavailableCategories,
  explanation
}) {
  const partial = omittedCategories.length > 0 || unavailableCategories.length > 0;
  return {
    components: selected,
    estimatedPrice: sumSelected(selected),
    compatibility: checkCompatibility(selected),
    explanation,
    source,
    partial,
    minimumBudget: Number.isFinite(minimumBudget) ? minimumBudget : null,
    shortfall: Number.isFinite(minimumBudget) ? Math.max(0, minimumBudget - budget) : 0,
    omittedCategories,
    unavailableCategories
  };
}

export async function recommend({ budget, usage }) {
  const available = await productRepository.findAvailable();
  if (available.length === 0) {
    throw serviceUnavailable('No products are currently in stock. Please check the catalog later.');
  }

  const required = requiredCategoriesFor(usage);
  const { minimumBudget, unavailableCategories } = calculateMinimumBudget(available, required);

  if (budget < minimumBudget || unavailableCategories.length > 0) {
    const selection = selectDeterministic({ products: available, budget, usage });
    return buildResult({
      ...selection,
      source: 'fallback',
      budget,
      usage,
      explanation: describeFallback({ ...selection, budget, usage })
    });
  }

  const candidates = available.filter((product) => Number(product.price) <= budget);
  if (env.GEMINI_API_KEY && candidates.length > 0) {
    const deadline = Date.now() + AI_TOTAL_BUDGET_MS;

    for (const model of modelChain()) {
      if (Date.now() >= deadline) break;

      try {
        const raw = await callGemini(model, buildPrompt({ candidates, budget, usage, required }));
        const parsed = parseJson(raw);
        const validation = validateAiSelection({ parsed, candidates, budget, required });

        if (validation.ok) {
          return buildResult({
            selected: validation.selected,
            source: 'ai',
            budget,
            usage,
            minimumBudget,
            omittedCategories: [],
            unavailableCategories: [],
            explanation: cleanExplanation(
              parsed.explanation,
              describeFallback({
                selected: validation.selected,
                budget,
                usage,
                minimumBudget,
                omittedCategories: [],
                unavailableCategories: []
              })
            )
          });
        }

        logger.warn('Advisor rejected AI selection', { model, errors: validation.errors });
      } catch (error) {
        logger.warn('Advisor model failed', { model, error: error.message });
      }
    }
  }

  const selection = selectDeterministic({ products: available, budget, usage });
  return buildResult({
    ...selection,
    source: 'fallback',
    budget,
    usage,
    explanation: describeFallback({ ...selection, budget, usage })
  });
}
