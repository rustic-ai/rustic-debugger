export interface DocumentationPage {
  // Metadata
  id: string;                    // Unique identifier (file path based)
  title: string;                 // Display title
  description?: string;          // SEO meta description
  slug: string;                  // URL slug

  // Content
  content: string;               // Markdown source content
  htmlContent: string;           // Rendered HTML content
  excerpt?: string;              // Auto-generated or manual excerpt

  // Navigation
  sidebar: {
    category: string;            // Top-level category (user-guide, dev-guide)
    section?: string;            // Optional subsection
    order: number;               // Display order within section
    parent?: string;             // Parent page for hierarchical structure
  };

  // Cross-references
  internalLinks: string[];       // Links to other documentation pages
  externalLinks: string[];       // Links to external resources
  backlinks: string[];           // Pages that link to this page

  // Assets
  screenshots: string[];         // Associated screenshot IDs
  images: string[];              // Other image assets

  // Metadata
  tags?: string[];               // Content tags for filtering
  lastModified: Date;            // Last content modification
  lastScreenshotUpdate?: Date;   // Last screenshot refresh

  // SEO
  searchKeywords: string[];      // Extracted keywords for search
  estimatedReadTime: number;     // Reading time in minutes

  // File system
  filePath: string;              // Original markdown file path
  outputPath: string;            // Generated HTML file path
}

export interface PageFrontMatter {
  title: string;
  description?: string;
  sidebar: {
    category: string;
    section?: string;
    order: number;
    parent?: string;
  };
  tags?: string[];
  draft?: boolean;
  lastUpdated?: string;
}

export interface PageContent {
  frontMatter: PageFrontMatter;
  content: string;
  excerpt?: string;
}

export interface ProcessedPage extends DocumentationPage {
  tableOfContents: TableOfContentsItem[];
  wordCount: number;
  headings: PageHeading[];
}

export interface TableOfContentsItem {
  id: string;
  text: string;
  level: number;
  children?: TableOfContentsItem[];
}

export interface PageHeading {
  level: number;
  text: string;
  id: string;
  anchor: string;
}

export interface PageValidation {
  isValid: boolean;
  errors: PageValidationError[];
  warnings: PageValidationWarning[];
}

export interface PageValidationError {
  type: 'missing-front-matter' | 'invalid-category' | 'broken-link' | 'duplicate-id';
  message: string;
  line?: number;
  column?: number;
}

export interface PageValidationWarning {
  type: 'missing-description' | 'long-title' | 'no-headings' | 'orphaned-page';
  message: string;
  line?: number;
}