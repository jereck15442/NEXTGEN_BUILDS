import { buildRepository } from '../repositories/build.repository.js';
import { cartRepository } from '../repositories/cart.repository.js';
import { checkCompatibility, resolveBuildComponents } from './compatibility.service.js';
import { conflict, forbidden, notFound } from '../utils/errors.js';

export async function validateBuild(components) {
  const products = await resolveBuildComponents(components);
  return {
    components: products,
    estimatedPrice: Object.values(products).reduce((sum, product) => sum + product.price, 0),
    ...checkCompatibility(products)
  };
}

export async function saveBuild(userId, { name, components }) {
  await resolveBuildComponents(components);
  return buildRepository.create({ user: userId, name, components });
}

export function listBuilds(userId) {
  return buildRepository.findByUser(userId);
}

export async function getBuild(userId, buildId) {
  const build = await buildRepository.findById(buildId);
  if (!build) throw notFound('Saved build not found');
  if (build.user.toString() !== userId.toString()) throw forbidden('Forbidden');
  return build;
}

export async function addBuildToCart(userId, buildId) {
  const build = await getBuild(userId, buildId);
  const components = Object.fromEntries(build.components);
  const products = await resolveBuildComponents(components);
  const cart = await cartRepository.findByUser(userId) ?? await cartRepository.createForUser(userId);

  for (const product of Object.values(products)) {
    if (product.stock < 1) throw conflict(`Insufficient stock for ${product.name}`);
    const existing = cart.items.find((item) => item.product.toString() === product._id.toString());
    if (existing) existing.quantity += 1;
    else cart.items.push({ product: product._id, quantity: 1 });
  }

  await cart.save();
  return { cart, compatibility: checkCompatibility(products) };
}
