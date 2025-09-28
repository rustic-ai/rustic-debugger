import { readFile, writeFile, mkdir, copyFile, stat } from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import sharp from 'sharp';
import { createHash } from 'crypto';

export interface AssetOptimizerOptions {
  inputDir: string;
  outputDir: string;
  imageFormats: ImageFormatConfig[];
  quality: Record<string, number>;
  sizes: number[];
  enableLazyLoading: boolean;
  generatePlaceholders: boolean;
  fingerprint: boolean;
  compress: boolean;
}

export interface ImageFormatConfig {
  format: 'webp' | 'jpeg' | 'png' | 'avif';
  quality: number;
  enabled: boolean;
}

export interface OptimizationResult {
  originalPath: string;
  optimizedFiles: OptimizedFile[];
  originalSize: number;
  totalOptimizedSize: number;
  compressionRatio: number;
  processingTime: number;
}

export interface OptimizedFile {
  path: string;
  format: string;
  size: number;
  width: number;
  height: number;
  quality: number;
  hash?: string;
}

export interface AssetManifest {
  version: string;
  generated: Date;
  assets: AssetEntry[];
  totalOriginalSize: number;
  totalOptimizedSize: number;
  compressionRatio: number;
}

export interface AssetEntry {
  original: string;
  optimized: OptimizedFile[];
  type: 'image' | 'font' | 'video' | 'document' | 'other';
  category: 'screenshot' | 'illustration' | 'icon' | 'diagram' | 'photo' | 'other';
}

export class AssetOptimizer {
  private options: AssetOptimizerOptions;
  private processedAssets: Map<string, OptimizationResult> = new Map();
  private manifest: AssetManifest;

  constructor(options: AssetOptimizerOptions) {
    this.options = options;
    this.manifest = {
      version: '1.0.0',
      generated: new Date(),
      assets: [],
      totalOriginalSize: 0,
      totalOptimizedSize: 0,
      compressionRatio: 0
    };
  }

  async optimizeAssets(): Promise<AssetManifest> {
    await this.ensureOutputDirectory();

    // Find all assets to process
    const assetFiles = await this.findAssets();

    console.log(`Found ${assetFiles.length} assets to optimize`);

    // Process assets by type
    const imageFiles = assetFiles.filter(file => this.isImageFile(file));
    const otherFiles = assetFiles.filter(file => !this.isImageFile(file));

    // Optimize images
    for (const imagePath of imageFiles) {
      try {
        const result = await this.optimizeImage(imagePath);
        this.processedAssets.set(imagePath, result);
        this.addToManifest(imagePath, result, 'image');
      } catch (error) {
        console.error(`Failed to optimize image ${imagePath}:`, error);
      }
    }

    // Copy other assets
    for (const assetPath of otherFiles) {
      try {
        const result = await this.copyAsset(assetPath);
        this.processedAssets.set(assetPath, result);
        this.addToManifest(assetPath, result, this.getAssetType(assetPath));
      } catch (error) {
        console.error(`Failed to copy asset ${assetPath}:`, error);
      }
    }

    // Update manifest totals
    this.updateManifestTotals();

    // Save manifest
    await this.saveManifest();

    return this.manifest;
  }

  private async findAssets(): Promise<string[]> {
    const patterns = [
      '**/*.{jpg,jpeg,png,gif,webp,svg,avif}', // Images
      '**/*.{woff,woff2,ttf,otf,eot}',        // Fonts
      '**/*.{mp4,webm,avi,mov}',              // Videos
      '**/*.{pdf,doc,docx,xls,xlsx}',         // Documents
      '**/*.{css,js,json,xml}'                // Other assets
    ];

    const files: string[] = [];

    for (const pattern of patterns) {
      const matches = await glob(pattern, {
        cwd: this.options.inputDir,
        ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**']
      });
      files.push(...matches);
    }

    return [...new Set(files)]; // Remove duplicates
  }

  private async optimizeImage(relativePath: string): Promise<OptimizationResult> {
    const startTime = Date.now();
    const inputPath = path.join(this.options.inputDir, relativePath);
    const outputDir = path.join(this.options.outputDir, path.dirname(relativePath));

    await mkdir(outputDir, { recursive: true });

    const originalStats = await stat(inputPath);
    const originalSize = originalStats.size;

    const optimizedFiles: OptimizedFile[] = [];

    // Load the image
    const image = sharp(inputPath);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error(`Could not read image metadata: ${relativePath}`);
    }

    // Generate different formats
    for (const formatConfig of this.options.imageFormats) {
      if (!formatConfig.enabled) continue;

      // Generate responsive sizes
      const sizes = this.getSizesForImage(metadata.width);

      for (const size of sizes) {
        const optimizedFile = await this.generateImageVariant(
          image,
          relativePath,
          formatConfig,
          size,
          metadata.width,
          metadata.height
        );

        if (optimizedFile) {
          optimizedFiles.push(optimizedFile);
        }
      }
    }

    // Generate placeholder if enabled
    if (this.options.generatePlaceholders) {
      const placeholder = await this.generatePlaceholder(image, relativePath);
      if (placeholder) {
        optimizedFiles.push(placeholder);
      }
    }

    const totalOptimizedSize = optimizedFiles.reduce((sum, file) => sum + file.size, 0);
    const compressionRatio = totalOptimizedSize / originalSize;

    return {
      originalPath: relativePath,
      optimizedFiles,
      originalSize,
      totalOptimizedSize,
      compressionRatio,
      processingTime: Date.now() - startTime
    };
  }

  private async generateImageVariant(
    image: sharp.Sharp,
    relativePath: string,
    formatConfig: ImageFormatConfig,
    targetWidth: number,
    originalWidth: number,
    originalHeight: number
  ): Promise<OptimizedFile | null> {
    try {
      // Skip if target size is larger than original
      if (targetWidth > originalWidth) return null;

      const targetHeight = Math.round((originalHeight * targetWidth) / originalWidth);
      const filename = this.generateFilename(relativePath, formatConfig.format, targetWidth);
      const outputPath = path.join(this.options.outputDir, filename);

      let pipeline = image.clone().resize(targetWidth, targetHeight, {
        fit: 'inside',
        withoutEnlargement: true
      });

      // Apply format-specific optimizations
      switch (formatConfig.format) {
        case 'webp':
          pipeline = pipeline.webp({ quality: formatConfig.quality });
          break;
        case 'jpeg':
          pipeline = pipeline.jpeg({ quality: formatConfig.quality, mozjpeg: true });
          break;
        case 'png':
          pipeline = pipeline.png({ quality: formatConfig.quality, compressionLevel: 9 });
          break;
        case 'avif':
          pipeline = pipeline.avif({ quality: formatConfig.quality });
          break;
        default:
          return null;
      }

      const outputBuffer = await pipeline.toBuffer();
      await writeFile(outputPath, outputBuffer);

      const optimizedStats = await stat(outputPath);
      const hash = this.options.fingerprint ? this.generateHash(outputBuffer) : undefined;

      return {
        path: filename,
        format: formatConfig.format,
        size: optimizedStats.size,
        width: targetWidth,
        height: targetHeight,
        quality: formatConfig.quality,
        hash
      };
    } catch (error) {
      console.error(`Failed to generate ${formatConfig.format} variant for ${relativePath}:`, error);
      return null;
    }
  }

  private async generatePlaceholder(image: sharp.Sharp, relativePath: string): Promise<OptimizedFile | null> {
    try {
      const filename = this.generateFilename(relativePath, 'placeholder', 32);
      const outputPath = path.join(this.options.outputDir, filename);

      const placeholderBuffer = await image
        .clone()
        .resize(32, 32, { fit: 'inside' })
        .blur(2)
        .jpeg({ quality: 70 })
        .toBuffer();

      await writeFile(outputPath, placeholderBuffer);

      const stats = await stat(outputPath);

      return {
        path: filename,
        format: 'placeholder',
        size: stats.size,
        width: 32,
        height: 32,
        quality: 70
      };
    } catch (error) {
      console.error(`Failed to generate placeholder for ${relativePath}:`, error);
      return null;
    }
  }

  private async copyAsset(relativePath: string): Promise<OptimizationResult> {
    const startTime = Date.now();
    const inputPath = path.join(this.options.inputDir, relativePath);
    const outputPath = path.join(this.options.outputDir, relativePath);
    const outputDir = path.dirname(outputPath);

    await mkdir(outputDir, { recursive: true });

    const originalStats = await stat(inputPath);
    let finalPath = outputPath;

    if (this.options.fingerprint) {
      const buffer = await readFile(inputPath);
      const hash = this.generateHash(buffer);
      const ext = path.extname(relativePath);
      const basename = path.basename(relativePath, ext);
      const dirname = path.dirname(relativePath);
      finalPath = path.join(this.options.outputDir, dirname, `${basename}.${hash}${ext}`);
    }

    await copyFile(inputPath, finalPath);

    const finalStats = await stat(finalPath);
    const hash = this.options.fingerprint ? this.generateHash(await readFile(finalPath)) : undefined;

    const optimizedFile: OptimizedFile = {
      path: path.relative(this.options.outputDir, finalPath),
      format: path.extname(relativePath).slice(1),
      size: finalStats.size,
      width: 0,
      height: 0,
      quality: 100,
      hash
    };

    return {
      originalPath: relativePath,
      optimizedFiles: [optimizedFile],
      originalSize: originalStats.size,
      totalOptimizedSize: finalStats.size,
      compressionRatio: finalStats.size / originalStats.size,
      processingTime: Date.now() - startTime
    };
  }

  private getSizesForImage(originalWidth: number): number[] {
    return this.options.sizes.filter(size => size <= originalWidth);
  }

  private generateFilename(originalPath: string, format: string, width?: number): string {
    const ext = path.extname(originalPath);
    const basename = path.basename(originalPath, ext);
    const dirname = path.dirname(originalPath);

    let filename: string;

    if (format === 'placeholder') {
      filename = `${basename}.placeholder.jpg`;
    } else if (width) {
      filename = `${basename}-${width}w.${format}`;
    } else {
      filename = `${basename}.${format}`;
    }

    return path.join(dirname, filename);
  }

  private generateHash(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex').slice(0, 8);
  }

  private isImageFile(filePath: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif'];
    const ext = path.extname(filePath).toLowerCase();
    return imageExtensions.includes(ext);
  }

  private getAssetType(filePath: string): AssetEntry['type'] {
    const ext = path.extname(filePath).toLowerCase();

    const typeMap: Record<string, AssetEntry['type']> = {
      '.jpg': 'image',
      '.jpeg': 'image',
      '.png': 'image',
      '.gif': 'image',
      '.webp': 'image',
      '.svg': 'image',
      '.avif': 'image',
      '.woff': 'font',
      '.woff2': 'font',
      '.ttf': 'font',
      '.otf': 'font',
      '.eot': 'font',
      '.mp4': 'video',
      '.webm': 'video',
      '.avi': 'video',
      '.mov': 'video',
      '.pdf': 'document',
      '.doc': 'document',
      '.docx': 'document',
      '.xls': 'document',
      '.xlsx': 'document'
    };

    return typeMap[ext] || 'other';
  }

  private getAssetCategory(filePath: string): AssetEntry['category'] {
    const filename = path.basename(filePath).toLowerCase();

    if (filename.includes('screenshot') || filename.includes('capture')) {
      return 'screenshot';
    }
    if (filename.includes('icon') || filename.includes('logo')) {
      return 'icon';
    }
    if (filename.includes('diagram') || filename.includes('chart')) {
      return 'diagram';
    }
    if (filename.includes('photo') || filename.includes('picture')) {
      return 'photo';
    }

    return 'illustration';
  }

  private addToManifest(originalPath: string, result: OptimizationResult, type: AssetEntry['type']): void {
    const category = this.getAssetCategory(originalPath);

    const entry: AssetEntry = {
      original: originalPath,
      optimized: result.optimizedFiles,
      type,
      category
    };

    this.manifest.assets.push(entry);
  }

  private updateManifestTotals(): void {
    let totalOriginalSize = 0;
    let totalOptimizedSize = 0;

    for (const [, result] of this.processedAssets) {
      totalOriginalSize += result.originalSize;
      totalOptimizedSize += result.totalOptimizedSize;
    }

    this.manifest.totalOriginalSize = totalOriginalSize;
    this.manifest.totalOptimizedSize = totalOptimizedSize;
    this.manifest.compressionRatio = totalOptimizedSize / totalOriginalSize;
  }

  private async saveManifest(): Promise<void> {
    const manifestPath = path.join(this.options.outputDir, 'asset-manifest.json');
    await writeFile(manifestPath, JSON.stringify(this.manifest, null, 2));
  }

  private async ensureOutputDirectory(): Promise<void> {
    await mkdir(this.options.outputDir, { recursive: true });
  }

  // Utility methods for generating responsive image markup
  generatePictureMarkup(originalPath: string, alt: string, className?: string): string {
    const result = this.processedAssets.get(originalPath);
    if (!result) return `<img src="${originalPath}" alt="${alt}" ${className ? `class="${className}"` : ''} />`;

    const webpFiles = result.optimizedFiles.filter(f => f.format === 'webp');
    const jpegFiles = result.optimizedFiles.filter(f => f.format === 'jpeg');
    const placeholder = result.optimizedFiles.find(f => f.format === 'placeholder');

    let markup = '<picture>';

    // WebP sources
    if (webpFiles.length > 0) {
      const srcset = webpFiles.map(f => `${f.path} ${f.width}w`).join(', ');
      markup += `<source type="image/webp" srcset="${srcset}" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />`;
    }

    // JPEG fallback
    if (jpegFiles.length > 0) {
      const srcset = jpegFiles.map(f => `${f.path} ${f.width}w`).join(', ');
      markup += `<source type="image/jpeg" srcset="${srcset}" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />`;
    }

    // Fallback img
    const fallbackSrc = jpegFiles[0]?.path || webpFiles[0]?.path || originalPath;
    const loading = this.options.enableLazyLoading ? 'loading="lazy"' : '';
    const placeholderAttr = placeholder ? `data-placeholder="${placeholder.path}"` : '';

    markup += `<img src="${fallbackSrc}" alt="${alt}" ${className ? `class="${className}"` : ''} ${loading} ${placeholderAttr} />`;
    markup += '</picture>';

    return markup;
  }

  generateSrcSet(originalPath: string, format: 'webp' | 'jpeg' = 'jpeg'): string {
    const result = this.processedAssets.get(originalPath);
    if (!result) return '';

    const files = result.optimizedFiles.filter(f => f.format === format);
    return files.map(f => `${f.path} ${f.width}w`).join(', ');
  }

  getOptimizedPath(originalPath: string, format: 'webp' | 'jpeg' = 'jpeg', width?: number): string {
    const result = this.processedAssets.get(originalPath);
    if (!result) return originalPath;

    const files = result.optimizedFiles.filter(f => f.format === format);

    if (width) {
      const exactMatch = files.find(f => f.width === width);
      if (exactMatch) return exactMatch.path;

      // Find closest size
      const closest = files.reduce((prev, curr) =>
        Math.abs(curr.width - width) < Math.abs(prev.width - width) ? curr : prev
      );
      return closest.path;
    }

    // Return largest size
    const largest = files.reduce((prev, curr) => curr.width > prev.width ? curr : prev);
    return largest?.path || originalPath;
  }

  getCompressionReport(): string {
    let report = 'Asset Optimization Report\n';
    report += '========================\n\n';

    const totalOriginal = this.manifest.totalOriginalSize;
    const totalOptimized = this.manifest.totalOptimizedSize;
    const savings = totalOriginal - totalOptimized;
    const percentage = ((savings / totalOriginal) * 100).toFixed(1);

    report += `Total Original Size: ${this.formatBytes(totalOriginal)}\n`;
    report += `Total Optimized Size: ${this.formatBytes(totalOptimized)}\n`;
    report += `Total Savings: ${this.formatBytes(savings)} (${percentage}%)\n\n`;

    report += `Processed ${this.manifest.assets.length} assets:\n`;

    for (const asset of this.manifest.assets) {
      const result = this.processedAssets.get(asset.original);
      if (result) {
        const savings = result.originalSize - result.totalOptimizedSize;
        const percentage = ((savings / result.originalSize) * 100).toFixed(1);
        report += `- ${asset.original}: ${this.formatBytes(savings)} saved (${percentage}%)\n`;
      }
    }

    return report;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export default AssetOptimizer;