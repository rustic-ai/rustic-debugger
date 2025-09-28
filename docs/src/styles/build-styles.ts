import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export interface StyleBuildOptions {
  inputDir: string;
  outputDir: string;
  minify: boolean;
  sourceMap: boolean;
  theme: 'light' | 'dark' | 'auto';
}

export class StyleBuilder {
  private options: StyleBuildOptions;

  constructor(options: StyleBuildOptions) {
    this.options = options;
  }

  async buildStyles(): Promise<void> {
    await mkdir(this.options.outputDir, { recursive: true });

    // Generate main CSS file with Rustic.ai design system
    const mainCss = this.generateMainStyles();
    await writeFile(path.join(this.options.outputDir, 'main.css'), mainCss);

    // Generate theme variants
    if (this.options.theme === 'auto') {
      const darkCss = this.generateDarkTheme();
      await writeFile(path.join(this.options.outputDir, 'dark.css'), darkCss);
    }

    // Generate print styles
    const printCss = this.generatePrintStyles();
    await writeFile(path.join(this.options.outputDir, 'print.css'), printCss);
  }

  private generateMainStyles(): string {
    return `
/* Rustic Debug Documentation Styles */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

/* CSS Reset and Base Styles */
*,
*::before,
*::after {
  box-sizing: border-box;
}

* {
  margin: 0;
}

html,
body {
  height: 100%;
}

body {
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

img,
picture,
video,
canvas,
svg {
  display: block;
  max-width: 100%;
}

input,
button,
textarea,
select {
  font: inherit;
}

p,
h1,
h2,
h3,
h4,
h5,
h6 {
  overflow-wrap: break-word;
}

/* CSS Variables for Rustic.ai Theme */
:root {
  /* Colors */
  --color-primary: #2563eb;
  --color-primary-50: #eff6ff;
  --color-primary-100: #dbeafe;
  --color-primary-500: #3b82f6;
  --color-primary-600: #2563eb;
  --color-primary-700: #1d4ed8;

  --color-secondary: #64748b;
  --color-accent: #06b6d4;

  /* Grays */
  --color-gray-50: #f8fafc;
  --color-gray-100: #f1f5f9;
  --color-gray-200: #e2e8f0;
  --color-gray-300: #cbd5e1;
  --color-gray-400: #94a3b8;
  --color-gray-500: #64748b;
  --color-gray-600: #475569;
  --color-gray-700: #334155;
  --color-gray-800: #1e293b;
  --color-gray-900: #0f172a;

  /* Status Colors */
  --color-success: #059669;
  --color-warning: #d97706;
  --color-error: #dc2626;
  --color-info: #0284c7;

  /* Typography */
  --font-family-sans: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-family-mono: 'JetBrains Mono', 'Fira Code', monospace;

  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-size-3xl: 1.875rem;
  --font-size-4xl: 2.25rem;

  /* Spacing */
  --spacing-xs: 0.5rem;
  --spacing-sm: 1rem;
  --spacing-md: 1.5rem;
  --spacing-lg: 2rem;
  --spacing-xl: 3rem;
  --spacing-2xl: 4rem;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);

  /* Border Radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;

  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
  --transition-slow: 350ms ease;
}

/* Dark theme variables */
.dark {
  --color-gray-50: #1e293b;
  --color-gray-100: #334155;
  --color-gray-200: #475569;
  --color-gray-300: #64748b;
  --color-gray-400: #94a3b8;
  --color-gray-500: #cbd5e1;
  --color-gray-600: #e2e8f0;
  --color-gray-700: #f1f5f9;
  --color-gray-800: #f8fafc;
  --color-gray-900: #ffffff;
}

/* Layout Components */
.documentation-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.sidebar {
  width: 16rem;
  background-color: var(--color-gray-50);
  border-right: 1px solid var(--color-gray-200);
  overflow-y: auto;
  position: sticky;
  top: 0;
  height: 100vh;
}

@media (max-width: 1024px) {
  .sidebar {
    display: none;
  }
}

.content {
  flex: 1;
  padding: var(--spacing-lg);
  max-width: none;
}

/* Header Styles */
.page-header {
  margin-bottom: var(--spacing-xl);
  padding-bottom: var(--spacing-lg);
  border-bottom: 1px solid var(--color-gray-200);
}

.page-header h1 {
  font-size: var(--font-size-3xl);
  font-weight: 700;
  color: var(--color-gray-900);
  margin-bottom: var(--spacing-sm);
}

.page-description {
  font-size: var(--font-size-lg);
  color: var(--color-gray-600);
  margin-bottom: var(--spacing-md);
}

/* Navigation Styles */
.nav-categories {
  list-style: none;
  padding: 0;
  margin: 0;
}

.nav-category {
  margin-bottom: var(--spacing-md);
}

.nav-category-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-gray-900);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
}

.nav-sections,
.nav-pages {
  list-style: none;
  padding: 0;
  margin: 0;
}

.nav-section {
  margin-bottom: var(--spacing-sm);
}

.nav-section-title {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-gray-700);
  margin-bottom: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
}

.nav-page-link {
  display: block;
  padding: var(--spacing-xs) var(--spacing-sm);
  color: var(--color-gray-600);
  text-decoration: none;
  border-radius: var(--radius-md);
  margin-bottom: 2px;
  transition: all var(--transition-fast);
  font-size: var(--font-size-sm);
}

.nav-page-link:hover {
  background-color: var(--color-gray-100);
  color: var(--color-gray-900);
}

.nav-page-link.active {
  background-color: var(--color-primary-50);
  color: var(--color-primary-700);
  font-weight: 500;
}

/* Breadcrumb Styles */
.breadcrumbs {
  margin-bottom: var(--spacing-lg);
}

.breadcrumbs ol {
  display: flex;
  align-items: center;
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: var(--font-size-sm);
}

.breadcrumb-item {
  display: flex;
  align-items: center;
}

.breadcrumb-item:not(:last-child)::after {
  content: '/';
  margin: 0 var(--spacing-xs);
  color: var(--color-gray-400);
}

.breadcrumb-item a {
  color: var(--color-gray-600);
  text-decoration: none;
}

.breadcrumb-item a:hover {
  color: var(--color-gray-900);
}

.breadcrumb-item.active {
  color: var(--color-gray-900);
  font-weight: 500;
}

/* Content Prose Styles */
.prose {
  max-width: 65ch;
  color: var(--color-gray-700);
  line-height: 1.7;
}

.prose h1,
.prose h2,
.prose h3,
.prose h4,
.prose h5,
.prose h6 {
  color: var(--color-gray-900);
  font-weight: 600;
  line-height: 1.25;
  margin-top: var(--spacing-xl);
  margin-bottom: var(--spacing-md);
}

.prose h1 {
  font-size: var(--font-size-3xl);
  margin-top: 0;
}

.prose h2 {
  font-size: var(--font-size-2xl);
  padding-bottom: var(--spacing-xs);
  border-bottom: 1px solid var(--color-gray-200);
}

.prose h3 {
  font-size: var(--font-size-xl);
}

.prose h4 {
  font-size: var(--font-size-lg);
}

.prose p {
  margin-bottom: var(--spacing-md);
}

.prose ul,
.prose ol {
  margin-bottom: var(--spacing-md);
  padding-left: var(--spacing-lg);
}

.prose li {
  margin-bottom: var(--spacing-xs);
}

.prose a {
  color: var(--color-primary-600);
  text-decoration: underline;
  text-decoration-color: var(--color-primary-200);
  text-underline-offset: 2px;
  transition: all var(--transition-fast);
}

.prose a:hover {
  text-decoration-color: var(--color-primary-600);
}

.prose strong {
  font-weight: 600;
  color: var(--color-gray-900);
}

.prose em {
  font-style: italic;
}

.prose code {
  font-family: var(--font-family-mono);
  font-size: 0.875em;
  background-color: var(--color-gray-100);
  padding: 0.125em 0.375em;
  border-radius: var(--radius-sm);
  color: var(--color-gray-800);
}

.prose pre {
  background-color: var(--color-gray-900);
  color: var(--color-gray-100);
  padding: var(--spacing-md);
  border-radius: var(--radius-lg);
  overflow-x: auto;
  margin-bottom: var(--spacing-md);
  font-family: var(--font-family-mono);
  font-size: var(--font-size-sm);
  line-height: 1.5;
}

.prose pre code {
  background: none;
  padding: 0;
  color: inherit;
  font-size: inherit;
}

.prose blockquote {
  border-left: 4px solid var(--color-primary-200);
  padding-left: var(--spacing-md);
  margin: var(--spacing-lg) 0;
  font-style: italic;
  color: var(--color-gray-600);
}

.prose img {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  margin: var(--spacing-lg) 0;
}

.prose table {
  width: 100%;
  border-collapse: collapse;
  margin: var(--spacing-lg) 0;
}

.prose th,
.prose td {
  border: 1px solid var(--color-gray-200);
  padding: var(--spacing-xs) var(--spacing-sm);
  text-align: left;
}

.prose th {
  background-color: var(--color-gray-50);
  font-weight: 600;
}

/* Code Block Styles */
.code-block {
  position: relative;
  margin: var(--spacing-lg) 0;
}

.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--color-gray-100);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  border-bottom: 1px solid var(--color-gray-200);
}

.code-language {
  font-size: var(--font-size-xs);
  font-weight: 500;
  color: var(--color-gray-600);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.code-copy {
  background: none;
  border: none;
  color: var(--color-gray-500);
  cursor: pointer;
  padding: var(--spacing-xs);
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.code-copy:hover {
  background-color: var(--color-gray-200);
  color: var(--color-gray-700);
}

/* Blockquote Variants */
.blockquote {
  display: flex;
  margin: var(--spacing-lg) 0;
  padding: var(--spacing-md);
  border-radius: var(--radius-lg);
  border-left: 4px solid;
}

.blockquote-icon {
  flex-shrink: 0;
  margin-right: var(--spacing-sm);
  margin-top: 2px;
}

.blockquote-content {
  flex: 1;
}

.blockquote-info {
  background-color: var(--color-primary-50);
  border-color: var(--color-primary-500);
  color: var(--color-primary-900);
}

.blockquote-warning {
  background-color: #fef3c7;
  border-color: var(--color-warning);
  color: #92400e;
}

.blockquote-error {
  background-color: #fee2e2;
  border-color: var(--color-error);
  color: #991b1b;
}

.blockquote-tip {
  background-color: #ecfdf5;
  border-color: var(--color-success);
  color: #065f46;
}

/* Table of Contents */
.table-of-contents {
  position: sticky;
  top: var(--spacing-lg);
  width: 14rem;
  flex-shrink: 0;
  padding: var(--spacing-md);
  background-color: var(--color-gray-50);
  border-radius: var(--radius-lg);
  height: fit-content;
}

.table-of-contents h2 {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-gray-900);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--spacing-sm);
}

.toc-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.toc-item {
  margin-bottom: var(--spacing-xs);
}

.toc-link {
  display: block;
  padding: var(--spacing-xs);
  color: var(--color-gray-600);
  text-decoration: none;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  line-height: 1.4;
  transition: all var(--transition-fast);
}

.toc-link:hover {
  background-color: var(--color-gray-100);
  color: var(--color-gray-900);
}

.toc-link.active {
  background-color: var(--color-primary-50);
  color: var(--color-primary-700);
  font-weight: 500;
}

/* Page Navigation */
.page-footer {
  margin-top: var(--spacing-2xl);
  padding-top: var(--spacing-xl);
  border-top: 1px solid var(--color-gray-200);
}

.page-navigation {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--spacing-lg);
}

.nav-link {
  display: flex;
  align-items: center;
  padding: var(--spacing-md);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-lg);
  text-decoration: none;
  color: var(--color-gray-700);
  transition: all var(--transition-fast);
  max-width: 20rem;
}

.nav-link:hover {
  background-color: var(--color-gray-50);
  border-color: var(--color-gray-300);
}

.nav-previous {
  margin-right: auto;
}

.nav-next {
  margin-left: auto;
  text-align: right;
}

/* Page Meta */
.page-meta {
  display: flex;
  gap: var(--spacing-md);
  font-size: var(--font-size-sm);
  color: var(--color-gray-500);
}

.page-meta span {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

/* Responsive Images */
.responsive-image {
  height: auto;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

/* Utility Classes */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.hidden {
  display: none;
}

.rotate-90 {
  transform: rotate(90deg);
}

/* Focus States */
*:focus-visible {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 2px;
}

/* Smooth Scrolling */
@media (prefers-reduced-motion: no-preference) {
  html {
    scroll-behavior: smooth;
  }
}

/* Mobile Styles */
@media (max-width: 768px) {
  .content {
    padding: var(--spacing-md);
  }

  .page-header h1 {
    font-size: var(--font-size-2xl);
  }

  .prose {
    max-width: none;
  }

  .page-navigation {
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .nav-link {
    max-width: none;
  }

  .table-of-contents {
    display: none;
  }
}
`;
  }

  private generateDarkTheme(): string {
    return `
/* Dark theme overrides */
.dark {
  color-scheme: dark;
}

.dark .prose {
  color: var(--color-gray-300);
}

.dark .prose h1,
.dark .prose h2,
.dark .prose h3,
.dark .prose h4,
.dark .prose h5,
.dark .prose h6 {
  color: var(--color-gray-100);
}

.dark .prose code {
  background-color: var(--color-gray-800);
  color: var(--color-gray-200);
}

.dark .prose pre {
  background-color: var(--color-gray-900);
  color: var(--color-gray-100);
}

.dark .prose blockquote {
  border-color: var(--color-primary-400);
  color: var(--color-gray-400);
}

.dark .prose th {
  background-color: var(--color-gray-800);
}

.dark .prose th,
.dark .prose td {
  border-color: var(--color-gray-700);
}
`;
  }

  private generatePrintStyles(): string {
    return `
/* Print styles */
@media print {
  @page {
    margin: 1in;
  }

  body {
    font-size: 12pt;
    line-height: 1.4;
    color: black;
    background: white;
  }

  .sidebar,
  .table-of-contents,
  .page-navigation,
  .breadcrumbs,
  .code-copy {
    display: none !important;
  }

  .content {
    padding: 0;
    max-width: none;
  }

  .prose {
    max-width: none;
  }

  .prose h1,
  .prose h2,
  .prose h3,
  .prose h4,
  .prose h5,
  .prose h6 {
    break-after: avoid;
    page-break-after: avoid;
  }

  .prose pre,
  .prose blockquote,
  .prose img {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .prose a {
    text-decoration: none;
    color: black;
  }

  .prose a::after {
    content: " (" attr(href) ")";
    font-size: 0.8em;
    color: #666;
  }

  .prose code {
    background: #f5f5f5;
    padding: 0.1em 0.2em;
    border: 1px solid #ddd;
  }

  .prose pre {
    background: #f8f8f8;
    border: 1px solid #ddd;
    overflow: visible;
    white-space: pre-wrap;
  }
}
`;
  }
}

export default StyleBuilder;