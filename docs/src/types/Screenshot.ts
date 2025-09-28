export interface Screenshot {
  // Identification
  id: string;                    // Unique identifier
  filename: string;              // Generated filename
  alt: string;                   // Alt text for accessibility

  // Capture metadata
  pageUrl: string;               // Application URL captured
  viewport: ScreenshotViewport;

  // Content
  imagePath: string;             // Relative path to image file
  thumbnailPath?: string;        // Optional thumbnail for performance
  webpPath?: string;             // WebP version for modern browsers

  // Documentation context
  documentationPages: string[];  // Pages that reference this screenshot
  section: string;               // What UI section/feature is shown
  description: string;           // What the screenshot demonstrates

  // Automation
  captureConfig: ScreenshotCaptureConfig;

  // Version control
  version: number;               // Screenshot version number
  hash: string;                  // Content hash for change detection
  capturedAt: Date;              // When screenshot was taken
  appVersion?: string;           // Application version when captured

  // Status
  status: ScreenshotStatus;
  verificationNeeded: boolean;   // Manual review required
}

export interface ScreenshotViewport {
  width: number;                 // Screenshot width in pixels
  height: number;                // Screenshot height in pixels
  deviceType: 'desktop' | 'tablet' | 'mobile';
  devicePixelRatio?: number;     // For high-DPI displays
}

export interface ScreenshotCaptureConfig {
  selector?: string;             // CSS selector to focus on
  waitFor?: string | number;     // Element or timeout to wait for
  hideSelectors?: string[];      // Elements to hide during capture
  customActions?: ScreenshotAction[]; // Custom actions before capture
  fullPage?: boolean;            // Capture full page or viewport only
  quality?: number;              // Image quality (1-100)
  type?: 'png' | 'jpeg';         // Image format
}

export interface ScreenshotAction {
  type: 'click' | 'scroll' | 'hover' | 'fill' | 'wait';
  selector?: string;
  value?: string | number;
  delay?: number;
}

export type ScreenshotStatus = 'current' | 'outdated' | 'missing' | 'failed' | 'pending';

export interface ScreenshotComparison {
  previousHash: string;
  currentHash: string;
  differenceDetected: boolean;
  pixelDifference: number;
  percentageDifference: number;
  diffImagePath?: string;
}

export interface ScreenshotBatch {
  id: string;
  pages: ScreenshotPageConfig[];
  viewports: ScreenshotViewport[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  results: ScreenshotBatchResult[];
}

export interface ScreenshotPageConfig {
  path: string;                  // URL path to capture
  name: string;                  // Name for the screenshot file
  config?: Partial<ScreenshotCaptureConfig>;
}

export interface ScreenshotBatchResult {
  page: string;
  viewport: ScreenshotViewport;
  success: boolean;
  screenshot?: Screenshot;
  error?: ScreenshotError;
  duration: number;              // Capture time in milliseconds
}

export interface ScreenshotError {
  type: 'timeout' | 'navigation' | 'element-not-found' | 'capture-failed';
  message: string;
  stack?: string;
  pageUrl: string;
  timestamp: Date;
}

export interface ScreenshotOptimization {
  originalSize: number;          // Original file size in bytes
  optimizedSize: number;         // Optimized file size in bytes
  compressionRatio: number;      // Compression ratio (0-1)
  formats: ScreenshotFormat[];   // Generated formats
}

export interface ScreenshotFormat {
  format: 'png' | 'webp' | 'jpeg';
  path: string;
  size: number;                  // File size in bytes
  quality: number;               // Quality setting used
}

export interface ScreenshotValidation {
  isValid: boolean;
  errors: ScreenshotValidationError[];
  warnings: ScreenshotValidationWarning[];
}

export interface ScreenshotValidationError {
  type: 'missing-file' | 'invalid-format' | 'corrupt-image' | 'size-mismatch';
  message: string;
  path: string;
}

export interface ScreenshotValidationWarning {
  type: 'large-file-size' | 'low-quality' | 'outdated' | 'unused';
  message: string;
  path: string;
}