import { DocumentationPage } from '@/types/DocumentationPage';
import { NavigationStructure, BreadcrumbNavigation, TableOfContents, NavigationPageRef } from '@/types/NavigationStructure';

export interface TemplateContext {
  page: DocumentationPage;
  navigation: NavigationStructure;
  breadcrumbs?: BreadcrumbNavigation;
  tableOfContents?: TableOfContents;
  previousPage?: NavigationPageRef;
  nextPage?: NavigationPageRef;
  baseUrl: string;
  assetsUrl: string;
  searchEnabled: boolean;
}

export interface RusticTheme {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  typography: {
    fontFamily: string;
    headingFamily: string;
    codeFamily: string;
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      '2xl': string;
      '3xl': string;
      '4xl': string;
    };
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
  };
}

export class PageTemplateEngine {
  private theme: RusticTheme;

  constructor() {
    this.theme = this.createRusticTheme();
  }

  renderPage(context: TemplateContext): string {
    return `<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
    ${this.renderHead(context)}
</head>
<body class="bg-gray-50 text-gray-900 antialiased">
    ${this.renderBody(context)}
</body>
</html>`;
  }

  private renderHead(context: TemplateContext): string {
    const { page, baseUrl } = context;

    return `
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${page.title} | Rustic Debug Documentation</title>
    <meta name="description" content="${page.description || page.excerpt || 'Rustic Debug documentation'}">

    <!-- SEO Meta Tags -->
    <meta property="og:title" content="${page.title} | Rustic Debug Documentation">
    <meta property="og:description" content="${page.description || page.excerpt || 'Rustic Debug documentation'}">
    <meta property="og:type" content="article">
    <meta property="og:url" content="${baseUrl}/${page.slug}">
    <meta property="og:site_name" content="Rustic Debug Documentation">

    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="${page.title} | Rustic Debug Documentation">
    <meta name="twitter:description" content="${page.description || page.excerpt || 'Rustic Debug documentation'}">

    <!-- Canonical URL -->
    <link rel="canonical" href="${baseUrl}/${page.slug}">

    <!-- Favicon -->
    <link rel="icon" type="image/svg+xml" href="${context.assetsUrl}/favicon.svg">
    <link rel="icon" type="image/png" href="${context.assetsUrl}/favicon.png">

    <!-- CSS -->
    <link rel="stylesheet" href="${context.assetsUrl}/css/main.css">

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">

    <!-- Search Index -->
    ${context.searchEnabled ? `<link rel="preload" href="${context.assetsUrl}/search-index.json" as="fetch" crossorigin>` : ''}

    <!-- Theme Colors -->
    <meta name="theme-color" content="${this.theme.colors.primary}">
    <meta name="msapplication-TileColor" content="${this.theme.colors.primary}">

    <!-- JSON-LD Structured Data -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "TechnicalArticle",
      "headline": "${page.title}",
      "description": "${page.description || page.excerpt || ''}",
      "author": {
        "@type": "Organization",
        "name": "Rustic AI"
      },
      "publisher": {
        "@type": "Organization",
        "name": "Rustic AI"
      },
      "dateModified": "${page.lastModified.toISOString()}",
      "url": "${baseUrl}/${page.slug}"
    }
    </script>`;
  }

  private renderBody(context: TemplateContext): string {
    return `
    <div class="min-h-screen flex flex-col">
        ${this.renderHeader(context)}

        <div class="flex flex-1">
            ${this.renderSidebar(context)}
            ${this.renderMainContent(context)}
        </div>

        ${this.renderFooter(context)}
    </div>

    ${this.renderScripts(context)}`;
  }

  private renderHeader(context: TemplateContext): string {
    return `
    <header class="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div class="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex items-center justify-between h-16">
                <!-- Logo and Site Name -->
                <div class="flex items-center">
                    <button class="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                            id="mobile-menu-button"
                            aria-label="Open navigation menu">
                        <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>

                    <div class="flex items-center ml-4 lg:ml-0">
                        <img class="h-8 w-8" src="${context.assetsUrl}/logo.svg" alt="Rustic Debug">
                        <div class="ml-3">
                            <h1 class="text-lg font-semibold text-gray-900">
                                <a href="/" class="hover:text-blue-600">Rustic Debug</a>
                            </h1>
                            <p class="text-xs text-gray-500">Documentation</p>
                        </div>
                    </div>
                </div>

                <!-- Search and Actions -->
                <div class="flex items-center space-x-4">
                    ${context.searchEnabled ? this.renderSearchBox() : ''}
                    ${this.renderHeaderActions(context)}
                </div>
            </div>
        </div>
    </header>`;
  }

  private renderSearchBox(): string {
    return `
    <div class="relative">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg class="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
        </div>
        <input type="search"
               id="global-search"
               class="block w-64 pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
               placeholder="Search documentation..."
               autocomplete="off">
        <div id="search-results" class="absolute mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg hidden z-50 max-h-96 overflow-y-auto"></div>
    </div>`;
  }

  private renderHeaderActions(context: TemplateContext): string {
    return `
    <div class="flex items-center space-x-2">
        <button class="p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md"
                id="theme-toggle"
                aria-label="Toggle dark mode">
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
        </button>

        <a href="https://github.com/rustic-ai/rustic-debug"
           class="p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md"
           target="_blank"
           rel="noopener noreferrer"
           aria-label="View on GitHub">
            <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
        </a>
    </div>`;
  }

  private renderSidebar(context: TemplateContext): string {
    return `
    <aside class="w-64 bg-white border-r border-gray-200 hidden lg:block overflow-y-auto">
        <nav class="px-4 py-6">
            ${this.renderNavigation(context.navigation)}
        </nav>
    </aside>

    <!-- Mobile Navigation Overlay -->
    <div class="lg:hidden">
        <div id="mobile-nav-overlay" class="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 hidden" aria-hidden="true"></div>
        <div id="mobile-nav-panel" class="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform -translate-x-full transition-transform duration-300 ease-in-out overflow-y-auto">
            <div class="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 class="text-lg font-semibold text-gray-900">Navigation</h2>
                <button id="mobile-nav-close" class="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100">
                    <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <nav class="px-4 py-6">
                ${this.renderNavigation(context.navigation)}
            </nav>
        </div>
    </div>`;
  }

  private renderNavigation(navigation: NavigationStructure): string {
    let html = '<ul class="space-y-2">';

    for (const category of navigation.categories) {
      html += `
      <li>
          <div class="flex items-center justify-between p-2 text-sm font-medium text-gray-900 rounded-md hover:bg-gray-50">
              <div class="flex items-center">
                  ${category.icon ? `<svg class="mr-3 h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><use href="#icon-${category.icon}"></use></svg>` : ''}
                  <span>${category.title}</span>
              </div>
              ${category.sections.length > 0 ? `
              <button class="ml-3 p-1 rounded hover:bg-gray-100" data-toggle="category-${category.id}">
                  <svg class="h-4 w-4 text-gray-400 transform transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
              </button>
              ` : ''}
          </div>`;

      if (category.sections.length > 0 || category.pages.length > 0) {
        html += `<ul class="ml-4 mt-2 space-y-1 ${category.expanded ? '' : 'hidden'}" id="category-${category.id}">`;

        // Render sections
        for (const section of category.sections) {
          html += `
          <li>
              <div class="flex items-center justify-between p-2 text-sm text-gray-700 rounded-md hover:bg-gray-50">
                  <span class="font-medium">${section.title}</span>
                  ${section.pages.length > 0 ? `
                  <button class="ml-2 p-1 rounded hover:bg-gray-100" data-toggle="section-${section.id}">
                      <svg class="h-3 w-3 text-gray-400 transform transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                      </svg>
                  </button>
                  ` : ''}
              </div>`;

          if (section.pages.length > 0) {
            html += `<ul class="ml-4 mt-1 space-y-1 ${section.expanded ? '' : 'hidden'}" id="section-${section.id}">`;
            for (const page of section.pages) {
              const isActive = false; // Would check if current page
              html += `
              <li>
                  <a href="${page.path}"
                     class="block p-2 text-sm text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900 ${isActive ? 'bg-blue-50 text-blue-700 font-medium' : ''}">
                      ${page.title}
                      ${page.badge ? `<span class="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-${page.badge.variant === 'new' ? 'green' : page.badge.variant === 'updated' ? 'blue' : 'gray'}-100 text-${page.badge.variant === 'new' ? 'green' : page.badge.variant === 'updated' ? 'blue' : 'gray'}-800">${page.badge.text}</span>` : ''}
                  </a>
              </li>`;
            }
            html += '</ul>';
          }

          html += '</li>';
        }

        // Render direct category pages
        for (const page of category.pages) {
          const isActive = false; // Would check if current page
          html += `
          <li>
              <a href="${page.path}"
                 class="block p-2 text-sm text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900 ${isActive ? 'bg-blue-50 text-blue-700 font-medium' : ''}">
                  ${page.title}
                  ${page.badge ? `<span class="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-${page.badge.variant === 'new' ? 'green' : page.badge.variant === 'updated' ? 'blue' : 'gray'}-100 text-${page.badge.variant === 'new' ? 'green' : page.badge.variant === 'updated' ? 'blue' : 'gray'}-800">${page.badge.text}</span>` : ''}
              </a>
          </li>`;
        }

        html += '</ul>';
      }

      html += '</li>';
    }

    html += '</ul>';
    return html;
  }

  private renderMainContent(context: TemplateContext): string {
    const { page, breadcrumbs, tableOfContents, previousPage, nextPage } = context;

    return `
    <main class="flex-1 overflow-y-auto">
        <div class="max-w-none">
            <div class="flex">
                <!-- Main Content -->
                <div class="flex-1 min-w-0 px-6 py-8">
                    <!-- Breadcrumbs -->
                    ${breadcrumbs ? this.renderBreadcrumbs(breadcrumbs) : ''}

                    <!-- Page Header -->
                    <header class="mb-8">
                        <h1 class="text-3xl font-bold text-gray-900 mb-4">${page.title}</h1>
                        ${page.description ? `<p class="text-lg text-gray-600 mb-4">${page.description}</p>` : ''}

                        <div class="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                            <span>Last updated: ${page.lastModified.toLocaleDateString()}</span>
                            <span>•</span>
                            <span>${page.estimatedReadTime} min read</span>
                            ${page.tags && page.tags.length > 0 ? `
                            <span>•</span>
                            <div class="flex flex-wrap gap-1">
                                ${page.tags.map(tag => `<span class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">${tag}</span>`).join('')}
                            </div>
                            ` : ''}
                        </div>
                    </header>

                    <!-- Page Content -->
                    <div class="prose prose-lg max-w-none">
                        ${page.htmlContent}
                    </div>

                    <!-- Page Navigation -->
                    ${this.renderPageNavigation(previousPage, nextPage)}
                </div>

                <!-- Table of Contents -->
                ${tableOfContents && tableOfContents.items.length > 0 ? this.renderTableOfContents(tableOfContents) : ''}
            </div>
        </div>
    </main>`;
  }

  private renderBreadcrumbs(breadcrumbs: BreadcrumbNavigation): string {
    return `
    <nav class="mb-8" aria-label="Breadcrumb">
        <ol class="flex items-center space-x-2 text-sm text-gray-500">
            ${breadcrumbs.items.map((item, index) => `
            <li class="flex items-center">
                ${index > 0 ? `<svg class="flex-shrink-0 h-4 w-4 mx-2 text-gray-300" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" /></svg>` : ''}
                ${item.isActive ?
                  `<span class="font-medium text-gray-900">${item.title}</span>` :
                  `<a href="${item.path}" class="hover:text-gray-700">${item.title}</a>`
                }
            </li>
            `).join('')}
        </ol>
    </nav>`;
  }

  private renderTableOfContents(toc: TableOfContents): string {
    const renderTocItems = (items: any[], level = 0): string => {
      return `
      <ul class="${level === 0 ? 'space-y-1' : 'ml-4 mt-1 space-y-1'}">
          ${items.map(item => `
          <li>
              <a href="${item.anchor}"
                 class="block px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md toc-link"
                 data-level="${item.level}">
                  ${item.text}
              </a>
              ${item.children && item.children.length > 0 ? renderTocItems(item.children, level + 1) : ''}
          </li>
          `).join('')}
      </ul>`;
    };

    return `
    <aside class="hidden xl:block w-56 flex-shrink-0">
        <div class="sticky top-24 px-6 py-8">
            <h2 class="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
                On this page
            </h2>
            <nav class="toc-navigation">
                ${renderTocItems(toc.items)}
            </nav>
        </div>
    </aside>`;
  }

  private renderPageNavigation(previousPage?: NavigationPageRef, nextPage?: NavigationPageRef): string {
    if (!previousPage && !nextPage) return '';

    return `
    <footer class="mt-12 pt-8 border-t border-gray-200">
        <div class="flex justify-between">
            ${previousPage ? `
            <a href="${previousPage.path}"
               class="flex items-center p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors group">
                <div class="flex items-center">
                    <svg class="h-5 w-5 text-gray-400 group-hover:text-gray-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    <div>
                        <p class="text-sm text-gray-500">Previous</p>
                        <p class="text-base font-medium text-gray-900">${previousPage.title}</p>
                    </div>
                </div>
            </a>
            ` : '<div></div>'}

            ${nextPage ? `
            <a href="${nextPage.path}"
               class="flex items-center p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors group text-right">
                <div class="flex items-center">
                    <div>
                        <p class="text-sm text-gray-500">Next</p>
                        <p class="text-base font-medium text-gray-900">${nextPage.title}</p>
                    </div>
                    <svg class="h-5 w-5 text-gray-400 group-hover:text-gray-600 ml-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                </div>
            </a>
            ` : '<div></div>'}
        </div>
    </footer>`;
  }

  private renderFooter(context: TemplateContext): string {
    return `
    <footer class="bg-gray-50 border-t border-gray-200">
        <div class="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div class="md:col-span-2">
                    <div class="flex items-center">
                        <img class="h-8 w-8" src="${context.assetsUrl}/logo.svg" alt="Rustic Debug">
                        <div class="ml-3">
                            <h3 class="text-lg font-semibold text-gray-900">Rustic Debug</h3>
                            <p class="text-sm text-gray-600">Redis messaging debugger for RusticAI</p>
                        </div>
                    </div>
                    <p class="mt-4 text-sm text-gray-600 max-w-md">
                        A comprehensive debugging tool for visualizing and analyzing Redis message flow in RusticAI guild systems.
                    </p>
                </div>

                <div>
                    <h4 class="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Documentation</h4>
                    <ul class="space-y-2">
                        <li><a href="/user-guide" class="text-sm text-gray-600 hover:text-gray-900">User Guide</a></li>
                        <li><a href="/dev-guide" class="text-sm text-gray-600 hover:text-gray-900">Developer Guide</a></li>
                        <li><a href="/api" class="text-sm text-gray-600 hover:text-gray-900">API Reference</a></li>
                        <li><a href="/examples" class="text-sm text-gray-600 hover:text-gray-900">Examples</a></li>
                    </ul>
                </div>

                <div>
                    <h4 class="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Community</h4>
                    <ul class="space-y-2">
                        <li><a href="https://github.com/rustic-ai/rustic-debug" class="text-sm text-gray-600 hover:text-gray-900">GitHub</a></li>
                        <li><a href="https://github.com/rustic-ai/rustic-debug/issues" class="text-sm text-gray-600 hover:text-gray-900">Issues</a></li>
                        <li><a href="https://github.com/rustic-ai/rustic-debug/discussions" class="text-sm text-gray-600 hover:text-gray-900">Discussions</a></li>
                    </ul>
                </div>
            </div>

            <div class="mt-8 pt-8 border-t border-gray-200 flex items-center justify-between">
                <p class="text-sm text-gray-600">
                    © ${new Date().getFullYear()} Rustic AI. All rights reserved.
                </p>
                <p class="text-sm text-gray-600">
                    Built with ❤️ and TypeScript
                </p>
            </div>
        </div>
    </footer>`;
  }

  private renderScripts(context: TemplateContext): string {
    return `
    <!-- Core JavaScript -->
    <script src="${context.assetsUrl}/js/main.js"></script>

    <!-- Search functionality -->
    ${context.searchEnabled ? `<script src="${context.assetsUrl}/js/search.js"></script>` : ''}

    <!-- Navigation scripts -->
    <script>
        // Mobile navigation
        const mobileMenuButton = document.getElementById('mobile-menu-button');
        const mobileNavOverlay = document.getElementById('mobile-nav-overlay');
        const mobileNavPanel = document.getElementById('mobile-nav-panel');
        const mobileNavClose = document.getElementById('mobile-nav-close');

        function openMobileNav() {
            mobileNavOverlay.classList.remove('hidden');
            mobileNavPanel.classList.remove('-translate-x-full');
        }

        function closeMobileNav() {
            mobileNavOverlay.classList.add('hidden');
            mobileNavPanel.classList.add('-translate-x-full');
        }

        if (mobileMenuButton) {
            mobileMenuButton.addEventListener('click', openMobileNav);
        }

        if (mobileNavClose) {
            mobileNavClose.addEventListener('click', closeMobileNav);
        }

        if (mobileNavOverlay) {
            mobileNavOverlay.addEventListener('click', closeMobileNav);
        }

        // Navigation toggles
        document.querySelectorAll('[data-toggle]').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = button.getAttribute('data-toggle');
                const target = document.getElementById(targetId);
                const icon = button.querySelector('svg');

                if (target && icon) {
                    target.classList.toggle('hidden');
                    icon.classList.toggle('rotate-90');
                }
            });
        });

        // Table of contents highlighting
        const tocLinks = document.querySelectorAll('.toc-link');
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');

        function updateTocHighlight() {
            let currentHeading = null;

            headings.forEach(heading => {
                const rect = heading.getBoundingClientRect();
                if (rect.top <= 100) {
                    currentHeading = heading;
                }
            });

            tocLinks.forEach(link => {
                link.classList.remove('text-blue-600', 'bg-blue-50');
                link.classList.add('text-gray-600');

                if (currentHeading && link.getAttribute('href') === '#' + currentHeading.id) {
                    link.classList.remove('text-gray-600');
                    link.classList.add('text-blue-600', 'bg-blue-50');
                }
            });
        }

        if (tocLinks.length > 0) {
            window.addEventListener('scroll', updateTocHighlight);
            updateTocHighlight();
        }

        // Theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                document.documentElement.classList.toggle('dark');
                localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
            });

            // Initialize theme
            const savedTheme = localStorage.getItem('theme');
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

            if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
                document.documentElement.classList.add('dark');
            }
        }
    </script>`;
  }

  private createRusticTheme(): RusticTheme {
    return {
      colors: {
        primary: '#2563eb',      // Blue-600
        secondary: '#64748b',    // Slate-500
        accent: '#06b6d4',       // Cyan-500
        background: '#ffffff',   // White
        surface: '#f8fafc',      // Slate-50
        text: '#0f172a',         // Slate-900
        textSecondary: '#475569', // Slate-600
        border: '#e2e8f0',       // Slate-200
        success: '#059669',      // Emerald-600
        warning: '#d97706',      // Amber-600
        error: '#dc2626',        // Red-600
        info: '#0284c7'          // Sky-600
      },
      typography: {
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        headingFamily: "'Inter', system-ui, -apple-system, sans-serif",
        codeFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontSize: {
          xs: '0.75rem',
          sm: '0.875rem',
          base: '1rem',
          lg: '1.125rem',
          xl: '1.25rem',
          '2xl': '1.5rem',
          '3xl': '1.875rem',
          '4xl': '2.25rem'
        }
      },
      spacing: {
        xs: '0.5rem',
        sm: '1rem',
        md: '1.5rem',
        lg: '2rem',
        xl: '3rem',
        '2xl': '4rem'
      },
      shadows: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)'
      },
      borderRadius: {
        sm: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem'
      }
    };
  }
}

export default PageTemplateEngine;