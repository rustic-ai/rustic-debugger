import { writeFile } from 'fs/promises';
import path from 'path';
import lunr from 'lunr';
import { DocumentationPage } from '@/types/DocumentationPage';

export interface SearchIndexOptions {
  outputDir: string;
  indexFields: string[];
  boost: Record<string, number>;
  stopWords: string[];
  stemmer: boolean;
  includePositions: boolean;
  includeScores: boolean;
}

export interface SearchDocument {
  id: string;
  title: string;
  content: string;
  description?: string;
  url: string;
  category: string;
  section?: string;
  tags: string[];
  lastModified: string;
  estimatedReadTime: number;
}

export interface SearchIndex {
  version: string;
  generated: string;
  documentsCount: number;
  index: any; // Lunr index
  documents: Record<string, SearchDocument>;
  categories: string[];
  tags: string[];
}

export class SearchIndexGenerator {
  private options: SearchIndexOptions;
  private documents: SearchDocument[] = [];

  constructor(options: SearchIndexOptions) {
    this.options = options;
  }

  async generateIndex(pages: DocumentationPage[]): Promise<SearchIndex> {
    // Convert pages to search documents
    this.documents = pages.map(page => this.convertPageToDocument(page));

    // Build Lunr index
    const index = lunr(function() {
      // Configure index
      this.ref('id');

      // Add fields with boosting
      for (const field of ['title', 'content', 'description', 'tags', 'category']) {
        const boost = this.options.boost[field] || 1;
        this.field(field, { boost });
      }

      // Configure stemming
      if (!this.options.stemmer) {
        this.pipeline.remove(lunr.stemmer);
        this.searchPipeline.remove(lunr.stemmer);
      }

      // Add stop words
      if (this.options.stopWords.length > 0) {
        const stopWordFilter = lunr.generateStopWordFilter(this.options.stopWords);
        this.pipeline.add(stopWordFilter);
        this.searchPipeline.add(stopWordFilter);
      }

      // Add documents
      for (const doc of this.documents) {
        this.add(doc);
      }
    });

    // Create search index object
    const searchIndex: SearchIndex = {
      version: '1.0.0',
      generated: new Date().toISOString(),
      documentsCount: this.documents.length,
      index: index.toJSON(),
      documents: this.createDocumentMap(),
      categories: this.extractCategories(),
      tags: this.extractTags()
    };

    // Write index to file
    await this.writeIndex(searchIndex);

    return searchIndex;
  }

  private convertPageToDocument(page: DocumentationPage): SearchDocument {
    return {
      id: page.id,
      title: page.title,
      content: this.extractTextContent(page.content),
      description: page.description,
      url: `/${page.slug}`,
      category: page.sidebar.category,
      section: page.sidebar.section,
      tags: page.tags || [],
      lastModified: page.lastModified.toISOString(),
      estimatedReadTime: page.estimatedReadTime
    };
  }

  private extractTextContent(markdown: string): string {
    // Remove markdown syntax and extract plain text
    return markdown
      // Remove front matter
      .replace(/^---[\s\S]*?---\n?/, '')
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, '')
      // Remove inline code
      .replace(/`[^`]+`/g, '')
      // Remove links but keep text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove images
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
      // Remove headings markup
      .replace(/^#+\s+/gm, '')
      // Remove bold/italic
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      // Remove horizontal rules
      .replace(/^---+$/gm, '')
      // Remove blockquotes
      .replace(/^>\s+/gm, '')
      // Remove list markers
      .replace(/^[-*+]\s+/gm, '')
      .replace(/^\d+\.\s+/gm, '')
      // Normalize whitespace
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private createDocumentMap(): Record<string, SearchDocument> {
    const map: Record<string, SearchDocument> = {};
    for (const doc of this.documents) {
      map[doc.id] = doc;
    }
    return map;
  }

  private extractCategories(): string[] {
    const categories = new Set<string>();
    for (const doc of this.documents) {
      categories.add(doc.category);
    }
    return Array.from(categories).sort();
  }

  private extractTags(): string[] {
    const tags = new Set<string>();
    for (const doc of this.documents) {
      for (const tag of doc.tags) {
        tags.add(tag);
      }
    }
    return Array.from(tags).sort();
  }

  private async writeIndex(searchIndex: SearchIndex): Promise<void> {
    const indexPath = path.join(this.options.outputDir, 'search-index.json');
    await writeFile(indexPath, JSON.stringify(searchIndex, null, 2));

    // Also write a minified version for production
    const minifiedPath = path.join(this.options.outputDir, 'search-index.min.json');
    await writeFile(minifiedPath, JSON.stringify(searchIndex));

    // Write client-side search utilities
    await this.writeSearchClient();
  }

  private async writeSearchClient(): Promise<void> {
    const clientCode = `
/**
 * Client-side search functionality for Rustic Debug documentation
 */

class DocumentationSearch {
  constructor() {
    this.index = null;
    this.documents = null;
    this.lunr = null;
    this.isReady = false;
  }

  async initialize() {
    try {
      // Load Lunr library if not already loaded
      if (typeof lunr === 'undefined') {
        await this.loadLunr();
      }

      // Load search index
      const response = await fetch('/search-index.min.json');
      const searchData = await response.json();

      this.index = lunr.Index.load(searchData.index);
      this.documents = searchData.documents;
      this.isReady = true;

      console.log(\`Search initialized with \${searchData.documentsCount} documents\`);
    } catch (error) {
      console.error('Failed to initialize search:', error);
    }
  }

  async loadLunr() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/lunr@2.3.9/lunr.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  search(query, options = {}) {
    if (!this.isReady) {
      console.warn('Search not initialized');
      return [];
    }

    if (!query || query.trim().length < 2) {
      return [];
    }

    const defaults = {
      limit: 10,
      includeMatches: true,
      boost: {
        title: 2,
        description: 1.5,
        content: 1
      }
    };

    const config = { ...defaults, ...options };

    try {
      // Perform search
      const results = this.index.search(query);

      // Map results to full documents
      const searchResults = results
        .slice(0, config.limit)
        .map(result => {
          const doc = this.documents[result.ref];
          if (!doc) return null;

          return {
            ...doc,
            score: result.score,
            matches: result.matchData?.metadata || {},
            excerpt: this.generateExcerpt(doc.content, query)
          };
        })
        .filter(Boolean);

      return searchResults;
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }

  generateExcerpt(content, query, length = 200) {
    const words = query.toLowerCase().split(/\\s+/);
    const contentLower = content.toLowerCase();

    // Find the first occurrence of any search term
    let bestIndex = -1;
    let bestWord = '';

    for (const word of words) {
      const index = contentLower.indexOf(word);
      if (index !== -1 && (bestIndex === -1 || index < bestIndex)) {
        bestIndex = index;
        bestWord = word;
      }
    }

    if (bestIndex === -1) {
      // No matches found, return beginning of content
      return content.substring(0, length) + (content.length > length ? '...' : '');
    }

    // Calculate excerpt boundaries
    const start = Math.max(0, bestIndex - length / 2);
    const end = Math.min(content.length, start + length);

    let excerpt = content.substring(start, end);

    // Add ellipsis if needed
    if (start > 0) excerpt = '...' + excerpt;
    if (end < content.length) excerpt = excerpt + '...';

    // Highlight search terms
    for (const word of words) {
      const regex = new RegExp(\`(\${word})\`, 'gi');
      excerpt = excerpt.replace(regex, '<mark>$1</mark>');
    }

    return excerpt;
  }

  filter(results, filters = {}) {
    let filtered = [...results];

    if (filters.category) {
      filtered = filtered.filter(result => result.category === filters.category);
    }

    if (filters.section) {
      filtered = filtered.filter(result => result.section === filters.section);
    }

    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(result =>
        filters.tags.some(tag => result.tags.includes(tag))
      );
    }

    if (filters.dateRange) {
      const { start, end } = filters.dateRange;
      filtered = filtered.filter(result => {
        const date = new Date(result.lastModified);
        return date >= start && date <= end;
      });
    }

    return filtered;
  }

  suggest(query, limit = 5) {
    if (!this.isReady || !query || query.length < 2) {
      return [];
    }

    // Simple suggestion based on document titles and tags
    const suggestions = [];
    const queryLower = query.toLowerCase();

    for (const doc of Object.values(this.documents)) {
      // Check title
      if (doc.title.toLowerCase().includes(queryLower)) {
        suggestions.push({
          text: doc.title,
          type: 'title',
          url: doc.url,
          category: doc.category
        });
      }

      // Check tags
      for (const tag of doc.tags) {
        if (tag.toLowerCase().includes(queryLower)) {
          suggestions.push({
            text: tag,
            type: 'tag',
            category: doc.category
          });
        }
      }
    }

    // Remove duplicates and limit results
    const unique = suggestions.filter((item, index, arr) =>
      arr.findIndex(other => other.text === item.text && other.type === item.type) === index
    );

    return unique.slice(0, limit);
  }

  getStats() {
    if (!this.isReady) return null;

    const categories = {};
    const tags = {};
    let totalPages = 0;

    for (const doc of Object.values(this.documents)) {
      totalPages++;
      categories[doc.category] = (categories[doc.category] || 0) + 1;

      for (const tag of doc.tags) {
        tags[tag] = (tags[tag] || 0) + 1;
      }
    }

    return {
      totalPages,
      categories,
      tags
    };
  }
}

// Global search instance
window.documentationSearch = new DocumentationSearch();

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.documentationSearch.initialize();
  });
} else {
  window.documentationSearch.initialize();
}

// Export for module environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DocumentationSearch;
}
`;

    const clientPath = path.join(this.options.outputDir, 'js', 'search.js');
    await writeFile(clientPath, clientCode);
  }
}

export default SearchIndexGenerator;