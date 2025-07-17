import { createTextdripService } from '../src/services/textdripService';

describe('TextdripService token override', () => {
  it('uses the override token when provided', () => {
    const override = 'OVERRIDE_TOKEN';
    const service: any = createTextdripService(override);
    expect(service.api.defaults.headers.Authorization).toBe(`Bearer ${override}`);
  });
}); 