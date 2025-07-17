// @ts-ignore – dev-only type resolution
import { globSync } from 'glob';
import { readFileSync } from 'fs';
import path from 'path';

// Jest globals provided via ts-jest config

describe('API path hygiene', () => {
  it('does not contain hard-coded "/api/api" paths', () => {
    // Scan client src files
    const files = globSync(path.join(__dirname, '../../../client/src/**/*.{ts,tsx}'));
    const offenders: string[] = [];
    files.forEach((file: string) => {
      const content = readFileSync(file, 'utf-8');
      if (content.includes('/api/api')) {
        offenders.push(path.relative(process.cwd(), file));
      }
    });
    expect(offenders).toEqual([]);
  });
}); 