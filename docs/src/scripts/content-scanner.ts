import { readdir, stat, access } from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import matter from 'gray-matter';
import { readFile } from 'fs/promises';
import { DocumentationPage, PageFrontMatter, PageValidation, PageValidationError, PageValidationWarning } from '@/types/DocumentationPage';

export interface ContentScannerOptions {
  baseDir: string;
  contentDirs: string[];
  extensions: string[];
  ignorePatterns: string[];
  validateContent: boolean;
  checkDuplicates: boolean;
  checkOrphans: boolean;
}

export interface ScanResult {
  pages: ContentPageInfo[];
  validation: ContentValidation;
  metrics: ScanMetrics;
}

export interface ContentPageInfo {
  filePath: string;
  relativePath: string;
  frontMatter: PageFrontMatter;
  validation: PageValidation;
  fileStats: {
    size: number;
    created: Date;
    modified: Date;
  };
  wordCount: number;
  headingCount: number;
  linkCount: number;
  imageCount: number;
}

export interface ContentValidation {
  isValid: boolean;
  errors: ContentValidationError[];
  warnings: ContentValidationWarning[];
  duplicates: DuplicateContent[];
  orphans: string[];
  brokenReferences: BrokenReference[];
}

export interface ContentValidationError {
  type: 'missing-front-matter' | 'invalid-category' | 'duplicate-id' | 'invalid-structure' | 'file-read-error';
  message: string;
  filePath: string;
  line?: number;
}

export interface ContentValidationWarning {
  type: 'missing-description' | 'long-title' | 'no-headings' | 'orphaned-page' | 'large-file' | 'empty-content';
  message: string;
  filePath: string;
  severity: 'low' | 'medium' | 'high';
}

export interface DuplicateContent {
  type: 'id' | 'title' | 'slug';
  value: string;
  files: string[];
}

export interface BrokenReference {
  type: 'internal-link' | 'image' | 'screenshot';
  source: string;
  target: string;
  line?: number;
}

export interface ScanMetrics {
  totalFiles: number;
  validFiles: number;
  errorFiles: number;
  totalWords: number;
  totalHeadings: number;
  totalLinks: number;
  totalImages: number;
  categories: Record<string, number>;
  fileTypes: Record<string, number>;
  scanDuration: number;
}

export class ContentScanner {
  private options: ContentScannerOptions;
  private scannedPages: Map<string, ContentPageInfo> = new Map();
  private pageIds: Set<string> = new Set();
  private pageTitles: Set<string> = new Set();
  private pageSlugs: Set<string> = new Set();
  private allLinks: Map<string, string[]> = new Map(); // source -> targets

  constructor(options: ContentScannerOptions) {
    this.options = options;
  }

  async scanContent(): Promise<ScanResult> {
    const startTime = Date.now();

    // Reset state
    this.scannedPages.clear();
    this.pageIds.clear();
    this.pageTitles.clear();
    this.pageSlugs.clear();
    this.allLinks.clear();

    const pages: ContentPageInfo[] = [];
    const errors: ContentValidationError[] = [];
    const warnings: ContentValidationWarning[] = [];

    // Scan all content directories
    for (const contentDir of this.options.contentDirs) {
      const dirPath = path.resolve(this.options.baseDir, contentDir);

      try {
        await access(dirPath);
        const dirPages = await this.scanDirectory(dirPath, contentDir);
        pages.push(...dirPages);
      } catch (error) {
        errors.push({
          type: 'invalid-structure',
          message: `Content directory not found: ${contentDir}`,
          filePath: dirPath
        });
      }
    }

    // Perform cross-page validation
    const duplicates = this.findDuplicates();
    const orphans = this.options.checkOrphans ? this.findOrphans() : [];
    const brokenReferences = await this.checkReferences();

    // Calculate metrics
    const metrics = this.calculateMetrics(pages, Date.now() - startTime);

    // Collect all validation results
    const allErrors: ContentValidationError[] = [
      ...errors,
      ...pages.flatMap(page => page.validation.errors.map(e => ({
        type: e.type as ContentValidationError['type'],
        message: e.message,
        filePath: page.filePath,
        line: e.line
      })))
    ];

    const allWarnings: ContentValidationWarning[] = [
      ...warnings,
      ...pages.flatMap(page => page.validation.warnings.map(w => ({
        type: w.type as ContentValidationWarning['type'],
        message: w.message,
        filePath: page.filePath,
        severity: 'medium' as const
      })))
    ];

    const validation: ContentValidation = {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
      duplicates,
      orphans,
      brokenReferences
    };

    return {
      pages,
      validation,
      metrics
    };
  }

  private async scanDirectory(dirPath: string, relativeDirPath: string): Promise<ContentPageInfo[]> {
    const pages: ContentPageInfo[] = [];

    const pattern = `**/*.{${this.options.extensions.join(',')}}`;
    const files = await glob(pattern, {
      cwd: dirPath,
      ignore: this.options.ignorePatterns
    });

    for (const file of files) {
      try {
        const filePath = path.join(dirPath, file);
        const relativePath = path.join(relativeDirPath, file);
        const pageInfo = await this.scanFile(filePath, relativePath);

        if (pageInfo) {
          pages.push(pageInfo);
          this.scannedPages.set(filePath, pageInfo);
        }
      } catch (error) {
        console.error(`Error scanning file ${file}:`, error);
      }
    }

    return pages;
  }

  private async scanFile(filePath: string, relativePath: string): Promise<ContentPageInfo | null> {
    try {
      const fileContent = await readFile(filePath, 'utf-8');
      const stats = await stat(filePath);

      // Parse front matter
      let frontMatter: PageFrontMatter;
      let content: string;

      try {
        const parsed = matter(fileContent);
        frontMatter = parsed.data as PageFrontMatter;
        content = parsed.content;
      } catch (error) {
        throw new Error('Failed to parse front matter');
      }

      // Validate front matter
      const validation = this.validatePage(frontMatter, content, filePath);

      // Count content elements
      const wordCount = this.countWords(content);
      const headingCount = this.countHeadings(content);
      const linkCount = this.countLinks(content);
      const imageCount = this.countImages(content);

      // Extract and store links for reference checking
      const links = this.extractLinks(content);
      this.allLinks.set(filePath, links);

      // Track IDs, titles, and slugs for duplicate detection
      const pageId = this.generatePageId(relativePath);
      const slug = this.generateSlug(frontMatter.title, relativePath);

      this.pageIds.add(pageId);
      this.pageTitles.add(frontMatter.title.toLowerCase());
      this.pageSlugs.add(slug);

      const pageInfo: ContentPageInfo = {
        filePath,
        relativePath,
        frontMatter,
        validation,
        fileStats: {
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        },
        wordCount,
        headingCount,
        linkCount,
        imageCount
      };

      return pageInfo;
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
      return null;
    }
  }

  private validatePage(frontMatter: PageFrontMatter, content: string, filePath: string): PageValidation {
    const errors: PageValidationError[] = [];
    const warnings: PageValidationWarning[] = [];

    // Required front matter validation
    if (!frontMatter.title) {
      errors.push({
        type: 'missing-front-matter',
        message: 'Missing title in front matter',
        line: 1
      });
    } else if (frontMatter.title.length > 100) {
      warnings.push({
        type: 'long-title',
        message: `Title is very long (${frontMatter.title.length} characters). Consider shortening it.`,
        line: 1
      });
    }

    if (!frontMatter.sidebar) {
      errors.push({
        type: 'missing-front-matter',
        message: 'Missing sidebar configuration in front matter',
        line: 1
      });
    } else {
      if (!frontMatter.sidebar.category) {
        errors.push({
          type: 'invalid-category',
          message: 'Missing sidebar category',
          line: 1
        });
      } else {
        const validCategories = ['user-guide', 'dev-guide', 'api', 'examples'];
        if (!validCategories.includes(frontMatter.sidebar.category)) {
          errors.push({
            type: 'invalid-category',
            message: `Invalid category "${frontMatter.sidebar.category}". Must be one of: ${validCategories.join(', ')}`,
            line: 1
          });
        }
      }

      if (typeof frontMatter.sidebar.order !== 'number') {
        errors.push({
          type: 'missing-front-matter',
          message: 'Missing or invalid sidebar order (must be a number)',
          line: 1
        });
      }
    }

    // Content validation
    if (!content.trim()) {
      warnings.push({
        type: 'empty-content',
        message: 'Page has no content',
        line: 1
      });
    }

    if (!frontMatter.description) {
      warnings.push({
        type: 'missing-description',
        message: 'Missing description in front matter (recommended for SEO)',
        line: 1
      });
    }

    // Check for headings
    const headingCount = this.countHeadings(content);
    if (headingCount === 0 && content.length > 500) {
      warnings.push({
        type: 'no-headings',
        message: 'Long page with no headings. Consider adding headings for better structure.',
        line: 1
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private findDuplicates(): DuplicateContent[] {
    const duplicates: DuplicateContent[] = [];
    const idMap = new Map<string, string[]>();
    const titleMap = new Map<string, string[]>();
    const slugMap = new Map<string, string[]>();

    // Build maps of IDs, titles, and slugs to files
    for (const [filePath, pageInfo] of this.scannedPages) {
      const pageId = this.generatePageId(pageInfo.relativePath);
      const title = pageInfo.frontMatter.title.toLowerCase();
      const slug = this.generateSlug(pageInfo.frontMatter.title, pageInfo.relativePath);

      // Track IDs
      if (!idMap.has(pageId)) {
        idMap.set(pageId, []);
      }
      idMap.get(pageId)!.push(filePath);

      // Track titles
      if (!titleMap.has(title)) {
        titleMap.set(title, []);
      }
      titleMap.get(title)!.push(filePath);

      // Track slugs
      if (!slugMap.has(slug)) {
        slugMap.set(slug, []);
      }
      slugMap.get(slug)!.push(filePath);
    }

    // Find duplicates
    for (const [id, files] of idMap) {
      if (files.length > 1) {
        duplicates.push({
          type: 'id',
          value: id,
          files
        });
      }
    }

    for (const [title, files] of titleMap) {
      if (files.length > 1) {
        duplicates.push({
          type: 'title',
          value: title,
          files
        });
      }
    }

    for (const [slug, files] of slugMap) {
      if (files.length > 1) {
        duplicates.push({
          type: 'slug',
          value: slug,
          files
        });
      }
    }

    return duplicates;
  }

  private findOrphans(): string[] {
    const orphans: string[] = [];
    const linkedPages = new Set<string>();

    // Find all internal links
    for (const [, links] of this.allLinks) {
      for (const link of links) {
        if (!this.isExternalLink(link)) {
          linkedPages.add(link);
        }
      }
    }

    // Find pages that are not linked to by any other page
    for (const [filePath, pageInfo] of this.scannedPages) {
      const pageSlug = this.generateSlug(pageInfo.frontMatter.title, pageInfo.relativePath);
      const pageId = this.generatePageId(pageInfo.relativePath);

      if (!linkedPages.has(pageSlug) && !linkedPages.has(pageId) && !linkedPages.has(pageInfo.relativePath)) {
        // Check if it's an index page (usually not orphaned)
        const isIndex = path.basename(pageInfo.relativePath, path.extname(pageInfo.relativePath)) === 'index';
        if (!isIndex) {
          orphans.push(filePath);
        }
      }
    }

    return orphans;
  }

  private async checkReferences(): Promise<BrokenReference[]> {
    const brokenRefs: BrokenReference[] = [];

    for (const [filePath, links] of this.allLinks) {
      for (const link of links) {
        if (!this.isExternalLink(link)) {
          const targetExists = await this.checkInternalReference(link, filePath);
          if (!targetExists) {
            brokenRefs.push({
              type: 'internal-link',
              source: filePath,
              target: link
            });
          }
        }
      }
    }

    return brokenRefs;
  }

  private async checkInternalReference(reference: string, sourcePath: string): Promise<boolean> {
    // Check if reference exists as a page slug, ID, or file path
    for (const [, pageInfo] of this.scannedPages) {
      const pageSlug = this.generateSlug(pageInfo.frontMatter.title, pageInfo.relativePath);
      const pageId = this.generatePageId(pageInfo.relativePath);

      if (reference === pageSlug || reference === pageId || reference === pageInfo.relativePath) {
        return true;
      }
    }

    // Check if it's a file reference
    try {
      const resolvedPath = path.resolve(path.dirname(sourcePath), reference);
      await access(resolvedPath);
      return true;
    } catch {
      return false;
    }
  }

  private calculateMetrics(pages: ContentPageInfo[], scanDuration: number): ScanMetrics {
    const categories: Record<string, number> = {};
    const fileTypes: Record<string, number> = {};

    let totalWords = 0;
    let totalHeadings = 0;
    let totalLinks = 0;
    let totalImages = 0;
    let validFiles = 0;
    let errorFiles = 0;

    for (const page of pages) {
      // Count by category
      const category = page.frontMatter.sidebar.category;
      categories[category] = (categories[category] || 0) + 1;

      // Count by file type
      const ext = path.extname(page.relativePath);
      fileTypes[ext] = (fileTypes[ext] || 0) + 1;

      // Accumulate content metrics
      totalWords += page.wordCount;
      totalHeadings += page.headingCount;
      totalLinks += page.linkCount;
      totalImages += page.imageCount;

      // Count validation status
      if (page.validation.isValid) {
        validFiles++;
      } else {
        errorFiles++;
      }
    }

    return {
      totalFiles: pages.length,
      validFiles,
      errorFiles,
      totalWords,
      totalHeadings,
      totalLinks,
      totalImages,
      categories,
      fileTypes,
      scanDuration
    };
  }

  private generatePageId(filePath: string): string {
    return filePath
      .replace(/\.(md|mdx)$/, '')
      .replace(/\//g, '-')
      .replace(/[^a-zA-Z0-9-]/g, '')
      .toLowerCase();
  }

  private generateSlug(title: string, filePath: string): string {
    const filename = path.basename(filePath, path.extname(filePath));

    return title
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      || filename.toLowerCase().replace(/[^a-zA-Z0-9-]/g, '-');
  }

  private countWords(content: string): number {
    return content
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0)
      .length;
  }

  private countHeadings(content: string): number {
    const headingRegex = /^#+\s+.+$/gm;
    return (content.match(headingRegex) || []).length;
  }

  private countLinks(content: string): number {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    return (content.match(linkRegex) || []).length;
  }

  private countImages(content: string): number {
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    return (content.match(imageRegex) || []).length;
  }

  private extractLinks(content: string): string[] {
    const links: string[] = [];
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
      links.push(match[2]);
    }

    return links;
  }

  private isExternalLink(href: string): boolean {
    return /^https?:\/\//.test(href) || href.startsWith('mailto:') || href.startsWith('tel:');
  }

  async getContentStructure(): Promise<Record<string, ContentPageInfo[]>> {
    const structure: Record<string, ContentPageInfo[]> = {};

    for (const [, pageInfo] of this.scannedPages) {
      const category = pageInfo.frontMatter.sidebar.category;
      if (!structure[category]) {
        structure[category] = [];
      }
      structure[category].push(pageInfo);
    }

    // Sort pages within each category by order
    for (const category in structure) {
      structure[category].sort((a, b) => a.frontMatter.sidebar.order - b.frontMatter.sidebar.order);
    }

    return structure;
  }

  getValidationReport(): string {
    const pages = Array.from(this.scannedPages.values());
    const totalPages = pages.length;
    const validPages = pages.filter(p => p.validation.isValid).length;
    const errorPages = totalPages - validPages;

    let report = `Content Validation Report\n`;
    report += `========================\n\n`;
    report += `Total Pages: ${totalPages}\n`;
    report += `Valid Pages: ${validPages}\n`;
    report += `Pages with Errors: ${errorPages}\n\n`;

    if (errorPages > 0) {
      report += `Pages with Errors:\n`;
      for (const page of pages) {
        if (!page.validation.isValid) {
          report += `- ${page.relativePath}\n`;
          for (const error of page.validation.errors) {
            report += `  * ${error.message}\n`;
          }
        }
      }
    }

    return report;
  }
}

export default ContentScanner;