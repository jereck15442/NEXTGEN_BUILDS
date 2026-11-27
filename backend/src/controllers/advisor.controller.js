import { asyncHandler } from '../utils/async.js';
import * as advisorService from '../services/advisor.service.js';

export const recommend = asyncHandler(async (req, res) => {
  res.json(await advisorService.recommend(req.body));
});
