import { asyncHandler } from '../utils/async.js';
import * as buildService from '../services/build.service.js';

export const validate = asyncHandler(async (req, res) => {
  res.json(await buildService.validateBuild(req.body.components));
});

export const create = asyncHandler(async (req, res) => {
  res.status(201).json(await buildService.saveBuild(req.user._id, req.body));
});

export const list = asyncHandler(async (req, res) => {
  res.json(await buildService.listBuilds(req.user._id));
});

export const get = asyncHandler(async (req, res) => {
  res.json(await buildService.getBuild(req.user._id, req.params.id));
});

export const addToCart = asyncHandler(async (req, res) => {
  res.status(201).json(await buildService.addBuildToCart(req.user._id, req.params.id));
});
