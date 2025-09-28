# Tasks: Rustic AI Message Debugger

**Input**: Design documents from `/specs/001-create-rustic-ai/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → If not found: ERROR "No implementation plan found"
   → Extract: tech stack, libraries, structure
2. Load optional design documents:
   → data-model.md: Extract entities → model tasks
   → contracts/: Each file → contract test task
   → research.md: Extract decisions → setup tasks
3. Generate tasks by category:
   → Setup: project init, dependencies, linting
   → Tests: contract tests, integration tests
   → Core: models, services, CLI commands
   → Integration: DB, middleware, logging
   → Polish: unit tests, performance, docs
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   → All contracts have tests?
   → All entities have models?
   → All endpoints implemented?
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Monorepo structure**: `backend/`, `frontend/`, `packages/types/`
- All paths are relative to repository root

## Phase 3.1: Setup
- [x] T001 Initialize PNPM monorepo with workspace configuration in pnpm-workspace.yaml
- [x] T002 Create three workspace packages: backend, frontend, packages/types with package.json files
- [x] T003 [P] Configure TypeScript for all workspaces with tsconfig.json files
- [x] T004 [P] Set up ESLint and Prettier configuration in root with workspace-specific configs
- [x] T005 [P] Create Docker Compose configuration for Redis in docker-compose.yml
- [x] T006 [P] Set up GitHub Actions CI pipeline in .github/workflows/ci.yml
- [x] T007 Create root package.json scripts for monorepo commands (build, test, lint)
- [x] T008 [P] Initialize Turborepo configuration in turbo.json for build optimization

## Phase 3.2: Shared Types Package (packages/types/)
- [x] T009 [P] Create GemstoneID type and utilities in packages/types/src/gemstoneId.ts
- [x] T010 [P] Create Guild type definition in packages/types/src/guild.ts
- [x] T011 [P] Create Topic type definition in packages/types/src/topic.ts
- [x] T012 [P] Create Message type definition in packages/types/src/message.ts
- [x] T013 [P] Create Agent and ProcessStatus types in packages/types/src/agent.ts
- [x] T014 [P] Create RoutingSlip and Thread types in packages/types/src/routing.ts
- [x] T015 [P] Create API request/response types in packages/types/src/api.ts
- [x] T016 [P] Create Zod schemas for runtime validation in packages/types/src/schemas.ts
- [x] T017 [P] Create type tests with Vitest in packages/types/tests/types.test.ts
- [x] T018 Create barrel export in packages/types/src/index.ts

## Phase 3.3: Backend Contract Tests (TDD) ⚠️ MUST COMPLETE BEFORE 3.4
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
- [x] T019 Set up Fastify test harness with Vitest in backend/tests/setup.ts
- [x] T020 [P] Contract test GET /health in backend/tests/contract/health.test.ts
- [x] T021 [P] Contract test GET /guilds in backend/tests/contract/guilds.test.ts
- [x] T022 [P] Contract test GET /guilds/{guildId}/topics in backend/tests/contract/topics.test.ts
- [x] T023 [P] Contract test GET /guilds/{guildId}/topics/{topicName}/messages in backend/tests/contract/messages.test.ts
- [x] T024 [P] Contract test GET /messages/{messageId} in backend/tests/contract/message-by-id.test.ts
- [x] T025 [P] Contract test POST /replay in backend/tests/contract/replay.test.ts
- [x] T026 [P] Contract test POST /export in backend/tests/contract/export.test.ts
- [x] T027 [P] WebSocket contract tests in backend/tests/contract/websocket.test.ts
- [x] T028 Set up Testcontainers for Redis in backend/tests/helpers/redis.ts

## Phase 3.4: Backend Core Implementation (ONLY after tests are failing)
- [x] T029 Initialize Fastify app with TypeScript in backend/src/app.ts
- [x] T030 [P] Create Redis connection manager in backend/src/services/redis/connection.ts
- [x] T030A [P] Implement exponential backoff reconnection in backend/src/services/redis/reconnection.ts
- [x] T031 [P] Create Guild model implementation in backend/src/models/guild.ts
- [x] T032 [P] Create Topic model implementation in backend/src/models/topic.ts
- [x] T033 [P] Create Message model implementation in backend/src/models/message.ts
- [x] T034 [P] Implement GemstoneID encoder/decoder in backend/src/utils/gemstoneId.ts
- [x] T035 Create GuildDiscoveryService in backend/src/services/guildDiscovery.ts
- [x] T036 Create MessageHistoryService in backend/src/services/messageHistory/index.ts
- [x] T036A [P] Implement message ordering logic in backend/src/services/messageHistory/ordering.ts
- [x] T037 Create StreamingService for pub/sub in backend/src/services/streaming/index.ts
- [x] T038 Create ExportService in backend/src/services/export.ts
- [x] T039 Implement health check endpoint in backend/src/api/routes/health.ts
- [x] T040 Implement guilds endpoints in backend/src/api/routes/guilds.ts
- [x] T041 Implement topics endpoints in backend/src/api/routes/topics.ts
- [x] T042 Implement messages endpoints in backend/src/api/routes/messages.ts
- [x] T043 Implement replay endpoint with feature flag in backend/src/api/routes/replay.ts
- [x] T044 Implement export endpoint in backend/src/api/routes/export.ts
- [x] T045 Implement WebSocket handler in backend/src/api/websocket/handler.ts
- [x] T046 Create error handling middleware in backend/src/api/middleware/errorHandler.ts
- [x] T046A [P] Add guild deletion handler in backend/src/api/middleware/guildValidation.ts
- [x] T047 Create request validation middleware in backend/src/api/middleware/validation.ts
- [x] T048 Configure environment variables in backend/src/config/index.ts
- [x] T049 Create server entry point in backend/src/server.ts
- [x] T049A [P] Implement cache retention policy in backend/src/services/cache/retention.ts
- [x] T049B [P] Add cache clear endpoint in backend/src/api/routes/cache.ts

## Phase 3.5: Frontend Setup & Components
- [x] T050 Initialize React app with Vite in frontend/
- [x] T051 Configure React Router and layout in frontend/src/App.tsx
- [x] T052 Set up React Query client in frontend/src/providers/QueryProvider.tsx
- [x] T053 Set up Zustand stores in frontend/src/stores/
- [x] T054 [P] Create API client service in frontend/src/services/api/client.ts
- [x] T055 [P] Create WebSocket client service in frontend/src/services/websocket/client.ts
- [ ] T056 [P] Create GuildExplorer component in frontend/src/components/GuildExplorer/
- [ ] T057 [P] Create MessageFlow visualization with React Flow in frontend/src/components/MessageFlow/
- [ ] T058 [P] Create MessageInspector component in frontend/src/components/MessageInspector/
- [ ] T059 [P] Create MessageList component in frontend/src/components/MessageList/
- [ ] T060 [P] Create FilterPanel component in frontend/src/components/FilterPanel/
- [ ] T061 [P] Create ThreadView component in frontend/src/components/ThreadView/
- [ ] T062 [P] Create ExportDialog component in frontend/src/components/ExportDialog/
- [x] T063 Create Dashboard page in frontend/src/pages/Dashboard/
- [x] T064 Create DebugView page in frontend/src/pages/DebugView/
- [ ] T065 [P] Create custom hooks for data fetching in frontend/src/hooks/
- [ ] T065A [P] Create developer presence indicator in frontend/src/components/PresenceIndicator/
- [x] T066 Configure Tailwind CSS or chosen UI framework

## Phase 3.6: Integration Tests
- [ ] T067 Create end-to-end test setup with Playwright in e2e/
- [ ] T068 [P] Integration test: View guild list and activity in e2e/tests/guild-list.spec.ts
- [ ] T069 [P] Integration test: Visualize message flow graph in e2e/tests/message-flow.spec.ts
- [ ] T070 [P] Integration test: Inspect message details in e2e/tests/message-inspector.spec.ts
- [ ] T071 [P] Integration test: Filter and search messages in e2e/tests/filtering.spec.ts
- [ ] T072 [P] Integration test: Export message sets in e2e/tests/export.spec.ts
- [ ] T073 [P] Integration test: WebSocket live streaming in e2e/tests/streaming.spec.ts
- [ ] T074 Performance test: Handle 100 msg/s with <500ms latency in backend/tests/performance/

## Phase 3.7: Polish & Documentation
- [ ] T075 [P] Add unit tests for GemstoneID utilities in backend/tests/unit/gemstoneId.test.ts
- [ ] T076 [P] Add unit tests for services in backend/tests/unit/services/
- [ ] T077 [P] Add component tests for React components in frontend/tests/components/
- [ ] T078 [P] Create API documentation from OpenAPI spec
- [ ] T079 [P] Update README.md with setup and usage instructions
- [ ] T080 Create deployment Dockerfile for production build
- [ ] T081 Add error boundary components in frontend
- [ ] T082 Implement request retry logic with exponential backoff
- [ ] T083 Add loading states and skeletons in UI components
- [ ] T084 Optimize bundle size with code splitting
- [ ] T085 Run quickstart.md validation steps

## Dependencies
- Setup (T001-T008) must complete first
- Types package (T009-T018) before backend/frontend implementation
- Contract tests (T019-T028) before backend implementation (T029-T049B)
- Backend core (T029-T049B) before frontend can connect
- Frontend components (T050-T066) can start after types package
- Integration tests (T067-T074) require both backend and frontend
- Polish tasks (T075-T085) can run after implementation
- T030 before T030A (reconnection depends on connection manager)
- T036 before T036A (ordering depends on history service)

## Parallel Execution Examples

### Types Package Tasks (can run simultaneously):
```
Task: "Create GemstoneID type and utilities in packages/types/src/gemstoneId.ts"
Task: "Create Guild type definition in packages/types/src/guild.ts"
Task: "Create Topic type definition in packages/types/src/topic.ts"
Task: "Create Message type definition in packages/types/src/message.ts"
Task: "Create Agent and ProcessStatus types in packages/types/src/agent.ts"
```

### Contract Tests (all can run in parallel):
```
Task: "Contract test GET /health in backend/tests/contract/health.test.ts"
Task: "Contract test GET /guilds in backend/tests/contract/guilds.test.ts"
Task: "Contract test GET /guilds/{guildId}/topics in backend/tests/contract/topics.test.ts"
Task: "Contract test GET /messages/{messageId} in backend/tests/contract/message-by-id.test.ts"
Task: "Contract test POST /replay in backend/tests/contract/replay.test.ts"
```

### Frontend Components (independent, can run in parallel):
```
Task: "Create GuildExplorer component in frontend/src/components/GuildExplorer/"
Task: "Create MessageFlow visualization with React Flow in frontend/src/components/MessageFlow/"
Task: "Create MessageInspector component in frontend/src/components/MessageInspector/"
Task: "Create FilterPanel component in frontend/src/components/FilterPanel/"
```

## Notes
- [P] tasks = different files, no shared dependencies
- All contract tests must fail before implementation
- Commit after each completed task
- Use feature branches for larger task groups
- Follow TDD strictly: Red → Green → Refactor

## Validation Checklist
*GATE: Checked by main() before returning*

- [x] All contracts have corresponding tests (T020-T027)
- [x] All entities have model tasks (T031-T033, T009-T016)
- [x] All tests come before implementation (Phase 3.3 before 3.4)
- [x] Parallel tasks truly independent (verified by file paths)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task in same phase