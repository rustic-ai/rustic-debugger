# Research: Documentation Website with GitHub Pages

**Generated**: 2025-09-28 | **Phase**: 0 | **Status**: Complete

## Static Site Generation Technology

**Decision**: Vite + TypeScript for build tooling
**Rationale**:
- Aligns with existing frontend stack (Vite, TypeScript)
- Fast build times and hot module replacement for development
- Excellent plugin ecosystem for markdown processing and asset optimization
- Tree shaking and modern bundle optimization

**Alternatives considered**:
- Next.js: More complex setup, SSR not needed for static docs
- Docusaurus: React-based but heavyweight, vendor lock-in
- VitePress: Vue-based, not compatible with existing React components
- Jekyll: Ruby-based, different language stack

## Markdown Processing & Content Management

**Decision**: Marked.js with custom renderers + Front Matter
**Rationale**:
- Lightweight, configurable markdown parsing
- Custom renderer support for code blocks, tables, and links
- Front matter support for metadata (title, sidebar position, etc.)
- Compatible with existing React component architecture

**Alternatives considered**:
- MDX: More complex compilation, runtime overhead
- Gray-matter + remark: Multiple dependencies, complex pipeline
- Contentful/Strapi: Overkill for simple documentation

## Screenshot Automation Technology

**Decision**: Playwright for cross-browser screenshot capture
**Rationale**:
- Reliable, headless browser automation
- Built-in wait strategies for dynamic content
- Multiple browser engine support (Chromium, Firefox, WebKit)
- TypeScript-first API design
- Docker-compatible for CI/CD

**Alternatives considered**:
- Puppeteer: Chrome-only, less reliable wait strategies
- Selenium: Heavier, more complex setup
- Manual screenshots: Not scalable, consistency issues

## GitHub Pages Deployment Strategy

**Decision**: GitHub Actions with custom build workflow
**Rationale**:
- Native integration with GitHub repository
- Free hosting for public repositories
- Custom domain support available
- Automated deployment on content changes
- Build artifacts can be cached between deployments

**Alternatives considered**:
- Netlify: External service, additional complexity
- Vercel: External service, not needed for static content
- Self-hosted: Infrastructure overhead

## Theme Implementation Approach

**Decision**: Tailwind CSS with custom rustic.ai design system
**Rationale**:
- Aligns with existing frontend styling approach
- Utility-first approach enables rapid development
- Easy to create consistent design tokens
- PostCSS integration for advanced optimizations
- Mobile-first responsive design built-in

**Alternatives considered**:
- Custom CSS: More maintenance overhead
- Bootstrap: Heavyweight, not aligned with current stack
- Styled-components: Runtime overhead for static site

## Navigation Structure Implementation

**Decision**: Hierarchical sidebar with automatic generation from file structure
**Rationale**:
- Maintainable: Navigation updates automatically with new content
- Consistent: Follows filesystem organization patterns
- Scalable: Works with growing content without manual updates
- Configurable: Front matter can override default ordering

**Alternatives considered**:
- Manual navigation config: High maintenance overhead
- Flat structure: Doesn't scale with content volume
- Tag-based navigation: More complex for users to understand

## Content Organization Strategy

**Decision**: Feature-based content structure with cross-references
**Rationale**:
- User-guide/: End-user focused documentation with screenshots
- Dev-guide/: Technical implementation, API references, setup
- Cross-references maintained via automatic link checking
- Version-aware content with release alignment

**Alternatives considered**:
- Single flat documentation: Doesn't scale, poor discoverability
- Wiki-style: Less structured, harder to maintain quality
- API-first: Doesn't serve non-technical users effectively

## Build Pipeline Architecture

**Decision**: Multi-stage pipeline with incremental updates
**Rationale**:
1. Content validation (markdown linting, link checking)
2. Screenshot generation (triggered manually or on UI changes)
3. Static site generation (HTML, CSS, JS optimization)
4. GitHub Pages deployment (atomic updates)

**Pipeline Steps**:
- **Stage 1**: Validate markdown content and check internal links
- **Stage 2**: Generate screenshots if triggered (manual or UI diff detection)
- **Stage 3**: Build static site with optimized assets
- **Stage 4**: Deploy to GitHub Pages with rollback capability

**Alternatives considered**:
- Single-stage build: No rollback capability, all-or-nothing
- External CI: Additional complexity and cost
- Manual deployment: Error-prone, not scalable

## Performance Optimization Strategy

**Decision**: Static site optimization with progressive enhancement
**Rationale**:
- Static HTML for fastest initial load
- Lazy loading for images and screenshots
- Service worker for offline capability
- Critical CSS inlining for above-the-fold content
- Image optimization and WebP conversion

**Performance Targets**:
- Lighthouse score: 95+ on all metrics
- First Contentful Paint: <1.5s
- Time to Interactive: <3s
- Screenshot generation: <30s per page

## Screenshot Management Workflow

**Decision**: Manual trigger with automated consistency checking
**Rationale**:
- Screenshots triggered via GitHub issue comment or workflow dispatch
- Automated comparison with previous versions to detect UI changes
- Batch processing for multiple pages/views
- Storage in Git LFS for version control without repository bloat

**Workflow Steps**:
1. Start frontend and backend applications
2. Navigate to each documented page/view
3. Wait for content to load and stabilize
4. Capture screenshots in multiple viewports (desktop, tablet, mobile)
5. Optimize images and commit to repository
6. Update markdown content with new screenshot references

## Development Workflow Integration

**Decision**: Seamless integration with existing development setup
**Rationale**:
- Documentation package added to existing PNPM workspace
- Shared types package provides consistency with main application
- Local development server for live preview during writing
- Git hooks for content validation before commit

**Integration Points**:
- Package.json scripts aligned with existing conventions
- ESLint/Prettier configuration shared with main project
- TypeScript strict mode for build scripts
- Vitest for testing documentation build pipeline

## Risk Mitigation Strategies

**Identified Risks & Mitigations**:

1. **Screenshot drift from UI changes**
   - Mitigation: Automated screenshot comparison in CI
   - Fallback: Manual review process for breaking changes

2. **GitHub Pages build failures**
   - Mitigation: Local build validation before push
   - Fallback: Rollback capability via GitHub Pages settings

3. **Content quality degradation**
   - Mitigation: Markdown linting and spell checking
   - Fallback: Content review process via pull requests

4. **Performance regression**
   - Mitigation: Lighthouse CI checks on every deployment
   - Fallback: CDN optimization and image compression

5. **Maintenance overhead**
   - Mitigation: Automated content generation where possible
   - Fallback: Documentation-as-code principles with developer ownership

## Technology Stack Summary

**Core Technologies**:
- **Build**: Vite + TypeScript + Rollup
- **Content**: Marked.js + Front Matter + Custom renderers
- **Styling**: Tailwind CSS + PostCSS + Autoprefixer
- **Screenshots**: Playwright + headless browsers
- **Deployment**: GitHub Actions + GitHub Pages
- **Testing**: Vitest + Lighthouse CI

**Development Tools**:
- **Linting**: ESLint + Markdownlint + Prettier
- **Type Checking**: TypeScript strict mode
- **Image Optimization**: Sharp + WebP conversion
- **Link Checking**: markdown-link-check
- **Performance**: Lighthouse CI + Web Vitals

---

**Next Phase**: Phase 1 - Design & Contracts (data-model.md, contracts/, quickstart.md)