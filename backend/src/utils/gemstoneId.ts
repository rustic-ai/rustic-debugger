// Re-export from the types package and add any backend-specific utilities
export { gemstoneId, type GemstoneID } from '@rustic-debug/types';
import { gemstoneId as gemstoneIdInstance } from '@rustic-debug/types';

// Backend-specific validation
export function validateMessageId(id: string): boolean {
  return gemstoneIdInstance.isValid(id);
}

// Generate ID with specific priority for different message types
export function generateMessageId(priority = 0): string {
  return gemstoneIdInstance.generate(priority).id;
}

// Extract timestamp from message ID
export function getMessageTimestamp(id: string): Date | null {
  try {
    const parsed = gemstoneIdInstance.parse(id);
    return new Date(parsed.timestamp);
  } catch {
    return null;
  }
}