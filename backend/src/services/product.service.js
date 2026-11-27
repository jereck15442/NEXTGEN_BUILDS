import { productRepository } from '../repositories/product.repository.js';
import { notFound } from '../utils/errors.js';

const SORTS = {
  price_asc: { price: 1 },
  price_desc: { price: -1 }
};

export async function listProducts({ page = 1, limit = 20, category, search, sort } = {}) {
  const filter = { active: true };
  if (category) filter.category = category;
  if (search) filter.$text = { $search: search };

  const [items, total] = await Promise.all([
    productRepository.findMany({
      filter,
      sort: Object.hasOwn(SORTS, sort) ? SORTS[sort] : { createdAt: -1 },
      skip: (page - 1) * limit,
      limit
    }),
    productRepository.count(filter)
  ]);

  return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

export async function getProduct(id) {
  const product = await productRepository.findActiveById(id);
  if (!product) throw notFound('Product not found');
  return product;
}

export function createProduct(data) {
  return productRepository.create(data);
}

export async function updateProduct(id, data) {
  const product = await productRepository.updateById(id, data);
  if (!product) throw notFound('Product not found');
  return product;
}

export async function deactivateProduct(id) {
  const product = await productRepository.deactivate(id);
  if (!product) throw notFound('Product not found');
  return product;
}

export async function listLowStock() {
  return { items: await productRepository.findLowStock() };
}
