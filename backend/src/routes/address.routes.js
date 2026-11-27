import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { addressBodySchema } from '../validators/address.validator.js';
import { idParamSchema } from '../validators/common.validator.js';
import { requireAuth, loadUser } from '../middleware/auth.js';
import { Address } from '../models/Address.js';

const router = Router();

// GET /api/v1/addresses - List all addresses for the logged-in user
router.get('/', requireAuth, loadUser, async (req, res) => {
  try {
    const addresses = await Address.find({ user: req.user._id }).sort({ default: -1, createdAt: -1 });
    res.json(addresses);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch addresses', error: error.message });
  }
});

// POST /api/v1/addresses - Create a new address
router.post('/', requireAuth, loadUser, validate({ body: addressBodySchema }), async (req, res) => {
  try {
    const addressData = {
      ...req.body,
      user: req.user._id,
      default: false
    };
    const address = await Address.create(addressData);
    res.status(201).json(address);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create address', error: error.message });
  }
});

// GET /api/v1/addresses/:id - Get a specific address
router.get('/:id', requireAuth, loadUser, async (req, res) => {
  try {
    const address = await Address.findOne({ _id: req.params.id, user: req.user._id });
    if (!address) {
      return res.status(404).json({ message: 'Address not found' });
    }
    res.json(address);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch address', error: error.message });
  }
});

// PATCH /api/v1/addresses/:id - Update an address
router.patch('/:id', requireAuth, loadUser, validate({ params: idParamSchema, body: addressBodySchema }), async (req, res) => {
  try {
    const address = await Address.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!address) {
      return res.status(404).json({ message: 'Address not found' });
    }
    res.json(address);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update address', error: error.message });
  }
});

// DELETE /api/v1/addresses/:id - Delete an address
router.delete('/:id', requireAuth, loadUser, async (req, res) => {
  try {
    const address = await Address.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!address) {
      return res.status(404).json({ message: 'Address not found' });
    }
    res.json({ message: 'Address deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete address', error: error.message });
  }
});

// PUT /api/v1/addresses/:id/set-default - Set an address as default
router.patch('/:id/set-default', requireAuth, loadUser, async (req, res) => {
  try {
    // Set all addresses to not default
    await Address.updateMany({ user: req.user._id }, { default: false });
    // Set the selected address as default
    await Address.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { default: true },
      { new: true }
    );
    const addresses = await Address.find({ user: req.user._id }).sort({ default: -1, createdAt: -1 });
    res.json(addresses);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update default address', error: error.message });
  }
});

export const addressRoutes = router;