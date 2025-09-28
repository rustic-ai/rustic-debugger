/**
 * Exponential backoff reconnection strategy for Redis
 * Implements the spec requirement: 1s, 2s, 4s... up to 30s
 */

interface BackoffOptions {
  initialDelay?: number;
  maxDelay?: number;
  factor?: number;
  maxRetries?: number;
}

const defaultOptions: Required<BackoffOptions> = {
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  factor: 2,
  maxRetries: 10,
};

export function exponentialBackoff(times: number): number | null {
  const options = defaultOptions;
  
  if (times > options.maxRetries) {
    // Stop retrying after max attempts
    return null;
  }
  
  // Calculate delay with exponential backoff
  const delay = Math.min(
    options.initialDelay * Math.pow(options.factor, times - 1),
    options.maxDelay
  );
  
  console.log(`Redis reconnection attempt ${times}, waiting ${delay}ms`);
  
  return delay;
}

// Helper class for managing reconnection state
export class ReconnectionManager {
  private reconnectTimer: NodeJS.Timeout | null = null;
  private attemptCount = 0;
  private isReconnecting = false;
  
  constructor(
    private readonly connect: () => Promise<void>,
    private readonly options: BackoffOptions = defaultOptions
  ) {}
  
  async startReconnection(): Promise<void> {
    if (this.isReconnecting) {
      return;
    }
    
    this.isReconnecting = true;
    this.attemptCount = 0;
    
    while (this.isReconnecting && this.attemptCount < (this.options.maxRetries ?? defaultOptions.maxRetries)) {
      this.attemptCount++;
      
      try {
        await this.connect();
        // Success - reset state
        this.reset();
        console.log('Reconnection successful');
        return;
      } catch (error) {
        console.error(`Reconnection attempt ${this.attemptCount} failed:`, error);
        
        const delay = exponentialBackoff(this.attemptCount);
        if (delay === null) {
          console.error('Max reconnection attempts reached');
          this.reset();
          throw new Error('Failed to reconnect after maximum attempts');
        }
        
        // Wait before next attempt
        await new Promise(resolve => {
          this.reconnectTimer = setTimeout(resolve, delay);
        });
      }
    }
  }
  
  stopReconnection(): void {
    this.reset();
  }
  
  private reset(): void {
    this.isReconnecting = false;
    this.attemptCount = 0;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
  
  get isActive(): boolean {
    return this.isReconnecting;
  }
  
  get attempts(): number {
    return this.attemptCount;
  }
}