import { marked } from 'marked';
import { gfmHeadingId } from 'marked-gfm-heading-id';
import { markedHighlight } from 'marked-highlight';
import matter from 'gray-matter';
import { readFile } from 'fs/promises';
import path from 'path';
import hljs from 'highlight.js';
import { DocumentationPage, PageFrontMatter, PageHeading, TableOfContentsItem } from '@/types/DocumentationPage';

export interface MarkdownProcessorOptions {
  baseDir: string;
  outputDir: string;
  gfm: boolean;
  breaks: boolean;
  linkify: boolean;
  typographer: boolean;
  syntaxHighlighting: {
    enabled: boolean;
    theme: string;
    languages: string[];
  };
}

export class MarkdownProcessor {
  private options: MarkdownProcessorOptions;
  private renderer: marked.Renderer;
  private headings: PageHeading[] = [];
  private tableOfContents: TableOfContentsItem[] = [];
  private wordCount = 0;
  private internalLinks: string[] = [];
  private externalLinks: string[] = [];

  constructor(options: MarkdownProcessorOptions) {
    this.options = options;
    this.renderer = new marked.Renderer();
    this.configureMarked();
    this.setupCustomRenderers();
  }

  private configureMarked(): void {
    // Configure marked with extensions
    marked.use(gfmHeadingId());

    if (this.options.syntaxHighlighting.enabled) {
      marked.use(markedHighlight({
        langPrefix: 'hljs language-',
        highlight: (code, lang) => {
          const language = hljs.getLanguage(lang) ? lang : 'plaintext';
          return hljs.highlight(code, { language }).value;
        }
      }));
    }

    // Set marked options
    marked.setOptions({
      gfm: this.options.gfm,
      breaks: this.options.breaks,
      renderer: this.renderer
    });
  }

  private setupCustomRenderers(): void {
    // Custom heading renderer to collect headings and generate TOC
    this.renderer.heading = (text: string, level: number) => {
      const id = this.generateHeadingId(text);
      const anchor = `#${id}`;

      // Store heading information
      this.headings.push({
        level,
        text: this.stripHtml(text),
        id,
        anchor
      });

      // Build table of contents
      this.addToTableOfContents(text, level, id);

      return `<h${level} id="${id}" class="heading-${level}">
        <a href="${anchor}" class="heading-anchor" aria-label="Link to ${this.stripHtml(text)}">
          ${text}
        </a>
      </h${level}>`;
    };

    // Custom link renderer to track internal/external links
    this.renderer.link = (href: string, title: string | null, text: string) => {
      const isExternal = this.isExternalLink(href);
      const titleAttr = title ? ` title="${title}"` : '';
      const relAttr = isExternal ? ' rel="noopener noreferrer"' : '';
      const targetAttr = isExternal ? ' target="_blank"' : '';

      // Track the link
      if (isExternal) {
        this.externalLinks.push(href);
      } else {
        this.internalLinks.push(href);
      }

      return `<a href="${href}"${titleAttr}${relAttr}${targetAttr} class="${isExternal ? 'external-link' : 'internal-link'}">${text}</a>`;
    };

    // Custom image renderer for responsive images
    this.renderer.image = (href: string, title: string | null, text: string) => {
      const titleAttr = title ? ` title="${title}"` : '';
      const altAttr = text ? ` alt="${text}"` : '';

      return `<img src="${href}"${altAttr}${titleAttr} class="responsive-image" loading="lazy" />`;
    };

    // Custom code block renderer with copy button
    this.renderer.code = (code: string, language?: string) => {
      const langClass = language ? ` class="language-${language}"` : '';
      const langLabel = language ? `<span class="code-language">${language}</span>` : '';

      return `<div class="code-block">
        <div class="code-header">
          ${langLabel}
          <button class="code-copy" data-code="${this.escapeHtml(code)}" title="Copy code">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="m5 15-4-4 4-4"></path>
            </svg>
          </button>
        </div>
        <pre><code${langClass}>${code}</code></pre>
      </div>`;
    };

    // Custom blockquote renderer with types
    this.renderer.blockquote = (quote: string) => {
      // Detect blockquote types (info, warning, error, tip)
      const typeMatch = quote.match(/^<p>\[!(\w+)\]/);
      const type = typeMatch ? typeMatch[1].toLowerCase() : 'note';
      const content = typeMatch ? quote.replace(/^<p>\[!\w+\]\s*/, '<p>') : quote;

      return `<blockquote class="blockquote blockquote-${type}">
        <div class="blockquote-icon">
          ${this.getBlockquoteIcon(type)}
        </div>
        <div class="blockquote-content">${content}</div>
      </blockquote>`;
    };
  }

  async processFile(filePath: string): Promise<DocumentationPage> {
    const fullPath = path.resolve(this.options.baseDir, filePath);
    const fileContent = await readFile(fullPath, 'utf-8');

    // Reset processing state
    this.headings = [];
    this.tableOfContents = [];
    this.internalLinks = [];
    this.externalLinks = [];
    this.wordCount = 0;

    // Parse front matter
    const { data: frontMatter, content } = matter(fileContent) as {
      data: PageFrontMatter;
      content: string;
    };

    // Validate front matter
    this.validateFrontMatter(frontMatter, filePath);

    // Process markdown content
    const htmlContent = await marked.parse(content);

    // Count words
    this.wordCount = this.countWords(content);

    // Generate page ID and slug
    const id = this.generatePageId(filePath);
    const slug = this.generateSlug(frontMatter.title, filePath);

    // Extract keywords from content
    const searchKeywords = this.extractKeywords(content, frontMatter.title);

    // Generate excerpt if not provided
    const excerpt = this.generateExcerpt(content);

    // Calculate estimated read time
    const estimatedReadTime = Math.ceil(this.wordCount / 200); // 200 words per minute

    // Get file stats
    const stats = await import('fs').then(fs => fs.promises.stat(fullPath));
    const lastModified = stats.mtime;

    // Generate output path
    const outputPath = this.generateOutputPath(slug);

    const page: DocumentationPage = {
      id,
      title: frontMatter.title,
      description: frontMatter.description,
      slug,
      content,
      htmlContent,
      excerpt,
      sidebar: frontMatter.sidebar,
      internalLinks: [...new Set(this.internalLinks)], // Remove duplicates
      externalLinks: [...new Set(this.externalLinks)],
      backlinks: [], // Will be populated later by navigation builder
      screenshots: this.extractScreenshotReferences(content),
      images: this.extractImageReferences(content),
      tags: frontMatter.tags || [],
      lastModified,
      searchKeywords,
      estimatedReadTime,
      filePath,
      outputPath
    };

    return page;
  }

  async processDirectory(dirPath: string): Promise<DocumentationPage[]> {
    const pages: DocumentationPage[] = [];
    const { glob } = await import('glob');

    const markdownFiles = await glob('**/*.{md,mdx}', {
      cwd: path.resolve(this.options.baseDir, dirPath),
      ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**']
    });

    for (const file of markdownFiles) {
      try {
        const page = await this.processFile(path.join(dirPath, file));
        pages.push(page);
      } catch (error) {
        console.error(`Error processing ${file}:`, error);
        throw new Error(`Failed to process markdown file: ${file}`);
      }
    }

    return pages.sort((a, b) => a.sidebar.order - b.sidebar.order);
  }

  private validateFrontMatter(frontMatter: PageFrontMatter, filePath: string): void {
    if (!frontMatter.title) {
      throw new Error(`Missing title in front matter: ${filePath}`);
    }

    if (!frontMatter.sidebar) {
      throw new Error(`Missing sidebar configuration in front matter: ${filePath}`);
    }

    if (!frontMatter.sidebar.category) {
      throw new Error(`Missing sidebar category in front matter: ${filePath}`);
    }

    if (typeof frontMatter.sidebar.order !== 'number') {
      throw new Error(`Invalid sidebar order in front matter: ${filePath}`);
    }

    const validCategories = ['user-guide', 'dev-guide', 'api', 'examples'];
    if (!validCategories.includes(frontMatter.sidebar.category)) {
      throw new Error(`Invalid sidebar category "${frontMatter.sidebar.category}" in ${filePath}. Must be one of: ${validCategories.join(', ')}`);
    }
  }

  private generatePageId(filePath: string): string {
    return filePath
      .replace(/\.(md|mdx)$/, '')
      .replace(/\//g, '-')
      .replace(/[^a-zA-Z0-9-]/g, '')
      .toLowerCase();
  }

  private generateSlug(title: string, filePath: string): string {
    // Use filename if title is not suitable for URL
    const filename = path.basename(filePath, path.extname(filePath));

    return title
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      || filename.toLowerCase().replace(/[^a-zA-Z0-9-]/g, '-');
  }

  private generateOutputPath(slug: string): string {
    return path.join(this.options.outputDir, `${slug}.html`);
  }

  private generateHeadingId(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  private addToTableOfContents(text: string, level: number, id: string): void {
    const item: TableOfContentsItem = {
      id,
      text: this.stripHtml(text),
      level,
      children: []
    };

    if (level === 1) {
      this.tableOfContents.push(item);
    } else {
      // Find parent heading to nest under
      let parent = this.tableOfContents[this.tableOfContents.length - 1];
      for (let i = level - 2; i > 0 && parent; i--) {
        const lastChild = parent.children?.[parent.children.length - 1];
        if (lastChild && lastChild.level < level) {
          parent = lastChild;
        } else {
          break;
        }
      }

      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(item);
      } else {
        this.tableOfContents.push(item);
      }
    }
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }

  private isExternalLink(href: string): boolean {
    return /^https?:\/\//.test(href) || href.startsWith('mailto:') || href.startsWith('tel:');
  }

  private countWords(text: string): number {
    return text
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0)
      .length;
  }

  private extractKeywords(content: string, title: string): string[] {
    const keywords = new Set<string>();

    // Add title words
    title.toLowerCase().split(/\s+/).forEach(word => {
      if (word.length > 2) keywords.add(word);
    });

    // Extract important words from content
    const text = content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/);

    const stopWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those']);

    text.forEach(word => {
      if (word.length > 3 && !stopWords.has(word)) {
        keywords.add(word);
      }
    });

    return Array.from(keywords).slice(0, 20); // Limit to 20 keywords
  }

  private generateExcerpt(content: string, maxLength: number = 200): string {
    const text = content
      .replace(/^---[\s\S]*?---/, '') // Remove front matter
      .replace(/#+\s+/g, '') // Remove headings
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
      .replace(/\*([^*]+)\*/g, '$1') // Remove italic
      .replace(/`([^`]+)`/g, '$1') // Remove inline code
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .trim();

    if (text.length <= maxLength) {
      return text;
    }

    // Find the last complete word within the limit
    const truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');

    return lastSpace > 0
      ? truncated.substring(0, lastSpace) + '...'
      : truncated + '...';
  }

  private extractScreenshotReferences(content: string): string[] {
    const screenshotRefs: string[] = [];
    const regex = /!\[([^\]]*)\]\(([^)]+\.(?:png|jpg|jpeg|gif|webp|svg))\)/gi;
    let match;

    while ((match = regex.exec(content)) !== null) {
      const imagePath = match[2];
      if (imagePath.includes('screenshot') || imagePath.includes('capture')) {
        screenshotRefs.push(imagePath);
      }
    }

    return screenshotRefs;
  }

  private extractImageReferences(content: string): string[] {
    const imageRefs: string[] = [];
    const regex = /!\[([^\]]*)\]\(([^)]+\.(?:png|jpg|jpeg|gif|webp|svg))\)/gi;
    let match;

    while ((match = regex.exec(content)) !== null) {
      imageRefs.push(match[2]);
    }

    return imageRefs;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private getBlockquoteIcon(type: string): string {
    const icons = {
      info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>',
      warning: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>',
      error: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/></svg>',
      tip: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z"/></svg>',
      note: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>'
    };

    return icons[type] || icons.note;
  }

  getProcessingResults() {
    return {
      headings: this.headings,
      tableOfContents: this.tableOfContents,
      wordCount: this.wordCount,
      internalLinks: this.internalLinks,
      externalLinks: this.externalLinks
    };
  }
}

export default MarkdownProcessor;