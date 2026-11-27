import fs from 'node:fs';
import YAML from 'yaml';

const spec = YAML.parse(fs.readFileSync('openapi.yaml', 'utf8'));
if (spec.openapi !== '3.0.3' || !spec.paths || Object.keys(spec.paths).length === 0) {
  throw new Error('OpenAPI specification is invalid');
}
console.log(`OpenAPI valid: ${Object.keys(spec.paths).length} documented paths`);
