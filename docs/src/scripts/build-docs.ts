#!/usr/bin/env node

import { marked } from 'marked';
import { gfmHeadingId } from 'marked-gfm-heading-id';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';
import matter from 'gray-matter';
import { readFile, writeFile, mkdir, readdir } from 'fs/promises';
import path from 'path';
import { glob } from 'glob';

// Configure marked
marked.use(gfmHeadingId());
marked.use(markedHighlight({
  langPrefix: 'hljs language-',
  highlight: (code, lang) => {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  }
}));

async function processMarkdownFile(filePath: string, outputDir: string) {
  const content = await readFile(filePath, 'utf-8');
  const { data: frontMatter, content: markdown } = matter(content);

  // Convert markdown to HTML
  const htmlContent = await marked.parse(markdown);

  // Create HTML page
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${frontMatter.title || 'Documentation'} | Rustic Debug</title>
    <meta name="description" content="${frontMatter.description || 'Rustic Debug documentation'}">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            line-height: 1.6;
            color: #333;
            background: #fff;
        }
        .container {
            display: flex;
            min-height: 100vh;
        }
        .sidebar {
            width: 260px;
            background: #f8f9fa;
            border-right: 1px solid #e9ecef;
            padding: 2rem 1rem;
            position: fixed;
            height: 100vh;
            overflow-y: auto;
        }
        .content {
            flex: 1;
            margin-left: 260px;
            padding: 2rem 3rem;
            max-width: 900px;
        }
        .sidebar h3 {
            color: #2563eb;
            margin-bottom: 1rem;
            font-size: 1.1rem;
        }
        .sidebar ul {
            list-style: none;
        }
        .sidebar li {
            margin-bottom: 0.5rem;
        }
        .sidebar a {
            color: #666;
            text-decoration: none;
            display: block;
            padding: 0.5rem;
            border-radius: 4px;
            transition: all 0.2s;
        }
        .sidebar a:hover {
            background: #e9ecef;
            color: #2563eb;
        }
        .sidebar a.active {
            background: #2563eb;
            color: white;
        }
        h1 {
            color: #2563eb;
            margin-bottom: 1rem;
            font-size: 2.5rem;
            border-bottom: 2px solid #e9ecef;
            padding-bottom: 0.5rem;
        }
        h2 {
            color: #333;
            margin: 2rem 0 1rem;
            font-size: 1.8rem;
            border-bottom: 1px solid #e9ecef;
            padding-bottom: 0.3rem;
        }
        h3 {
            color: #555;
            margin: 1.5rem 0 0.5rem;
            font-size: 1.3rem;
        }
        p {
            margin-bottom: 1rem;
            line-height: 1.7;
        }
        ul, ol {
            margin-bottom: 1rem;
            padding-left: 2rem;
        }
        li {
            margin-bottom: 0.5rem;
            line-height: 1.6;
        }
        code {
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Monaco', 'Courier New', monospace;
            font-size: 0.9em;
        }
        pre {
            background: #1e1e1e;
            color: #d4d4d4;
            padding: 1rem;
            border-radius: 8px;
            overflow-x: auto;
            margin: 1rem 0;
        }
        pre code {
            background: none;
            padding: 0;
            color: inherit;
        }
        blockquote {
            border-left: 4px solid #2563eb;
            padding-left: 1rem;
            margin: 1rem 0;
            color: #666;
            font-style: italic;
        }
        a {
            color: #2563eb;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
        strong {
            font-weight: 600;
            color: #222;
        }
        .meta {
            color: #666;
            font-size: 0.9rem;
            margin-bottom: 2rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid #e9ecef;
        }
        .badge {
            display: inline-block;
            background: #28a745;
            color: white;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.8rem;
            margin-left: 0.5rem;
        }

        /* Syntax highlighting */
        .hljs { background: #1e1e1e; }
        .hljs-keyword { color: #569cd6; }
        .hljs-string { color: #ce9178; }
        .hljs-number { color: #b5cea8; }
        .hljs-comment { color: #608b4e; }
        .hljs-function { color: #dcdcaa; }
        .hljs-class { color: #4ec9b0; }
        .hljs-variable { color: #9cdcfe; }

        @media (max-width: 768px) {
            .sidebar {
                display: none;
            }
            .content {
                margin-left: 0;
                padding: 1rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <nav class="sidebar">
            <h3>📚 Documentation</h3>
            <ul>
                <li><a href="/index.html">Home</a></li>
                <li><a href="/user-guide/index.html" ${filePath.includes('user-guide') ? 'class="active"' : ''}>User Guide</a></li>
                <li><a href="/dev-guide/index.html" ${filePath.includes('dev-guide') ? 'class="active"' : ''}>Developer Guide</a></li>
            </ul>

            ${filePath.includes('user-guide') ? `
            <h3>User Guide</h3>
            <ul>
                <li><a href="/user-guide/index.html">Overview</a></li>
                <li><a href="/user-guide/screenshots.html">Screenshots</a></li>
                <li><a href="/user-guide/installation.html">Installation</a></li>
                <li><a href="/user-guide/configuration.html">Configuration</a></li>
                <li><a href="/user-guide/basic-usage.html">Basic Usage</a></li>
                <li><a href="/user-guide/advanced.html">Advanced Features</a></li>
            </ul>
            ` : ''}

            ${filePath.includes('dev-guide') ? `
            <h3>Developer Guide</h3>
            <ul>
                <li><a href="/dev-guide/index.html">Overview</a></li>
                <li><a href="/dev-guide/architecture.html">Architecture</a></li>
                <li><a href="/dev-guide/api.html">API Reference</a></li>
                <li><a href="/dev-guide/integration.html">Integration</a></li>
                <li><a href="/dev-guide/contributing.html">Contributing</a></li>
            </ul>
            ` : ''}
        </nav>

        <main class="content">
            <div class="meta">
                ${frontMatter.description ? `<p>${frontMatter.description}</p>` : ''}
                ${frontMatter.tags ? `<p>Tags: ${frontMatter.tags.map(tag => `<span class="badge">${tag}</span>`).join('')}</p>` : ''}
            </div>

            ${htmlContent}
        </main>
    </div>
</body>
</html>`;

  // Calculate output path
  const relativePath = path.relative(path.join(process.cwd(), 'src/content'), filePath);
  const htmlPath = relativePath.replace(/\.md$/, '.html');
  const outputPath = path.join(outputDir, htmlPath);

  // Ensure directory exists
  await mkdir(path.dirname(outputPath), { recursive: true });

  // Write HTML file
  await writeFile(outputPath, html);
  console.log(`✅ Generated: ${htmlPath}`);
}

async function buildDocs() {
  console.log('🏗️  Building documentation...\n');

  const contentDir = path.join(process.cwd(), 'src/content');
  const outputDir = path.join(process.cwd(), 'dist');

  // Create output directory
  await mkdir(outputDir, { recursive: true });

  // Find all markdown files
  const files = await glob('**/*.md', {
    cwd: contentDir,
    absolute: true
  });

  console.log(`📝 Found ${files.length} markdown files\n`);

  // Process each file
  for (const file of files) {
    await processMarkdownFile(file, outputDir);
  }

  // Copy index.html
  const indexContent = await readFile(path.join(process.cwd(), 'src/index.html'), 'utf-8');
  await writeFile(path.join(outputDir, 'index.html'), indexContent);
  console.log('✅ Copied: index.html');

  console.log('\n✨ Documentation build complete!');
  console.log(`📁 Output directory: ${outputDir}`);
}

// Run the build
buildDocs().catch(console.error);