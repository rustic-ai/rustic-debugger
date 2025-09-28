#!/usr/bin/env tsx

import { readFile, writeFile, mkdir, rmdir, stat } from 'fs/promises';
import path from 'path';
import { BuildConfig, BuildContext, BuildMetrics, BuildError, BuildWarning, BuildLogger, BuildHook, BuildStage } from '@/types/BuildConfig';
import MarkdownProcessor from './markdown-processor';
import ContentScanner from './content-scanner';
import NavigationBuilder from './navigation-builder';
import AssetOptimizer from './asset-optimizer';

export class DocumentationBuilder {
  private config: BuildConfig;
  private context: BuildContext;
  private logger: BuildLogger;
  private hooks: Map<BuildStage, BuildHook[]> = new Map();

  constructor(config: BuildConfig) {
    this.config = config;
    this.logger = this.createLogger();
    this.context = {
      config,
      metrics: this.initializeMetrics(),
      cache: new Map(),
      logger: this.logger
    };
  }

  async build(): Promise<BuildMetrics> {
    this.logger.info('Starting documentation build...');
    this.context.metrics.startTime = new Date();

    try {
      await this.runBuildStages();
      this.context.metrics.endTime = new Date();
      this.context.metrics.duration = this.context.metrics.endTime.getTime() - this.context.metrics.startTime.getTime();

      this.logger.info(`Build completed successfully in ${this.context.metrics.duration}ms`);
      await this.generateBuildReport();

      return this.context.metrics;
    } catch (error) {
      this.logger.error('Build failed:', error);
      this.addError('system', error.message);
      throw error;
    }
  }

  private async runBuildStages(): Promise<void> {
    const stages: BuildStage[] = [
      'pre-build',
      'content-scan',
      'content-process',
      'asset-process',
      'template-render',
      'post-build',
      'validate'
    ];

    for (const stage of stages) {
      this.logger.time(`stage-${stage}`);
      await this.runStage(stage);
      this.logger.timeEnd(`stage-${stage}`);
    }
  }

  private async runStage(stage: BuildStage): Promise<void> {
    this.logger.info(`Running stage: ${stage}`);

    // Run pre-stage hooks
    await this.runHooks(stage);

    switch (stage) {
      case 'pre-build':
        await this.preBuild();
        break;
      case 'content-scan':
        await this.scanContent();
        break;
      case 'content-process':
        await this.processContent();
        break;
      case 'asset-process':
        await this.processAssets();
        break;
      case 'template-render':
        await this.renderTemplates();
        break;
      case 'post-build':
        await this.postBuild();
        break;
      case 'validate':
        await this.validateBuild();
        break;
    }
  }

  private async preBuild(): Promise<void> {
    this.logger.info('Preparing build environment...');

    // Clean output directory
    try {
      await rmdir(this.config.outputDir, { recursive: true });
    } catch (error) {
      // Directory might not exist, that's okay
    }

    // Create output directory structure
    await mkdir(this.config.outputDir, { recursive: true });
    await mkdir(path.join(this.config.outputDir, 'assets'), { recursive: true });
    await mkdir(path.join(this.config.outputDir, 'images'), { recursive: true });
    await mkdir(path.join(this.config.outputDir, 'css'), { recursive: true });
    await mkdir(path.join(this.config.outputDir, 'js'), { recursive: true });

    this.logger.info('Build environment prepared');
  }

  private async scanContent(): Promise<void> {
    this.logger.info('Scanning content files...');

    const scanner = new ContentScanner({
      baseDir: this.config.contentDir,
      contentDirs: ['user-guide', 'dev-guide', 'api', 'examples'],
      extensions: ['md', 'mdx'],
      ignorePatterns: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
      validateContent: true,
      checkDuplicates: true,
      checkOrphans: true
    });

    const scanResult = await scanner.scanContent();

    // Store scan results in context
    this.context.cache.set('scanResult', scanResult);
    this.context.cache.set('contentPages', scanResult.pages);

    // Update metrics
    this.context.metrics.pagesProcessed = scanResult.pages.length;

    // Add validation errors/warnings to build metrics
    for (const error of scanResult.validation.errors) {
      this.addError('markdown', error.message, error.filePath);
    }

    for (const warning of scanResult.validation.warnings) {
      this.addWarning('content', warning.message, warning.filePath, warning.severity);
    }

    this.logger.info(`Found ${scanResult.pages.length} content pages`);
  }

  private async processContent(): Promise<void> {
    this.logger.info('Processing markdown content...');

    const contentPages = this.context.cache.get('contentPages');
    if (!contentPages) {
      throw new Error('Content pages not found in cache');
    }

    const processor = new MarkdownProcessor({
      baseDir: this.config.contentDir,
      outputDir: this.config.outputDir,
      gfm: this.config.markdown.gfm,
      breaks: this.config.markdown.breaks,
      linkify: this.config.markdown.linkify,
      typographer: this.config.markdown.typographer,
      syntaxHighlighting: this.config.markdown.syntaxHighlighting
    });

    const processedPages = [];

    for (const pageInfo of contentPages) {
      try {
        const page = await processor.processFile(pageInfo.relativePath);
        processedPages.push(page);
      } catch (error) {
        this.addError('markdown', `Failed to process ${pageInfo.relativePath}: ${error.message}`, pageInfo.filePath);
      }
    }

    // Store processed pages
    this.context.cache.set('processedPages', processedPages);

    this.logger.info(`Processed ${processedPages.length} markdown files`);
  }

  private async processAssets(): Promise<void> {
    this.logger.info('Optimizing assets...');

    const optimizer = new AssetOptimizer({
      inputDir: this.config.assetsDir,
      outputDir: path.join(this.config.outputDir, 'assets'),
      imageFormats: [
        { format: 'webp', quality: 85, enabled: true },
        { format: 'jpeg', quality: 80, enabled: true },
        { format: 'png', quality: 90, enabled: true }
      ],
      quality: { webp: 85, jpeg: 80, png: 90 },
      sizes: [320, 640, 960, 1280, 1920],
      enableLazyLoading: true,
      generatePlaceholders: true,
      fingerprint: this.config.assets.fingerprint,
      compress: this.config.assets.compress
    });

    const manifest = await optimizer.optimizeAssets();

    // Store asset manifest
    this.context.cache.set('assetManifest', manifest);

    // Update metrics
    this.context.metrics.assetsProcessed = manifest.assets.length;
    this.context.metrics.imagesOptimized = manifest.assets.filter(a => a.type === 'image').length;

    this.logger.info(`Optimized ${manifest.assets.length} assets`);
  }

  private async renderTemplates(): Promise<void> {
    this.logger.info('Rendering HTML templates...');

    const processedPages = this.context.cache.get('processedPages');
    if (!processedPages) {
      throw new Error('Processed pages not found in cache');
    }

    // Build navigation
    const navigationBuilder = new NavigationBuilder({
      maxDepth: this.config.navigation.maxDepth,
      defaultExpanded: this.config.navigation.collapsible,
      sortBy: this.config.navigation.sortBy,
      generateBreadcrumbs: this.config.navigation.breadcrumbs,
      generateTOC: true,
      tocMaxDepth: 3
    });

    const navigationResult = navigationBuilder.buildNavigation(processedPages);
    this.context.cache.set('navigation', navigationResult.navigation);

    // Generate HTML for each page
    const renderedPages = [];

    for (const page of processedPages) {
      try {
        const breadcrumbs = navigationBuilder.generateBreadcrumbs(page.id);
        const toc = navigationBuilder.generateTableOfContents(page);
        const { previous, next } = navigationBuilder.getAdjacentPages(page.id);

        const html = await this.renderPageTemplate(page, {
          navigation: navigationResult.navigation,
          breadcrumbs,
          toc,
          previous,
          next
        });

        // Write HTML file
        const outputPath = path.join(this.config.outputDir, `${page.slug}.html`);
        await writeFile(outputPath, html);

        renderedPages.push({
          page,
          outputPath,
          size: Buffer.byteLength(html, 'utf8')
        });

        this.context.metrics.htmlFiles++;
      } catch (error) {
        this.addError('template', `Failed to render ${page.title}: ${error.message}`, page.filePath);
      }
    }

    // Generate index page
    await this.generateIndexPage(navigationResult.navigation);

    // Generate category index pages
    for (const category of navigationResult.navigation.categories) {
      await this.generateCategoryIndexPage(category, processedPages);
    }

    this.context.cache.set('renderedPages', renderedPages);
    this.logger.info(`Rendered ${renderedPages.length} HTML pages`);
  }

  private async renderPageTemplate(page: any, templateData: any): Promise<string> {
    // Simple template rendering - in a real implementation, you'd use a template engine
    const template = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${page.title} | Rustic Debug Documentation</title>
    <meta name="description" content="${page.description || page.excerpt || ''}">
    <link rel="stylesheet" href="/css/main.css">
    ${this.config.githubPages.enabled ? `<base href="${this.config.baseUrl}">` : ''}
</head>
<body>
    <div class="documentation-layout">
        <nav class="sidebar">
            ${this.renderNavigation(templateData.navigation)}
        </nav>

        <main class="content">
            <header class="page-header">
                ${this.renderBreadcrumbs(templateData.breadcrumbs)}
                <h1>${page.title}</h1>
                ${page.description ? `<p class="page-description">${page.description}</p>` : ''}
            </header>

            <div class="page-content">
                <div class="prose">
                    ${page.htmlContent}
                </div>

                ${templateData.toc.items.length > 0 ? `
                <aside class="table-of-contents">
                    <h2>Table of Contents</h2>
                    ${this.renderTableOfContents(templateData.toc)}
                </aside>
                ` : ''}
            </div>

            <footer class="page-footer">
                <div class="page-navigation">
                    ${templateData.previous ? `<a href="/${templateData.previous.path}" class="nav-link nav-previous">← ${templateData.previous.title}</a>` : ''}
                    ${templateData.next ? `<a href="/${templateData.next.path}" class="nav-link nav-next">${templateData.next.title} →</a>` : ''}
                </div>

                <div class="page-meta">
                    <p>Last updated: ${page.lastModified.toLocaleDateString()}</p>
                    <p>Reading time: ${page.estimatedReadTime} min</p>
                </div>
            </footer>
        </main>
    </div>

    <script src="/js/main.js"></script>
</body>
</html>`;

    return template;
  }

  private renderNavigation(navigation: any): string {
    let html = '<ul class="nav-categories">';

    for (const category of navigation.categories) {
      html += `<li class="nav-category">`;
      html += `<h3 class="nav-category-title">${category.title}</h3>`;

      if (category.sections.length > 0) {
        html += '<ul class="nav-sections">';
        for (const section of category.sections) {
          html += `<li class="nav-section">`;
          html += `<h4 class="nav-section-title">${section.title}</h4>`;
          html += '<ul class="nav-pages">';
          for (const page of section.pages) {
            html += `<li><a href="${page.path}" class="nav-page-link">${page.title}</a></li>`;
          }
          html += '</ul></li>';
        }
        html += '</ul>';
      }

      if (category.pages.length > 0) {
        html += '<ul class="nav-pages">';
        for (const page of category.pages) {
          html += `<li><a href="${page.path}" class="nav-page-link">${page.title}</a></li>`;
        }
        html += '</ul>';
      }

      html += '</li>';
    }

    html += '</ul>';
    return html;
  }

  private renderBreadcrumbs(breadcrumbs: any): string {
    if (!breadcrumbs.items.length) return '';

    let html = '<nav class="breadcrumbs"><ol>';

    for (const item of breadcrumbs.items) {
      if (item.isActive) {
        html += `<li class="breadcrumb-item active">${item.title}</li>`;
      } else {
        html += `<li class="breadcrumb-item"><a href="${item.path}">${item.title}</a></li>`;
      }
    }

    html += '</ol></nav>';
    return html;
  }

  private renderTableOfContents(toc: any): string {
    if (!toc.items.length) return '';

    const renderTocList = (items: any[]): string => {
      let html = '<ul class="toc-list">';
      for (const item of items) {
        html += `<li class="toc-item">`;
        html += `<a href="${item.anchor}" class="toc-link">${item.text}</a>`;
        if (item.children && item.children.length > 0) {
          html += renderTocList(item.children);
        }
        html += '</li>';
      }
      html += '</ul>';
      return html;
    };

    return renderTocList(toc.items);
  }

  private async generateIndexPage(navigation: any): Promise<void> {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rustic Debug Documentation</title>
    <meta name="description" content="Complete documentation for Rustic Debug - the Redis messaging debugger for RusticAI">
    <link rel="stylesheet" href="/css/main.css">
</head>
<body>
    <div class="documentation-layout">
        <header class="hero">
            <h1>Rustic Debug Documentation</h1>
            <p>Complete guide to debugging Redis messaging in RusticAI applications</p>
        </header>

        <main class="content">
            <div class="category-grid">
                ${navigation.categories.map(category => `
                    <div class="category-card">
                        <h2>${category.title}</h2>
                        <p>${category.description}</p>
                        <ul>
                            ${category.sections.slice(0, 3).map(section =>
                                `<li><a href="/${section.pages[0]?.path || ''}">${section.title}</a></li>`
                            ).join('')}
                        </ul>
                    </div>
                `).join('')}
            </div>
        </main>
    </div>
    <script src="/js/main.js"></script>
</body>
</html>`;

    await writeFile(path.join(this.config.outputDir, 'index.html'), html);
    this.context.metrics.htmlFiles++;
  }

  private async generateCategoryIndexPage(category: any, pages: any[]): Promise<void> {
    const categoryPages = pages.filter(page => page.sidebar.category === category.id);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${category.title} | Rustic Debug Documentation</title>
    <meta name="description" content="${category.description}">
    <link rel="stylesheet" href="/css/main.css">
</head>
<body>
    <div class="documentation-layout">
        <main class="content">
            <header class="page-header">
                <h1>${category.title}</h1>
                <p>${category.description}</p>
            </header>

            <div class="page-list">
                ${categoryPages.map(page => `
                    <article class="page-card">
                        <h2><a href="/${page.slug}">${page.title}</a></h2>
                        <p>${page.description || page.excerpt || ''}</p>
                        <div class="page-meta">
                            <span>Reading time: ${page.estimatedReadTime} min</span>
                            <span>Last updated: ${page.lastModified.toLocaleDateString()}</span>
                        </div>
                    </article>
                `).join('')}
            </div>
        </main>
    </div>
    <script src="/js/main.js"></script>
</body>
</html>`;

    await writeFile(path.join(this.config.outputDir, `${category.id}.html`), html);
    this.context.metrics.htmlFiles++;
  }

  private async postBuild(): Promise<void> {
    this.logger.info('Running post-build tasks...');

    // Generate sitemap
    await this.generateSitemap();

    // Generate robots.txt
    await this.generateRobotsTxt();

    // Copy static assets
    await this.copyStaticAssets();

    this.logger.info('Post-build tasks completed');
  }

  private async validateBuild(): Promise<void> {
    this.logger.info('Validating build...');

    if (this.config.validation.htmlValidation) {
      await this.validateHtml();
    }

    if (this.config.validation.linkCheck) {
      await this.validateLinks();
    }

    if (this.config.validation.performance) {
      await this.validatePerformance();
    }

    this.logger.info('Build validation completed');
  }

  private async generateSitemap(): Promise<void> {
    const renderedPages = this.context.cache.get('renderedPages') || [];
    const baseUrl = this.config.baseUrl;

    let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
    sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Add index page
    sitemap += `  <url>\n`;
    sitemap += `    <loc>${baseUrl}/</loc>\n`;
    sitemap += `    <lastmod>${new Date().toISOString()}</lastmod>\n`;
    sitemap += `    <priority>1.0</priority>\n`;
    sitemap += `  </url>\n`;

    // Add all pages
    for (const { page } of renderedPages) {
      sitemap += `  <url>\n`;
      sitemap += `    <loc>${baseUrl}/${page.slug}</loc>\n`;
      sitemap += `    <lastmod>${page.lastModified.toISOString()}</lastmod>\n`;
      sitemap += `    <priority>0.8</priority>\n`;
      sitemap += `  </url>\n`;
    }

    sitemap += '</urlset>';

    await writeFile(path.join(this.config.outputDir, 'sitemap.xml'), sitemap);
  }

  private async generateRobotsTxt(): Promise<void> {
    const robots = `User-agent: *
Allow: /

Sitemap: ${this.config.baseUrl}/sitemap.xml`;

    await writeFile(path.join(this.config.outputDir, 'robots.txt'), robots);
  }

  private async copyStaticAssets(): Promise<void> {
    // In a real implementation, you'd copy CSS, JS, and other static assets
    this.logger.info('Copying static assets...');

    // Create basic CSS
    const css = `/* Basic styles for documentation */
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
.documentation-layout { display: flex; min-height: 100vh; }
.sidebar { width: 250px; background: #f8f9fa; padding: 1rem; }
.content { flex: 1; padding: 2rem; }
.prose { max-width: 65ch; }`;

    await writeFile(path.join(this.config.outputDir, 'css', 'main.css'), css);

    // Create basic JS
    const js = `// Basic JavaScript for documentation
console.log('Rustic Debug Documentation loaded');`;

    await writeFile(path.join(this.config.outputDir, 'js', 'main.js'), js);

    this.context.metrics.cssFiles = 1;
    this.context.metrics.jsFiles = 1;
  }

  private async validateHtml(): Promise<void> {
    // Placeholder for HTML validation
    this.logger.info('HTML validation skipped (not implemented)');
  }

  private async validateLinks(): Promise<void> {
    // Placeholder for link validation
    this.logger.info('Link validation skipped (not implemented)');
  }

  private async validatePerformance(): Promise<void> {
    // Placeholder for performance validation
    this.logger.info('Performance validation skipped (not implemented)');
  }

  private async generateBuildReport(): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      duration: this.context.metrics.duration,
      pages: this.context.metrics.pagesProcessed,
      assets: this.context.metrics.assetsProcessed,
      errors: this.context.metrics.errors.length,
      warnings: this.context.metrics.warnings.length,
      outputSize: await this.calculateOutputSize()
    };

    await writeFile(
      path.join(this.config.outputDir, 'build-report.json'),
      JSON.stringify(report, null, 2)
    );

    this.logger.info('Build report generated');
  }

  private async calculateOutputSize(): Promise<number> {
    // Placeholder - would recursively calculate directory size
    return 0;
  }

  private async runHooks(stage: BuildStage): Promise<void> {
    const stageHooks = this.hooks.get(stage) || [];
    for (const hook of stageHooks) {
      try {
        await hook.handler(this.context);
      } catch (error) {
        this.logger.error(`Hook ${hook.name} failed:`, error);
      }
    }
  }

  registerHook(hook: BuildHook): void {
    if (!this.hooks.has(hook.stage)) {
      this.hooks.set(hook.stage, []);
    }
    this.hooks.get(hook.stage)!.push(hook);
  }

  private addError(type: BuildError['type'], message: string, file?: string): void {
    this.context.metrics.errors.push({
      type,
      message,
      file,
      timestamp: new Date()
    });
  }

  private addWarning(type: BuildWarning['type'], message: string, file?: string, severity: BuildWarning['severity'] = 'medium'): void {
    this.context.metrics.warnings.push({
      type,
      message,
      file,
      severity,
      timestamp: new Date()
    });
  }

  private initializeMetrics(): BuildMetrics {
    return {
      startTime: new Date(),
      endTime: new Date(),
      duration: 0,
      pagesProcessed: 0,
      assetsProcessed: 0,
      imagesOptimized: 0,
      outputSize: 0,
      htmlFiles: 0,
      cssFiles: 0,
      jsFiles: 0,
      imageFiles: 0,
      cacheHitRate: 0,
      parallelEfficiency: 0,
      errors: [],
      warnings: []
    };
  }

  private createLogger(): BuildLogger {
    return {
      info: (message: string, data?: any) => console.log(`[INFO] ${message}`, data || ''),
      warn: (message: string, data?: any) => console.warn(`[WARN] ${message}`, data || ''),
      error: (message: string, data?: any) => console.error(`[ERROR] ${message}`, data || ''),
      debug: (message: string, data?: any) => console.log(`[DEBUG] ${message}`, data || ''),
      time: (label: string) => console.time(label),
      timeEnd: (label: string) => console.timeEnd(label)
    };
  }
}

// CLI entry point
export async function main() {
  const config: BuildConfig = {
    contentDir: 'src/content',
    outputDir: 'dist',
    assetsDir: 'src/assets',
    templatesDir: 'src/templates',
    markdown: {
      extensions: ['md', 'mdx'],
      frontMatter: true,
      gfm: true,
      breaks: false,
      linkify: true,
      typographer: true,
      customRenderers: {},
      syntaxHighlighting: {
        enabled: true,
        theme: 'github-light',
        languages: ['typescript', 'javascript', 'bash', 'json', 'yaml']
      },
      plugins: []
    },
    assets: {
      images: {
        formats: ['webp', 'jpeg', 'png'],
        quality: { webp: 85, jpeg: 80, png: 90, avif: 75 },
        sizes: [320, 640, 960, 1280, 1920],
        lazy: true,
        placeholder: true
      },
      copy: [],
      ignore: [],
      compress: true,
      fingerprint: true
    },
    navigation: {
      maxDepth: 3,
      autoGenerate: true,
      sortBy: 'order',
      collapsible: true,
      breadcrumbs: true,
      categories: [
        { id: 'user-guide', title: 'User Guide', path: '/user-guide', order: 1 },
        { id: 'dev-guide', title: 'Developer Guide', path: '/dev-guide', order: 2 },
        { id: 'api', title: 'API Reference', path: '/api', order: 3 },
        { id: 'examples', title: 'Examples', path: '/examples', order: 4 }
      ]
    },
    search: {
      enabled: true,
      engine: 'lunr',
      indexFields: ['title', 'content', 'description'],
      boost: { title: 2, description: 1.5, content: 1 },
      stopWords: [],
      stemmer: true,
      preview: {
        length: 200,
        highlightTag: 'mark'
      }
    },
    watch: false,
    minify: true,
    sourceMap: false,
    parallel: true,
    baseUrl: 'https://rustic-debug.github.io',
    publicPath: '/',
    githubPages: {
      enabled: true,
      branch: 'gh-pages',
      spa: false,
      notFoundPage: '404.html'
    },
    cacheEnabled: true,
    cacheDir: '.cache',
    maxConcurrency: 4,
    devServer: {
      port: 3000,
      host: 'localhost',
      open: true,
      cors: true,
      https: false,
      hmr: true,
      liveReload: true,
      watchFiles: []
    },
    validation: {
      linkCheck: true,
      spellCheck: false,
      grammar: false,
      htmlValidation: false,
      accessibility: true,
      performance: true,
      thresholds: {
        performance: 90,
        accessibility: 95,
        seo: 90,
        bestPractices: 90
      },
      reports: {
        format: 'json',
        outputDir: 'reports',
        includeWarnings: true
      }
    }
  };

  const builder = new DocumentationBuilder(config);
  await builder.build();
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default DocumentationBuilder;