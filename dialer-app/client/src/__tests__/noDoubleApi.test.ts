// @ts-nocheck
import { globSync } from 'glob';
import { readFileSync } from 'fs';
import path from 'path';

describe('API path hygiene', () => {
  it('does not contain hard-coded "/api/api" paths', () => {
    // Scan all .ts and .tsx files in client src
    const files = globSync(path.join(__dirname, '..', '**/*.{ts,tsx}'), {
      ignore: ['**/node_modules/**', '**/dist/**', '**/__tests__/**']
    });

    const offenders: string[] = [];

    files.forEach((file) => {
      const content = readFileSync(file, 'utf-8');
      if (content.includes('/api/api')) {
        offenders.push(path.relative(process.cwd(), file));
      }
    });

    expect(offenders).toEqual([]);
  });
}); 