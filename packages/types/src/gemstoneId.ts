/**
 * GemstoneID: 64-bit unique identifier with embedded timestamp and priority
 * Format: [timestamp:48][priority:4][counter:12]
 */

export interface GemstoneID {
  readonly id: string;
  readonly timestamp: number;
  readonly priority: number;
  readonly counter: number;
}

export class GemstoneIdGenerator {
  private counter = 0;
  private lastTimestamp = 0;

  generate(priority = 0): GemstoneID {
    const timestamp = Date.now();
    
    if (timestamp === this.lastTimestamp) {
      this.counter = (this.counter + 1) & 0xfff; // 12-bit counter
      if (this.counter === 0) {
        // Wait for next millisecond
        while (Date.now() === timestamp) {
          // busy wait
        }
      }
    } else {
      this.counter = 0;
    }
    
    this.lastTimestamp = timestamp;

    const id = 
      ((BigInt(timestamp) & 0xffffffffffffn) << 16n) |
      ((BigInt(priority) & 0xfn) << 12n) |
      (BigInt(this.counter) & 0xfffn);

    return {
      id: id.toString(16).padStart(16, '0'),
      timestamp,
      priority,
      counter: this.counter
    };
  }

  parse(id: string): GemstoneID {
    // Handle simple string IDs (for testing)
    if (!/^[0-9a-fA-F]+$/.test(id)) {
      return {
        id,
        timestamp: Date.now(),
        priority: 0,
        counter: 0
      };
    }
    
    // If not 16 chars, treat as simple ID
    if (id.length !== 16) {
      return {
        id,
        timestamp: Date.now(),
        priority: 0,
        counter: 0
      };
    }
    
    try {
      const bigId = BigInt(`0x${id}`);
      
      const timestamp = Number((bigId >> 16n) & 0xffffffffffffn);
      const priority = Number((bigId >> 12n) & 0xfn);
      const counter = Number(bigId & 0xfffn);

      return { id, timestamp, priority, counter };
    } catch {
      // Fallback for invalid hex
      return {
        id,
        timestamp: Date.now(),
        priority: 0,
        counter: 0
      };
    }
  }

  isValid(id: string): boolean {
    if (!/^[0-9a-fA-F]{16}$/.test(id)) {
      return false;
    }
    
    try {
      const parsed = this.parse(id);
      return parsed.timestamp > 0 && parsed.timestamp <= Date.now();
    } catch {
      return false;
    }
  }
}

export const gemstoneId = new GemstoneIdGenerator();