import { asyncHandler } from '../utils/async.js';

export const listAddresses = asyncHandler(async (_req, res) => {
  res.json({ message: 'List addresses' });
});

export const createAddress = asyncHandler(async (_req, res) => {
  res.json({ message: 'Create address' });
});

export const updateAddress = asyncHandler(async (_req, res) => {
  res.json({ message: 'Update address' });
});

export const deleteAddress = asyncHandler(async (_req, res) => {
  res.json({ message: 'Delete address' });
});
