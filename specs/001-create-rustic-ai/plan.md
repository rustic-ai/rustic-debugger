
# Implementation Plan: Rustic AI Message Debugger

**Branch**: `001-create-rustic-ai` | **Date**: 2025-09-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-create-rustic-ai/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
A web-based debugging tool for RusticAI developers to visualize and inspect Redis message flow in real-time and historically. The system displays guild namespaces, message flows between topics/agents as interactive graphs, supports filtering and error tracing, and allows export of message sets for offline analysis. It operates in read-only mode by default with optional replay capability for all developers.

## Technical Context
**Language/Version**: TypeScript 5.x (both frontend and backend)  
**Primary Dependencies**: React 18+, Node.js/Bun, ioredis, React Query, Zustand  
**Storage**: Redis (external - read-only by default)  
**Testing**: Vitest/Jest for unit tests, Testcontainers for integration tests  
**Target Platform**: Web browsers (modern Chrome/Firefox/Safari), Node.js 18+ backend
**Project Type**: web - monorepo with frontend, backend, and shared types  
**Performance Goals**: Handle 100 messages/second with <500ms UI latency  
**Constraints**: 7-day historical window, FIFO message dropping on memory limits, JSON-only export, 7-day cache retention with user clear option  
**Scale/Scope**: All developers with system access, multiple concurrent users per guild

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Core Principles Compliance:
- [x] **Read-Only by Default**: ✅ PASS - OpenAPI shows read endpoints + feature-flagged replay
- [x] **Separation of Concerns**: ✅ PASS - Clean separation in contracts and data model
- [x] **Type Safety First**: ✅ PASS - TypeScript types defined, Zod schemas for validation
- [x] **Test-Driven Development**: ✅ PASS - Contract tests created that will fail first
- [x] **Performance by Design**: ✅ PASS - WebSocket for streaming, pagination, caching planned

### Development Standards:
- [x] **Monorepo Structure**: ✅ PASS - Structure confirmed with 3 workspace packages
- [x] **Code Quality**: ✅ PASS - Contract tests establish quality baseline

### Operational Boundaries:
- [x] **Integration Constraints**: ✅ PASS - No RusticAI mutations in contracts
- [x] **Deployment Requirements**: ✅ PASS - Environment config documented in quickstart

**Post-Design Assessment**: All constitutional requirements remain satisfied. Design artifacts align with principles. No new violations introduced.

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
backend/
├── src/
│   ├── models/
│   │   ├── message.ts
│   │   ├── guild.ts
│   │   └── gemstoneId.ts
│   ├── services/
│   │   ├── redis/
│   │   ├── messageHistory/
│   │   └── streaming/
│   └── api/
│       ├── routes/
│       ├── middleware/
│       └── websocket/
└── tests/
    ├── contract/
    ├── integration/
    └── unit/

frontend/
├── src/
│   ├── components/
│   │   ├── MessageFlow/
│   │   ├── GuildExplorer/
│   │   └── MessageInspector/
│   ├── pages/
│   │   ├── Dashboard/
│   │   └── DebugView/
│   └── services/
│       ├── api/
│       └── websocket/
└── tests/
    ├── components/
    └── integration/

packages/
└── types/
    ├── src/
    │   ├── message.ts
    │   ├── guild.ts
    │   └── api.ts
    └── tests/
```

**Structure Decision**: Web application monorepo structure with PNPM workspaces. The frontend will be a React SPA, the backend a Node.js/Bun API service, and a shared types package ensures type safety across the boundary. This aligns with the Constitution's Separation of Concerns and Type Safety First principles.

## Phase 0: Outline & Research ✅ COMPLETE
1. **Extract unknowns from Technical Context** above:
   - No NEEDS CLARIFICATION items found
   - Researched best practices for: React, TypeScript, Redis, WebSocket, monorepo management

2. **Research conducted**:
   - Frontend stack: React 18+ with React Flow for visualization
   - Backend stack: Bun/Fastify with ioredis for Redis integration
   - Testing: Vitest + Testcontainers for TDD approach
   - Monorepo: PNPM + Turborepo for efficient builds

3. **Findings consolidated** in `research.md`:
   - All technology decisions documented with rationale
   - Integration patterns with RusticAI message format researched
   - Performance optimization strategies identified
   - Security considerations for read-only operation defined

**Output**: research.md created with all decisions resolved

## Phase 1: Design & Contracts ✅ COMPLETE
*Prerequisites: research.md complete*

1. **Extracted entities from feature spec** → `data-model.md`:
   - 10 core entities defined: Guild, Topic, Message, Agent, Thread, etc.
   - Validation rules specified (7-day window, FIFO dropping, etc.)
   - State transitions documented (message status flow)

2. **Generated API contracts**:
   - OpenAPI 3.0 specification → `/contracts/openapi.yaml`
   - REST endpoints for guilds, topics, messages, export
   - Feature-flagged replay endpoint

3. **Generated contract tests**:
   - Guild endpoints tests → `/contracts/tests/guilds.test.ts`
   - Message endpoints tests → `/contracts/tests/messages.test.ts`
   - Tests use Vitest + Zod for schema validation
   - Tests will fail until implementation (TDD approach)

4. **Created quickstart guide** → `quickstart.md`:
   - Installation and configuration steps
   - Basic usage scenarios matching user stories
   - Testing verification scripts
   - Troubleshooting common issues

5. **Updated CLAUDE.md** via script:
   - Added TypeScript, React, Bun, Redis technologies
   - Preserved existing content and structure
   - Maintained monorepo layout information

**Output**: All Phase 1 artifacts successfully created

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
The /tasks command will analyze Phase 1 artifacts to generate an ordered task list following TDD principles:

1. **Infrastructure Setup Tasks** (5-6 tasks):
   - Initialize monorepo with PNPM workspaces
   - Configure TypeScript for all packages
   - Set up testing infrastructure (Vitest, Testcontainers)
   - Configure linting and formatting
   - Create Docker setup for Redis testing
   - Set up CI pipeline configuration

2. **Shared Types Package Tasks** (3-4 tasks) [P]:
   - Create base type definitions from data-model.md
   - Implement GemstoneID utilities
   - Add Zod schemas for runtime validation
   - Create type tests

3. **Backend Contract Test Tasks** (8-10 tasks):
   - Set up Fastify with TypeScript
   - Implement contract tests for each endpoint
   - Create WebSocket contract tests
   - All tests must fail initially (TDD)

4. **Backend Implementation Tasks** (10-12 tasks):
   - Redis connection management
   - Guild discovery service
   - Message history service
   - WebSocket streaming implementation
   - Export functionality
   - Feature flag system for replay
   - Make contract tests pass

5. **Frontend Component Tasks** (8-10 tasks) [P]:
   - Set up React with TypeScript and Vite
   - Create MessageFlow visualization component
   - Build GuildExplorer component
   - Implement MessageInspector component
   - Add filtering and search UI
   - WebSocket client integration

6. **Integration Test Tasks** (4-5 tasks):
   - End-to-end test setup
   - Test each user story from quickstart
   - Performance validation tests
   - Error handling scenarios

**Ordering Strategy**:
- Dependencies first: types → backend contracts → backend impl → frontend
- Parallel markers [P] for independent tasks
- Contract tests before implementation
- Integration tests last

**Estimated Output**: 40-45 numbered tasks with clear dependencies and parallel opportunities

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none required)

---
*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*
