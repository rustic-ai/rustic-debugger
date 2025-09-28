---
title: Contributing Guide
description: How to contribute to the Rustic Debug project
tags: [contributing, development, open-source]
---

# Contributing Guide

Thank you for your interest in contributing to Rustic Debug! This guide will help you get started with contributing to the project.

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Node.js** v18.0 or higher
- **pnpm** v8.0 or higher
- **Git** v2.0 or higher
- **Redis** v6.0 or higher (for testing)
- **Docker** (optional, for containerized testing)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:

```bash
git clone https://github.com/YOUR_USERNAME/rustic-debug.git
cd rustic-debug

# Add upstream remote
git remote add upstream https://github.com/rustic-ai/rustic-debug.git
```

### Development Setup

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Start development servers
pnpm dev
```

## Development Workflow

### Branch Strategy

We use a feature branch workflow:

```bash
# Update your fork
git fetch upstream
git checkout main
git merge upstream/main

# Create feature branch
git checkout -b feature/your-feature-name

# Or for bugs
git checkout -b fix/bug-description
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test improvements
- `chore/` - Maintenance tasks

### Making Changes

1. **Write tests first** (TDD approach)
2. **Implement your changes**
3. **Run tests locally**
4. **Update documentation**
5. **Commit with conventional commits**

### Code Style

We use ESLint and Prettier for code formatting:

```bash
# Format code
pnpm format

# Lint code
pnpm lint

# Type check
pnpm typecheck
```

#### TypeScript Guidelines

```typescript
// ✅ Good - Use interfaces for objects
interface User {
  id: string;
  name: string;
  email: string;
}

// ✅ Good - Use enums for constants
enum Status {
  PENDING = 'pending',
  ACTIVE = 'active',
  INACTIVE = 'inactive'
}

// ✅ Good - Use generics for reusable code
function getValue<T>(key: string): T | undefined {
  return cache.get<T>(key);
}

// ✅ Good - Use strict typing
function processMessage(message: Message): Promise<Result> {
  // Implementation
}

// ❌ Bad - Avoid any
function process(data: any): any {
  // Don't do this
}
```

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Format:
<type>(<scope>): <subject>

# Examples:
feat(frontend): add message filtering UI
fix(backend): correct Redis connection timeout
docs(api): update REST endpoint documentation
test(core): add unit tests for GemstoneID
refactor(utils): optimize message batching
chore(deps): update dependencies
```

Types:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Code style changes
- `refactor` - Code refactoring
- `test` - Testing
- `chore` - Maintenance

### Testing

#### Unit Tests

```typescript
// src/utils/__tests__/gemstoneId.test.ts
import { describe, it, expect } from 'vitest';
import { GemstoneID } from '../gemstoneId';

describe('GemstoneID', () => {
  it('should generate unique IDs', () => {
    const id1 = GemstoneID.generate();
    const id2 = GemstoneID.generate();
    expect(id1).not.toBe(id2);
  });

  it('should decode ID correctly', () => {
    const id = GemstoneID.generate(5);
    const decoded = GemstoneID.decode(id);
    expect(decoded.priority).toBe(5);
  });
});
```

#### Integration Tests

```typescript
// tests/integration/api.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../src/app';
import supertest from 'supertest';

describe('API Integration', () => {
  let app;
  let request;

  beforeAll(async () => {
    app = await createApp({ test: true });
    request = supertest(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should get guilds', async () => {
    const response = await request.get('/api/guilds');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('guilds');
  });
});
```

#### E2E Tests

```typescript
// tests/e2e/debug-flow.spec.ts
import { test, expect } from '@playwright/test';

test('complete debugging flow', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // Select guild
  await page.click('[data-testid="guild-selector"]');
  await page.click('text=production-guild');

  // Check message list
  await expect(page.locator('[data-testid="message-list"]')).toBeVisible();

  // Inspect message
  await page.click('[data-testid="message-row"]:first-child');
  await expect(page.locator('[data-testid="message-inspector"]')).toBeVisible();
});
```

### Documentation

Update documentation for any changes:

```markdown
<!-- docs/src/content/dev-guide/new-feature.md -->
---
title: New Feature
description: Description of the new feature
tags: [feature, guide]
---

# New Feature

## Overview

Describe what the feature does and why it's useful.

## Usage

\```javascript
// Example code
const feature = new Feature();
feature.use();
\```

## API Reference

Document any new APIs.
```

## Submitting Changes

### Pull Request Process

1. **Push your branch**:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create Pull Request** on GitHub

3. **PR Title** should follow conventional commits:
   ```
   feat(scope): brief description
   ```

4. **PR Description** template:
   ```markdown
   ## Description
   Brief description of changes

   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update

   ## Testing
   - [ ] Unit tests pass
   - [ ] Integration tests pass
   - [ ] Manual testing completed

   ## Checklist
   - [ ] Code follows style guidelines
   - [ ] Self-review completed
   - [ ] Documentation updated
   - [ ] Tests added/updated
   - [ ] Breaking changes documented
   ```

### Code Review

All submissions require code review. We use GitHub's review feature:

- **Approval required** from at least one maintainer
- **CI must pass** all checks
- **Documentation** must be updated
- **Tests** must be included

#### Review Checklist

Reviewers will check:

- [ ] Code quality and style
- [ ] Test coverage
- [ ] Documentation completeness
- [ ] Performance implications
- [ ] Security considerations
- [ ] Breaking changes
- [ ] Accessibility (for UI changes)

## Project Structure

### Monorepo Layout

```
rustic-debug/
├── frontend/              # React frontend
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── hooks/        # React hooks
│   │   ├── services/     # API services
│   │   └── types/        # TypeScript types
│   └── tests/
├── backend/              # Node.js backend
│   ├── src/
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   └── utils/        # Utilities
│   └── tests/
├── packages/             # Shared packages
│   └── types/           # Shared TypeScript types
├── docs/                # Documentation
│   └── src/
│       └── content/     # Markdown content
└── scripts/             # Build scripts
```

### Key Files

- `package.json` - Root package configuration
- `pnpm-workspace.yaml` - Workspace configuration
- `turbo.json` - Turborepo configuration
- `.github/workflows/` - CI/CD pipelines
- `CONTRIBUTING.md` - This file
- `README.md` - Project overview

## Development Guidelines

### Performance

- **Optimize hot paths** - Profile before optimizing
- **Batch operations** - Reduce Redis round trips
- **Use caching** - Implement appropriate caching
- **Lazy loading** - Load resources on demand

### Security

- **Never commit secrets** - Use environment variables
- **Validate input** - Sanitize all user input
- **Use parameterized queries** - Prevent injection
- **Update dependencies** - Keep dependencies current

### Accessibility

- **ARIA labels** - Add appropriate ARIA attributes
- **Keyboard navigation** - Ensure keyboard accessibility
- **Screen reader support** - Test with screen readers
- **Color contrast** - Meet WCAG guidelines

### Error Handling

```typescript
// ✅ Good - Specific error handling
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  if (error instanceof NetworkError) {
    logger.warn('Network error, retrying...', error);
    return retry(riskyOperation);
  } else if (error instanceof ValidationError) {
    logger.error('Validation failed', error);
    throw new BadRequestError(error.message);
  } else {
    logger.error('Unexpected error', error);
    throw new InternalServerError();
  }
}

// ❌ Bad - Generic error handling
try {
  return await riskyOperation();
} catch (error) {
  console.log(error);
  throw error;
}
```

## Release Process

### Versioning

We use [Semantic Versioning](https://semver.org/):

- **MAJOR** - Breaking changes
- **MINOR** - New features (backward compatible)
- **PATCH** - Bug fixes

### Release Steps

1. **Update version**:
   ```bash
   pnpm changeset version
   ```

2. **Update changelog**:
   ```bash
   pnpm changeset
   ```

3. **Create release PR**

4. **After merge**, tag release:
   ```bash
   git tag v1.2.3
   git push upstream v1.2.3
   ```

5. **Publish to npm**:
   ```bash
   pnpm publish -r
   ```

## Community

### Communication Channels

- **GitHub Issues** - Bug reports and feature requests
- **GitHub Discussions** - General discussions
- **Discord** - Real-time chat (coming soon)
- **Twitter** - [@rustic_ai](https://twitter.com/rustic_ai)

### Code of Conduct

We follow the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/).

Key points:
- Be respectful and inclusive
- Welcome newcomers
- Accept constructive criticism
- Focus on what's best for the community

### Recognition

Contributors are recognized in:
- `CONTRIBUTORS.md` file
- GitHub contributors page
- Release notes
- Project documentation

## Getting Help

### Resources

- [Architecture Guide](./architecture.html)
- [API Documentation](./api.html)
- [User Guide](../user-guide/index.html)
- [FAQ](../faq.html)

### Common Issues

**Build fails**:
```bash
# Clean and rebuild
pnpm clean
pnpm install
pnpm build
```

**Tests fail**:
```bash
# Run specific test
pnpm test -- --grep "test name"

# Debug mode
pnpm test:debug
```

**Type errors**:
```bash
# Check types
pnpm typecheck

# Generate types
pnpm generate:types
```

### Maintainers

Current maintainers:
- [@maintainer1](https://github.com/maintainer1)
- [@maintainer2](https://github.com/maintainer2)

## License

By contributing, you agree that your contributions will be licensed under the project's MIT License.

## Thank You!

Thank you for contributing to Rustic Debug! Your efforts help make debugging RusticAI applications easier for everyone. 🎉