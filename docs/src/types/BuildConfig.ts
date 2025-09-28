export interface BuildConfig {
  // Source directories
  contentDir: string;              // Source content directory (e.g., 'src/content')
  outputDir: string;               // Build output directory (e.g., 'dist')
  assetsDir: string;               // Static assets directory
  templatesDir: string;            // HTML templates directory

  // Processing options
  markdown: MarkdownConfig;
  assets: AssetConfig;
  navigation: NavigationConfig;
  search: SearchConfig;

  // Build behavior
  watch: boolean;                  // Watch mode for development
  minify: boolean;                 // Minify HTML/CSS/JS output
  sourceMap: boolean;              // Generate source maps
  parallel: boolean;               // Enable parallel processing

  // Deployment
  baseUrl: string;                 // Base URL for the site
  publicPath: string;              // Public path for assets
  githubPages: GitHubPagesConfig;

  // Performance
  cacheEnabled: boolean;           // Enable build caching
  cacheDir: string;                // Cache directory location
  maxConcurrency: number;          // Max concurrent operations

  // Development
  devServer: DevServerConfig;

  // Validation
  validation: ValidationConfig;
}

export interface MarkdownConfig {
  extensions: string[];            // File extensions to process (.md, .mdx)
  frontMatter: boolean;            // Parse front matter
  gfm: boolean;                    // GitHub Flavored Markdown
  breaks: boolean;                 // Line breaks as <br>
  linkify: boolean;                // Auto-link URLs
  typographer: boolean;            // Smart quotes and dashes

  // Custom renderers
  customRenderers: Record<string, string>; // Custom renderer functions

  // Syntax highlighting
  syntaxHighlighting: {
    enabled: boolean;
    theme: string;
    languages: string[];
  };

  // Plugins
  plugins: MarkdownPlugin[];
}

export interface MarkdownPlugin {
  name: string;
  options?: Record<string, any>;
  enabled: boolean;
}

export interface AssetConfig {
  // Image optimization
  images: {
    formats: ImageFormat[];
    quality: Record<ImageFormat, number>;
    sizes: number[];               // Responsive image sizes
    lazy: boolean;                 // Lazy loading
    placeholder: boolean;          // Generate placeholders
  };

  // Static assets
  copy: string[];                  // Files to copy as-is
  ignore: string[];                // Files to ignore

  // Optimization
  compress: boolean;               // Compress assets
  fingerprint: boolean;            // Add hash to filenames
}

export type ImageFormat = 'webp' | 'jpeg' | 'png' | 'avif';

export interface NavigationConfig {
  maxDepth: number;                // Maximum nesting level
  autoGenerate: boolean;           // Auto-generate from content
  sortBy: 'order' | 'title' | 'date'; // Sorting method
  collapsible: boolean;            // Collapsible sections
  breadcrumbs: boolean;            // Show breadcrumbs

  // Categories
  categories: NavigationCategory[];
}

export interface NavigationCategory {
  id: string;
  title: string;
  path: string;
  order: number;
  icon?: string;
}

export interface SearchConfig {
  enabled: boolean;
  engine: 'lunr' | 'fuse';         // Search engine
  indexFields: string[];           // Fields to index
  boost: Record<string, number>;   // Field boost factors
  stopWords: string[];             // Words to exclude
  stemmer: boolean;                // Enable stemming

  // Client-side config
  preview: {
    length: number;                // Preview text length
    highlightTag: string;          // HTML tag for highlights
  };
}

export interface GitHubPagesConfig {
  enabled: boolean;
  branch: string;                  // Deployment branch (gh-pages)
  domain?: string;                 // Custom domain (CNAME)
  spa: boolean;                    // Single Page App mode

  // 404 handling
  notFoundPage: string;            // Path to 404.html template
}

export interface DevServerConfig {
  port: number;
  host: string;
  open: boolean;                   // Open browser automatically
  cors: boolean;                   // Enable CORS
  https: boolean;                  // Use HTTPS

  // Hot reload
  hmr: boolean;                    // Hot Module Replacement
  liveReload: boolean;             // Live reload on changes
  watchFiles: string[];            // Additional files to watch
}

export interface ValidationConfig {
  // Content validation
  linkCheck: boolean;              // Check internal/external links
  spellCheck: boolean;             // Spell checking
  grammar: boolean;                // Grammar checking

  // Technical validation
  htmlValidation: boolean;         // W3C HTML validation
  accessibility: boolean;          // WCAG compliance check
  performance: boolean;            // Lighthouse performance check

  // Thresholds
  thresholds: {
    performance: number;           // Lighthouse performance score (0-100)
    accessibility: number;         // Lighthouse accessibility score (0-100)
    seo: number;                   // Lighthouse SEO score (0-100)
    bestPractices: number;         // Lighthouse best practices score (0-100)
  };

  // Reporting
  reports: {
    format: 'json' | 'html' | 'xml';
    outputDir: string;
    includeWarnings: boolean;
  };
}

export interface BuildMetrics {
  startTime: Date;
  endTime: Date;
  duration: number;                // Build time in milliseconds

  // Processing stats
  pagesProcessed: number;
  assetsProcessed: number;
  imagesOptimized: number;

  // Output stats
  outputSize: number;              // Total output size in bytes
  htmlFiles: number;
  cssFiles: number;
  jsFiles: number;
  imageFiles: number;

  // Performance
  cacheHitRate: number;            // Cache hit rate (0-1)
  parallelEfficiency: number;      // Parallel processing efficiency (0-1)

  // Errors and warnings
  errors: BuildError[];
  warnings: BuildWarning[];
}

export interface BuildError {
  type: 'markdown' | 'asset' | 'template' | 'validation' | 'system';
  message: string;
  file?: string;
  line?: number;
  column?: number;
  stack?: string;
  timestamp: Date;
}

export interface BuildWarning {
  type: 'performance' | 'accessibility' | 'seo' | 'content' | 'asset';
  message: string;
  file?: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: Date;
}

export interface BuildContext {
  config: BuildConfig;
  metrics: BuildMetrics;
  cache: Map<string, any>;
  logger: BuildLogger;
}

export interface BuildLogger {
  info(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  error(message: string, data?: any): void;
  debug(message: string, data?: any): void;
  time(label: string): void;
  timeEnd(label: string): void;
}

export interface BuildHook {
  name: string;
  stage: BuildStage;
  handler: (context: BuildContext) => Promise<void> | void;
  priority?: number;
}

export type BuildStage =
  | 'pre-build'
  | 'content-scan'
  | 'content-process'
  | 'asset-process'
  | 'template-render'
  | 'post-build'
  | 'validate'
  | 'deploy';

export interface BuildPipeline {
  stages: BuildStage[];
  hooks: BuildHook[];
  parallel: boolean;
  stopOnError: boolean;
}