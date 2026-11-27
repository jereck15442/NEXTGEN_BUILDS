import { asyncHandler } from '../utils/async.js';
import { checkCompatibility, resolveBuildComponents } from '../services/compatibility.service.js';

export const check = asyncHandler(async (req, res) => {
  const products = await resolveBuildComponents(req.body.components);
  res.json({ components: products, ...checkCompatibility(products) });
});
