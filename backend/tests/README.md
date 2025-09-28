# Backend Tests

## Test Setup

The backend tests use **ioredis-mock** to simulate Redis operations without requiring a real Redis instance. This approach provides:

- Fast test execution
- No external dependencies
- Isolated test environments
- Consistent behavior across environments

## Running Tests

### All Tests
```bash
pnpm test
```

### Specific Test Files
```bash
pnpm vitest run tests/smoke.test.ts
pnpm vitest run tests/integration/api.integration.test.ts
```

### Watch Mode
```bash
pnpm test:watch
```

## Test Structure

- **Unit Tests**: `tests/unit/` - Test individual modules and functions
- **Integration Tests**: `tests/integration/` - Test API endpoints with mocked Redis
- **Contract Tests**: `tests/contract/` - Test API contracts and schemas
- **Smoke Tests**: `tests/smoke.test.ts` - Basic application startup tests

## Using Real Redis (Optional)

If you prefer to test against a real Redis instance:

1. Start Redis locally:
   ```bash
   docker run -d -p 6379:6379 redis:7-alpine
   ```

2. Remove the ioredis mock from test files:
   ```typescript
   // Remove this block from test files
   vi.mock('ioredis', () => {
     return {
       default: Redis,
     };
   });
   ```

3. Set Redis connection environment variables:
   ```bash
   export REDIS_HOST=localhost
   export REDIS_PORT=6379
   ```

4. Run tests:
   ```bash
   pnpm test
   ```

## Writing New Tests

When writing new integration tests, include the ioredis mock:

```typescript
import { vi } from 'vitest';
import Redis from 'ioredis-mock';

// Mock ioredis to use ioredis-mock
vi.mock('ioredis', () => {
  return {
    default: Redis,
  };
});
```

This ensures tests run without external dependencies.