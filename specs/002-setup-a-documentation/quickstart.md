# Quickstart: Documentation Website Setup

**Generated**: 2025-09-28 | **Phase**: 1 | **Duration**: ~30 minutes

## Prerequisites

Before starting, ensure you have:

- [x] **Node.js 18+** - Check with `node --version`
- [x] **PNPM 8+** - Check with `pnpm --version`
- [x] **Git** - For version control and GitHub Pages
- [x] **Repository access** - Write permissions to create branches and workflows
- [x] **GitHub Pages enabled** - In repository settings

## Quick Setup (5 minutes)

### 1. Create Documentation Package

```bash
# From repository root
mkdir -p docs/src/{content,components,scripts,styles,templates}
mkdir -p docs/src/content/{user-guide,dev-guide}
mkdir -p docs/tests/{build,screenshots,visual}

# Initialize package.json
cd docs
cat > package.json << 'EOF'
{
  "name": "@rustic-debug/docs",
  "version": "0.1.0",
  "description": "Documentation website for Rustic Debug",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite dev --port 5173",
    "build": "vite build",
    "preview": "vite preview",
    "validate": "markdownlint src/content/**/*.md",
    "check-links": "markdown-link-check src/content/**/*.md",
    "screenshots": "tsx scripts/screenshots.ts",
    "optimize-images": "tsx scripts/optimize-images.ts",
    "lighthouse-ci": "lhci autorun"
  },
  "dependencies": {
    "marked": "^9.1.2",
    "gray-matter": "^4.0.3",
    "vite": "^5.0.10",
    "typescript": "^5.3.3"
  },
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "markdownlint-cli": "^0.37.0",
    "markdown-link-check": "^3.11.2",
    "tsx": "^4.7.0"
  }
}
EOF
```

### 2. Add to Workspace

```bash
# Update root pnpm-workspace.yaml
echo "  - 'docs'" >> ../pnpm-workspace.yaml

# Install dependencies
cd ..
pnpm install
```

### 3. Create Basic Configuration

```bash
cd docs

# Vite config
cat > vite.config.ts << 'EOF'
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true
  },
  publicDir: '../public'
});
EOF

# TypeScript config
cat > tsconfig.json << 'EOF'
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "module": "ESNext",
    "target": "ES2020",
    "moduleResolution": "bundler"
  },
  "include": ["src/**/*", "scripts/**/*"]
}
EOF
```

## Content Creation (10 minutes)

### 1. Create Sample Content

```bash
# User guide homepage
cat > src/content/user-guide/index.md << 'EOF'
---
title: User Guide
description: Learn how to use Rustic Debug for monitoring and debugging
sidebar:
  category: user-guide
  order: 1
---

# User Guide

Welcome to the Rustic Debug user guide. This section covers everything you need to know to effectively use the debugging interface.

## Getting Started

1. **Access the Dashboard** - Navigate to the main dashboard to see real-time message flow
2. **View Debug Messages** - Browse and filter debug messages by topic and agent
3. **Export Data** - Export message data for analysis
4. **Manage Cache** - Monitor and manage Redis cache

## Next Steps

- [Dashboard Overview](./dashboard/overview.md)
- [Message Debugging](./debugging/messages.md)
EOF

# Developer guide homepage
cat > src/content/dev-guide/index.md << 'EOF'
---
title: Developer Guide
description: Technical documentation for developers working with Rustic Debug
sidebar:
  category: dev-guide
  order: 1
---

# Developer Guide

Technical documentation for developers contributing to or integrating with Rustic Debug.

## Architecture Overview

Rustic Debug follows a modern monorepo architecture with clear separation between frontend, backend, and shared packages.

## Getting Started

1. **Development Setup** - Set up your local development environment
2. **Project Structure** - Understand the codebase organization
3. **API Reference** - Learn about available APIs and endpoints
4. **Contributing** - Guidelines for contributing code

## Integration

- [API Documentation](./api/overview.md)
- [WebSocket Events](./api/websockets.md)
- [Database Schema](./technical/database.md)
EOF
```

### 2. Create Build Script

```bash
cat > scripts/build.ts << 'EOF'
#!/usr/bin/env tsx

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { marked } from 'marked';
import matter from 'gray-matter';

interface PageData {
  id: string;
  title: string;
  content: string;
  metadata: any;
}

async function buildDocumentation() {
  console.log('Building documentation...');

  const contentDir = 'src/content';
  const outputDir = 'dist';

  // Collect all markdown files
  const pages: PageData[] = [];

  function scanDirectory(dir: string) {
    const items = readdirSync(dir);

    for (const item of items) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (extname(item) === '.md') {
        const content = readFileSync(fullPath, 'utf-8');
        const { data: frontmatter, content: markdown } = matter(content);

        const id = fullPath.replace(contentDir + '/', '').replace('.md', '');

        pages.push({
          id,
          title: frontmatter.title || basename(fullPath, '.md'),
          content: marked(markdown),
          metadata: frontmatter
        });
      }
    }
  }

  scanDirectory(contentDir);

  console.log(`Built ${pages.length} pages`);

  // Generate simple HTML for each page
  for (const page of pages) {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>${page.title} - Rustic Debug Documentation</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
  <h1>${page.title}</h1>
  ${page.content}
</body>
</html>`;

    writeFileSync(`${outputDir}/${page.id}.html`, html);
  }

  console.log('Documentation build complete!');
}

buildDocumentation().catch(console.error);
EOF

chmod +x scripts/build.ts
```

## GitHub Pages Setup (10 minutes)

### 1. Create GitHub Actions Workflow

```bash
mkdir -p ../.github/workflows

cat > ../.github/workflows/docs-deploy.yml << 'EOF'
name: Deploy Documentation

on:
  push:
    branches: [main]
    paths: ['docs/**']
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'pnpm'

      - run: pnpm install
      - run: cd docs && pnpm run build

      - uses: actions/upload-pages-artifact@v3
        with:
          path: docs/dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
EOF
```

### 2. Enable GitHub Pages

1. Go to repository **Settings** → **Pages**
2. Set **Source** to "GitHub Actions"
3. Click **Save**

## Testing the Setup (5 minutes)

### 1. Local Development

```bash
# Start local development server
cd docs
pnpm run dev

# Open browser to http://localhost:5173
```

### 2. Build Test

```bash
# Test build process
pnpm run build

# Preview built site
pnpm run preview
```

### 3. Deploy Test

```bash
# Commit and push changes
git add .
git commit -m "feat: add documentation website foundation"
git push origin main

# Check GitHub Actions tab for deployment progress
```

## Verification Checklist

After setup completion, verify:

- [ ] **Local development works** - `pnpm run dev` serves content
- [ ] **Build succeeds** - `pnpm run build` creates dist/ directory
- [ ] **GitHub Actions runs** - Workflow triggers on push
- [ ] **GitHub Pages deploys** - Site accessible at your-org.github.io/your-repo
- [ ] **Content renders** - Markdown converts to HTML correctly

## Next Steps

With the foundation in place, you can:

1. **Add Content** - Create more markdown files in `src/content/`
2. **Customize Styling** - Implement rustic.ai theme
3. **Add Screenshots** - Set up automated screenshot capture
4. **Improve Navigation** - Build hierarchical sidebar
5. **Optimize Performance** - Add image optimization and caching

## Troubleshooting

### Build Fails
```bash
# Check for syntax errors
cd docs
pnpm run validate

# Check TypeScript compilation
npx tsc --noEmit
```

### GitHub Pages Not Deploying
- Verify repository has Pages enabled in Settings
- Check Actions tab for workflow errors
- Ensure main branch protection rules allow Actions

### Local Development Issues
```bash
# Clear cache and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Check port availability
lsof -i :5173
```

---

**Next**: Complete implementation with theming, screenshots, and advanced features