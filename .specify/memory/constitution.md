<!-- 
Sync Impact Report
==================
Version change: N/A → 1.0.0 (initial constitution)
Modified principles: N/A (initial creation)
Added sections: All sections (initial creation)
Removed sections: N/A
Templates requiring updates: All templates reference constitution checks - no updates needed as this is initial creation
Follow-up TODOs: 
- RATIFICATION_DATE set to today as initial adoption
- Consider adding Security Requirements section if auth/RBAC features are added later
-->

# Redis Messaging Debugger Constitution

## Core Principles

### I. Read-Only by Default
The debugger MUST operate in read-only mode by default. Any write operations (replay, injection) MUST be protected behind explicit feature flags and appropriate access controls. This ensures the tool cannot accidentally mutate production data or interfere with live systems.

**Rationale**: As a debugging tool, safety is paramount. Developers must be able to inspect production systems without risk of causing unintended side effects.

### II. Separation of Concerns
The architecture MUST maintain clear boundaries between frontend (UI), backend (API), and shared types. Each component MUST be independently deployable, testable, and maintainable. Shared code MUST live in dedicated packages, not duplicated across components.

**Rationale**: Clear separation enables parallel development, easier testing, and prevents coupling that would make the system hard to maintain or extend.

### III. Type Safety First
All code MUST be written in TypeScript with strict type checking enabled. Shared types between frontend and backend MUST use a common types package (`@rustic-dev/types`). Types MUST mirror the RusticAI schema definitions exactly to ensure compatibility.

**Rationale**: Type safety prevents runtime errors, enables better IDE support, and ensures consistency between the debugger and the system it monitors.

### IV. Test-Driven Development
All features MUST follow TDD principles:
- Write tests first that define expected behavior
- Tests MUST fail initially (red phase)
- Implement minimal code to make tests pass (green phase)
- Refactor only after tests pass (refactor phase)
- Integration tests MUST use Testcontainers for Redis isolation

**Rationale**: TDD ensures code correctness, prevents regression, and creates living documentation of system behavior.

### V. Performance by Design
The system MUST handle high-volume message streams without degrading:
- Use separate Redis connections for commands vs pub/sub
- Implement caching layers with appropriate TTLs
- Frontend MUST use React Query for efficient data fetching
- Batch operations where possible to reduce round trips

**Rationale**: Debugging tools must not become bottlenecks themselves. Poor performance would limit the tool's usefulness in production scenarios.

## Development Standards

### Monorepo Structure
The project MUST use a monorepo structure with PNPM workspaces:
- `frontend/` - React TypeScript application
- `backend/` - Node.js/Bun/Deno API service  
- `packages/types/` - Shared TypeScript definitions

All dependencies MUST be managed at the workspace level. Cross-workspace dependencies MUST use workspace protocol.

### Code Quality Requirements
- All code MUST pass linting (ESLint/TSLint configuration)
- All code MUST pass type checking with strict mode
- All code MUST have corresponding tests
- CI pipeline MUST enforce all quality gates before merge

## Operational Boundaries

### Integration Constraints
- The `rustic-ai/` symlink directory MUST NEVER be modified
- The tool MUST NOT replace existing RusticAI UI functionality
- The tool MUST NOT provide CRUD operations for guild metadata
- The tool MUST NOT include production-grade auth, monitoring, or logging

These are explicit non-goals to maintain focus on the debugging use case.

### Deployment Requirements
- MUST provide Dockerfile for containerized deployment
- MUST support configuration via environment variables
- MUST include health check endpoints
- MAY provide Helm charts or docker-compose for local dev

## Governance

### Amendment Process
1. Proposed changes MUST be documented in a spec update
2. Changes affecting core principles require team consensus
3. Version bumps follow semantic versioning:
   - MAJOR: Removing/redefining core principles
   - MINOR: Adding new principles or sections
   - PATCH: Clarifications and wording improvements

### Compliance Verification
- All PRs MUST verify constitution compliance
- Planning phase MUST include constitution check gates
- Violations MUST be justified in complexity tracking
- Unjustifiable violations MUST trigger "Simplify approach first" error

### Guidance References
- Use CLAUDE.md for development guidance
- Reference redis_message_debugger_spec.md for detailed requirements
- Constitution supersedes other documents in case of conflict

**Version**: 1.0.0 | **Ratified**: 2025-09-26 | **Last Amended**: 2025-09-26