import { SavedBuild } from '../models/SavedBuild.js';

export const buildRepository = {
  create(data) {
    return SavedBuild.create(data);
  },
  findByUser(userId) {
    return SavedBuild.find({ user: userId }).sort({ createdAt: -1 });
  },
  findById(id) {
    return SavedBuild.findById(id);
  }
};
