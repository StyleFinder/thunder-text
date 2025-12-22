import {
  CircuitState,
  getCircuitStatus,
  recordFailure,
  resetCircuit,
  tripCircuit,
} from '@/lib/resilience/circuit-breaker';
import { AlertType, triggerAlert } from '@/lib/monitoring/alerting';

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/lib/monitoring/alerting', () => ({
  AlertSeverity: { CRITICAL: 'critical' },
  AlertType: {
    OPENAI_API_FAILURE: 'openai_api_failure',
    SHOPIFY_AUTH_FAILURE: 'shopify_auth_failure',
    EXTERNAL_API_FAILURE: 'external_api_failure',
  },
  triggerAlert: jest.fn(),
}));

const triggerAlertMock = triggerAlert as jest.MockedFunction<typeof triggerAlert>;

describe('circuit breaker alerting', () => {
  beforeEach(() => {
    triggerAlertMock.mockReset();
    triggerAlertMock.mockResolvedValue(undefined);
  });

  it('uses service-specific alert types with a safe default', async () => {
    const customService = 'warehouse-sync';

    await tripCircuit('openai', 'test-openai');
    await tripCircuit('shopify', 'test-shopify');
    await tripCircuit(customService, 'test-custom');

    expect(triggerAlertMock).toHaveBeenCalledTimes(3);
    expect(triggerAlertMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ type: AlertType.OPENAI_API_FAILURE })
    );
    expect(triggerAlertMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ type: AlertType.SHOPIFY_AUTH_FAILURE })
    );
    expect(triggerAlertMock).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ type: AlertType.EXTERNAL_API_FAILURE })
    );

    await resetCircuit('openai');
    await resetCircuit('shopify');
    await resetCircuit(customService);
  });

  it('keeps the circuit open even when alert delivery fails', async () => {
    const service = 'stateless-api';
    triggerAlertMock.mockRejectedValueOnce(new Error('Alert pipeline unavailable'));

    await expect(tripCircuit(service, 'fail-open')).resolves.toBeUndefined();
    const status = getCircuitStatus(service);

    expect(status.state).toBe(CircuitState.OPEN);
    await resetCircuit(service);
  });

  it('clears last failure timestamps after a successful reset', async () => {
    const service = 'analytics-api';
    await recordFailure(service, new Error('first failure'));
    expect(getCircuitStatus(service).lastFailure).not.toBeNull();

    await tripCircuit(service, 'manual-open');
    await resetCircuit(service);

    const statusAfterReset = getCircuitStatus(service);
    expect(statusAfterReset.state).toBe(CircuitState.CLOSED);
    expect(statusAfterReset.lastFailure).toBeNull();
  });
});
