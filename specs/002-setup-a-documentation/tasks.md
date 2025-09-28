# Tasks: Documentation Website with GitHub Pages

**Input**: Design documents from `/specs/002-setup-a-documentation/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → COMPLETED: Tech stack: Vite + TypeScript + Playwright + GitHub Actions
2. Load optional design documents:
   → data-model.md: 5 entities → model tasks
   → contracts/: 2 files → contract test tasks
   → research.md: Technology decisions → setup tasks
3. Generate tasks by category:
   → Setup: docs package, dependencies, configuration
   → Tests: build tests, screenshot tests, integration tests
   → Core: content processing, navigation, build system
   → Integration: GitHub Actions, screenshot automation
   → Polish: optimization, performance, validation
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Return: SUCCESS (39 tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
**Web app structure**: `docs/` (NEW), `backend/`, `frontend/` (existing)
All paths relative to repository root: `/home/rohit/work/dragonscale/rustic-debug/`

## Phase 3.1: Project Setup
- [x] T001 Create documentation package directory structure at `docs/src/{content,components,scripts,styles,templates}` and `docs/tests/{build,screenshots,visual}`
- [x] T002 Initialize package.json for `@rustic-debug/docs` with Vite, TypeScript, and documentation dependencies
- [x] T003 [P] Configure TypeScript config at `docs/tsconfig.json` extending base configuration
- [x] T004 [P] Set up Vite configuration at `docs/vite.config.ts` for static site generation
- [x] T005 [P] Add docs workspace to root `pnpm-workspace.yaml` and install dependencies
- [x] T006 [P] Configure linting and formatting tools for documentation package

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
- [x] T007 [P] Create contract test for build API at `docs/tests/build/build-api.test.ts` validating content processing endpoints
- [x] T008 [P] Create contract test for GitHub Actions workflow at `docs/tests/build/workflow.test.ts` validating CI/CD pipeline
- [x] T009 [P] Create integration test for documentation page rendering at `docs/tests/integration/page-rendering.test.ts`
- [x] T010 [P] Create integration test for navigation generation at `docs/tests/integration/navigation.test.ts`
- [x] T011 [P] Create integration test for screenshot automation at `docs/tests/integration/screenshots.test.ts`
- [x] T012 [P] Create build validation test at `docs/tests/build/validation.test.ts` checking markdown processing and asset optimization

## Phase 3.3: Data Models & Core Types
- [ ] T013 [P] Create DocumentationPage interface at `docs/src/types/DocumentationPage.ts` with metadata, content, and navigation properties
- [ ] T014 [P] Create Screenshot interface at `docs/src/types/Screenshot.ts` with capture metadata and optimization properties
- [ ] T015 [P] Create NavigationStructure interface at `docs/src/types/NavigationStructure.ts` with hierarchical organization
- [ ] T016 [P] Create UserGuide and DeveloperGuide interfaces at `docs/src/types/Guides.ts` for content organization
- [ ] T017 [P] Create BuildConfig interface at `docs/src/types/BuildConfig.ts` for build system configuration

## Phase 3.4: Content Processing Core
- [ ] T018 Create markdown processor at `docs/src/scripts/markdown-processor.ts` using marked.js with custom renderers and front matter parsing
- [ ] T019 Create content scanner at `docs/src/scripts/content-scanner.ts` to discover and validate markdown files in content directories
- [ ] T020 Create navigation builder at `docs/src/scripts/navigation-builder.ts` to generate hierarchical sidebar from page metadata
- [ ] T021 Create asset optimizer at `docs/src/scripts/asset-optimizer.ts` for image compression and WebP conversion

## Phase 3.5: Build System Implementation
- [ ] T022 Create main build script at `docs/src/scripts/build.ts` orchestrating content processing, asset optimization, and HTML generation
- [ ] T023 Create HTML template engine at `docs/src/templates/page-template.ts` for generating static pages with rustic.ai theme
- [ ] T024 Create CSS build system at `docs/src/styles/build-styles.ts` implementing Tailwind CSS with rustic.ai design tokens
- [ ] T025 Create search index generator at `docs/src/scripts/search-index.ts` using Lunr.js for client-side search

## Phase 3.6: Screenshot Automation
- [ ] T026 [P] Create Playwright configuration at `docs/playwright.config.ts` for cross-browser screenshot capture
- [ ] T027 Create screenshot automation script at `docs/src/scripts/screenshots.ts` with viewport management and wait strategies
- [ ] T028 Create image optimization script at `docs/src/scripts/optimize-images.ts` for batch processing and format conversion
- [ ] T029 Create screenshot comparison utility at `docs/src/scripts/screenshot-diff.ts` for detecting UI changes

## Phase 3.7: GitHub Actions Integration
- [ ] T030 Create documentation build workflow at `.github/workflows/docs-build.yml` for automated content validation and site generation
- [ ] T031 Create GitHub Pages deployment workflow at `.github/workflows/docs-deploy.yml` with artifact management and rollback capability
- [ ] T032 [P] Create workflow validation script at `docs/src/scripts/validate-workflow.ts` for local testing of CI/CD pipeline

## Phase 3.8: Content & Theme Implementation
- [ ] T033 [P] Create sample user guide content at `docs/src/content/user-guide/` with index.md and dashboard sections
- [ ] T034 [P] Create sample developer guide content at `docs/src/content/dev-guide/` with setup and API documentation
- [ ] T035 Create rustic.ai theme implementation at `docs/src/styles/` with Tailwind CSS configuration and custom components
- [ ] T036 [P] Create reusable documentation components at `docs/src/components/` for consistent styling and behavior

## Phase 3.9: Integration & Polish
- [ ] T037 Create end-to-end integration test at `docs/tests/e2e/full-build.test.ts` validating complete build and deployment process
- [ ] T038 [P] Create performance validation script at `docs/src/scripts/performance-check.ts` using Lighthouse CI for quality gates
- [ ] T039 [P] Create documentation validation script at `docs/src/scripts/validate-docs.ts` for link checking, spell checking, and content quality

## Task Dependencies
```
T001 → T002 → T005 (Sequential setup)
T003, T004, T006 can run parallel after T002
T007-T012 can all run in parallel (different test files)
T013-T017 can all run in parallel (different type files)
T018 → T019 → T020 (Content processing pipeline)
T021 → T028 (Asset optimization pipeline)
T022 depends on T018, T020, T021 (Main build needs processors)
T023 → T024 (Template before styles)
T026 → T027 → T029 (Screenshot pipeline)
T030, T031 can run parallel after build system complete
T033-T036 can run parallel (different content areas)
T037 depends on all core functionality
T038, T039 can run parallel as final validation
```

## Parallel Execution Examples

### Phase 3.2 - All Test Setup (Parallel)
```bash
# Run these simultaneously
Task 1: Create build API contract test
Task 2: Create GitHub Actions workflow test
Task 3: Create page rendering integration test
Task 4: Create navigation generation test
Task 5: Create screenshot automation test
Task 6: Create build validation test
```

### Phase 3.3 - All Type Definitions (Parallel)
```bash
# Run these simultaneously
Task 1: Create DocumentationPage interface
Task 2: Create Screenshot interface
Task 3: Create NavigationStructure interface
Task 4: Create Guides interfaces
Task 5: Create BuildConfig interface
```

### Phase 3.8 - Content Creation (Parallel)
```bash
# Run these simultaneously
Task 1: Create user guide sample content
Task 2: Create developer guide sample content
Task 3: Create reusable documentation components
# Note: T035 (theme) runs separately as it affects all content
```

## Implementation Notes

### TDD Approach
- Phase 3.2 tests MUST be written and failing before implementing Phase 3.3-3.8
- Each core script should have corresponding tests validating its contract
- Integration tests validate end-to-end workflows

### File Organization
- All new code goes in `docs/` package - no modifications to existing `frontend/` or `backend/`
- TypeScript strict mode throughout
- Modular architecture with clear separation of concerns

### Performance Targets
- Build time: <5 minutes for full site generation
- Screenshot generation: <30 seconds per page
- Page load time: <3 seconds (Lighthouse score >90)

### Validation Gates
- All tests must pass before deployment
- Lighthouse CI scores must meet thresholds
- Link checking and content validation required

## Ready for Implementation
All 39 tasks are dependency-ordered and immediately executable. Each task includes specific file paths and clear success criteria for LLM-based implementation.