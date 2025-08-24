/**
 * TimeService - Centralized timezone and time formatting utilities
 * 
 * This service ensures consistent time handling across the app:
 * - All times are stored in UTC milliseconds
 * - Display formatting respects user's local timezone
 * - Notifications show time in receiver's timezone
 */

export class TimeService {
  // Time constants for consistency
  static readonly MINUTE_MS = 60 * 1000;
  static readonly HOUR_MS = 60 * 60 * 1000;
  static readonly DAY_MS = 24 * 60 * 60 * 1000;
  
  /**
   * Format a timestamp for display in the user's local timezone
   */
  static formatLocalTime(timestampMs: number): string {
    const date = new Date(timestampMs);
    return date.toLocaleTimeString([], { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  }

  /**
   * Format a timestamp with date and time in user's local timezone
   */
  static formatLocalDateTime(timestampMs: number): string {
    const date = new Date(timestampMs);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return `Today at ${this.formatLocalTime(timestampMs)}`;
    }
    
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = date.toDateString() === tomorrow.toDateString();
    
    if (isTomorrow) {
      return `Tomorrow at ${this.formatLocalTime(timestampMs)}`;
    }
    
    return date.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  /**
   * Get the current time rounded up to the next 10-minute interval
   * This is used for the default ping scheduling time
   */
  static getNextRounded10Minutes(): Date {
    const now = new Date();
    const minutes = now.getMinutes();
    const roundedMinutes = Math.ceil(minutes / 10) * 10;
    
    const result = new Date(now);
    result.setMinutes(roundedMinutes, 0, 0); // Set seconds and ms to 0
    
    // If we rounded to 60 minutes, increment hour and set minutes to 0
    if (result.getMinutes() === 60) {
      result.setHours(result.getHours() + 1, 0, 0, 0);
    }
    
    return result;
  }

  /**
   * Calculate time difference in a human-readable format
   */
  static getTimeUntil(futureTimestampMs: number): string {
    const now = Date.now();
    const diffMs = futureTimestampMs - now;
    
    if (diffMs <= 0) {
      return 'Now';
    }
    
    const diffMinutes = Math.ceil(diffMs / this.MINUTE_MS);
    
    if (diffMinutes < 60) {
      return `${diffMinutes}m`;
    }
    
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    
    if (hours < 24) {
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  }

  /**
   * Check if a timestamp is today in the user's local timezone
   */
  static isToday(timestampMs: number): boolean {
    const date = new Date(timestampMs);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  /**
   * Get timezone offset string (e.g., "UTC-8", "UTC+2")
   */
  static getTimezoneOffset(): string {
    const offset = new Date().getTimezoneOffset();
    const hours = Math.floor(Math.abs(offset) / 60);
    const minutes = Math.abs(offset) % 60;
    const sign = offset <= 0 ? '+' : '-';
    
    if (minutes === 0) {
      return `UTC${sign}${hours}`;
    }
    return `UTC${sign}${hours}:${minutes.toString().padStart(2, '0')}`;
  }

  /**
   * Format notification body with proper local time
   * Used when processing notification data on the client
   */
  static formatNotificationTime(scheduledAtMs: number, creatorName: string): string {
    const localTime = this.formatLocalTime(scheduledAtMs);
    return `${creatorName} start playing at ${localTime}`;
  }

  /**
   * Format time elapsed since a past timestamp (e.g., "2h 30m ago", "3d ago")
   */
  static getTimeSince(pastTimestampMs: number): string {
    const now = Date.now();
    const diff = now - pastTimestampMs;
    const diffMinutes = Math.floor(diff / this.MINUTE_MS);
    
    if (diffMinutes <= 0) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    
    const hours = Math.floor(diffMinutes / 60);
    if (hours < 24) {
      const minutes = diffMinutes % 60;
      return minutes > 0 ? `${hours}h ${minutes}m ago` : `${hours}h ago`;
    }
    
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h ago` : `${days}d ago`;
  }
}
