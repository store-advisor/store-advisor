import { HealthController } from './health.controller';

describe('HealthController', () => {
  let healthController: HealthController;

  beforeEach(() => {
    healthController = new HealthController();
  });

  it('should return { status: "ok" }', () => {
    expect(healthController.getHealth()).toEqual({ status: 'ok' });
  });
});
