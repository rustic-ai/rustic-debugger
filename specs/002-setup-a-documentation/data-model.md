# Data Model: Documentation Website

**Generated**: 2025-09-28 | **Phase**: 1 | **Status**: Complete

## Core Entities

### Documentation Page

**Description**: Individual content units that make up the documentation website
**Scope**: Content management and navigation structure

```typescript
interface DocumentationPage {
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
  screenshots: Screenshot[];     // Associated screenshots
  images: string[];              // Other image assets

  // Metadata
  tags?: string[];               // Content tags for filtering
  lastModified: Date;            // Last content modification
  lastScreenshotUpdate?: Date;   // Last screenshot refresh

  // SEO
  searchKeywords: string[];      // Extracted keywords for search
  estimatedReadTime: number;     // Reading time in minutes
}
```

**Validation Rules**:
- `id` must be unique across all pages
- `title` must be 1-100 characters
- `slug` must be URL-safe and unique
- `sidebar.order` must be positive integer
- `content` must be valid markdown

**State Transitions**:
- Draft → Published (when content is complete and validated)
- Published → Updated (when content changes)
- Updated → Screenshot Refresh Needed (when UI references change)

### Screenshot

**Description**: Visual representations of application interfaces embedded in documentation
**Scope**: Visual documentation and UI representation

```typescript
interface Screenshot {
  // Identification
  id: string;                    // Unique identifier
  filename: string;              // Generated filename
  alt: string;                   // Alt text for accessibility

  // Capture metadata
  pageUrl: string;               // Application URL captured
  viewport: {
    width: number;               // Screenshot width in pixels
    height: number;              // Screenshot height in pixels
    deviceType: 'desktop' | 'tablet' | 'mobile';
  };

  // Content
  imagePath: string;             // Relative path to image file
  thumbnailPath?: string;        // Optional thumbnail for performance
  webpPath?: string;             // WebP version for modern browsers

  // Documentation context
  documentationPages: string[];  // Pages that reference this screenshot
  section: string;               // What UI section/feature is shown
  description: string;           // What the screenshot demonstrates

  // Automation
  captureConfig: {
    selector?: string;           // CSS selector to focus on
    waitFor?: string;            // Element or condition to wait for
    hideSelectors?: string[];    // Elements to hide during capture
    customAction?: string;       // Custom action before capture
  };

  // Version control
  version: number;               // Screenshot version number
  hash: string;                  // Content hash for change detection
  capturedAt: Date;              // When screenshot was taken
  appVersion?: string;           // Application version when captured

  // Status
  status: 'current' | 'outdated' | 'missing';
  verificationNeeded: boolean;   // Manual review required
}
```

**Validation Rules**:
- `pageUrl` must be valid URL within application domain
- `viewport.width` and `viewport.height` must be positive integers
- `imagePath` must point to existing file
- `version` must be incremental positive integer

**State Transitions**:
- Missing → Captured (initial screenshot creation)
- Current → Outdated (UI changes detected)
- Outdated → Current (screenshot refreshed and verified)

### User Guide

**Description**: Documentation section focused on end-user functionality and workflows
**Scope**: User-facing documentation organization

```typescript
interface UserGuide {
  // Organization
  id: string;                    // Unique identifier
  title: string;                 // Guide section title
  description: string;           // What this guide covers

  // Content structure
  pages: DocumentationPage[];    // Ordered list of pages in this guide
  workflows: UserWorkflow[];     // Step-by-step user workflows

  // Navigation
  order: number;                 // Display order in main navigation
  icon?: string;                 // Optional icon for navigation

  // Metrics
  completeness: number;          // Percentage of features covered (0-100)
  lastUpdate: Date;              // Last content update

  // Target audience
  userLevel: 'beginner' | 'intermediate' | 'advanced';
  prerequisites?: string[];      // Required knowledge or setup
}
```

### Developer Guide

**Description**: Documentation section covering technical implementation and development processes
**Scope**: Technical documentation organization

```typescript
interface DeveloperGuide {
  // Organization
  id: string;                    // Unique identifier
  title: string;                 // Guide section title
  description: string;           // What this guide covers

  // Content structure
  pages: DocumentationPage[];    // Ordered list of pages in this guide
  apiReferences: APIReference[]; // API documentation sections
  codeExamples: CodeExample[];   // Reusable code examples

  // Navigation
  order: number;                 // Display order in main navigation
  icon?: string;                 // Optional icon for navigation

  // Technical context
  technologies: string[];        // Technologies covered
  difficulty: 'basic' | 'intermediate' | 'advanced';
  estimatedTime?: number;        // Time to complete in hours

  // Dependencies
  prerequisites: string[];       // Required setup or knowledge
  relatedGuides: string[];       // Links to related dev guides
}
```

### Navigation Structure

**Description**: Hierarchical organization of documentation content for site navigation
**Scope**: Site structure and user experience

```typescript
interface NavigationStructure {
  // Root structure
  categories: NavigationCategory[];
  maxDepth: number;              // Maximum nesting level

  // Behavior
  collapsible: boolean;          // Whether sections can be collapsed
  searchable: boolean;           // Whether navigation is searchable

  // Generation
  autoGenerated: boolean;        // Whether generated from content structure
  lastGenerated: Date;           // When navigation was last built
}

interface NavigationCategory {
  id: string;                    // Category identifier
  title: string;                 // Display title
  description?: string;          // Category description
  icon?: string;                 // Category icon
  order: number;                 // Display order

  // Hierarchy
  sections: NavigationSection[]; // Child sections
  pages: DocumentationPage[];    // Direct child pages

  // Behavior
  expanded: boolean;             // Default expansion state
  badge?: {                      // Optional badge (New, Updated, etc.)
    text: string;
    variant: 'new' | 'updated' | 'beta';
  };
}

interface NavigationSection {
  id: string;                    // Section identifier
  title: string;                 // Display title
  order: number;                 // Display order within category

  pages: DocumentationPage[];    // Pages in this section
  subsections?: NavigationSection[]; // Nested subsections
}
```

## Relationships

### Page ↔ Screenshot
- **One-to-Many**: A documentation page can contain multiple screenshots
- **Many-to-Many**: A screenshot can be referenced by multiple pages
- **Cascade**: When a page is deleted, associated screenshots should be reviewed for cleanup

### User Guide ↔ Pages
- **One-to-Many**: A user guide contains multiple documentation pages
- **Hierarchy**: Pages within a guide maintain ordering and can have parent-child relationships

### Developer Guide ↔ Pages
- **One-to-Many**: A developer guide contains multiple documentation pages
- **Cross-Reference**: Dev guide pages can reference user guide pages and vice versa

### Navigation ↔ Pages
- **Generated**: Navigation structure is automatically generated from page metadata
- **Override**: Manual navigation overrides available via page front matter

## Data Storage & Persistence

### File System Storage
```
docs/src/content/
├── user-guide/
│   ├── getting-started.md     # DocumentationPage content
│   ├── dashboard/
│   │   ├── overview.md
│   │   └── widgets.md
│   └── troubleshooting.md
└── dev-guide/
    ├── setup/
    │   ├── installation.md
    │   └── configuration.md
    └── api/
        └── endpoints.md

docs/src/assets/screenshots/
├── dashboard-overview-desktop.png
├── dashboard-overview-mobile.png
└── settings-page-desktop.png
```

### Generated Metadata
```typescript
// docs/dist/metadata/pages.json
interface SiteMetadata {
  pages: DocumentationPage[];
  screenshots: Screenshot[];
  navigation: NavigationStructure;
  searchIndex: SearchIndex;
  lastBuilt: Date;
}
```

### Build-Time Transformations
1. **Markdown → HTML**: Convert markdown content to HTML with custom renderers
2. **Front Matter → Metadata**: Extract page metadata from YAML front matter
3. **Link Resolution**: Convert relative links to absolute paths
4. **Image Optimization**: Generate WebP versions and thumbnails
5. **Search Index**: Generate Lunr.js search index from content

## Performance Considerations

### Lazy Loading Strategy
- Screenshots loaded only when in viewport
- Thumbnail versions for list views
- Progressive enhancement for WebP support

### Caching Strategy
- Build metadata cached between builds
- Screenshot hashes used for change detection
- Navigation structure cached until content changes

### Search Optimization
- Pre-built search index for client-side search
- Keyword extraction from content and metadata
- Fuzzy search support for typos and partial matches

---

**Next**: contracts/ directory with API definitions for build and deployment processes