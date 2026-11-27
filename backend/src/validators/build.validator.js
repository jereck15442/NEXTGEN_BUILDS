import { z } from 'zod';

export const componentsSchema = z.record(z.string(), z.string().min(1));

export const validateBuildSchema = z.object({
  components: componentsSchema.default({})
});

export const saveBuildSchema = z.object({
  name: z.string().trim().min(1),
  components: componentsSchema
});

export const compatibilitySchema = z.object({
  components: componentsSchema.default({})
});
