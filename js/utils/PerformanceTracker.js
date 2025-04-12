// PerformanceTracker.js
// Utility for tracking performance metrics of image processing operations

import { ImageContextDebug } from './ImageContextDebug.js';

/**
 * Constants for performance tracking
 */
const STORAGE_KEY_STATS = 'engageiq_perf_stats';
const DEFAULT_TIME_BUDGET = {
  imageSelection: 50,   // ms
  imageValidation: 30,  // ms
  imageConversion: 300, // ms
  totalProcessing: 500  // ms
};

/**
 * Class to track operation timing and statistics
 */
class OperationStats {
  constructor(name) {
    this.name = name;
    this.count = 0;
    this.totalTime = 0;
    this.minTime = Number.MAX_VALUE;
    this.maxTime = 0;
    this.avgTime = 0;
    this.lastTime = 0;
    this.timeBudget = DEFAULT_TIME_BUDGET[name] || 100;
  }

  /**
   * Add a new timing sample
   * @param {number} time - Time in ms for this operation
   */
  addSample(time) {
    this.count++;
    this.totalTime += time;
    this.minTime = Math.min(this.minTime, time);
    this.maxTime = Math.max(this.maxTime, time);
    this.avgTime = this.totalTime / this.count;
    this.lastTime = time;

    // Check budget exceedance
    if (time > this.timeBudget) {
      ImageContextDebug.logWarning(
        `Operation "${this.name}" exceeded time budget: ${time.toFixed(2)}ms > ${this.timeBudget}ms`
      );
    }
  }

  /**
   * Get JSON representation of stats
   * @returns {Object} Stats in a serializable format
   */
  toJSON() {
    return {
      name: this.name,
      count: this.count,
      totalTime: this.totalTime,
      minTime: this.minTime === Number.MAX_VALUE ? 0 : this.minTime,
      maxTime: this.maxTime,
      avgTime: this.avgTime,
      lastTime: this.lastTime,
      timeBudget: this.timeBudget
    };
  }

  /**
   * Create from JSON data
   * @param {Object} data - JSON data from toJSON()
   * @returns {OperationStats} New stats object
   */
  static fromJSON(data) {
    const stats = new OperationStats(data.name);
    stats.count = data.count || 0;
    stats.totalTime = data.totalTime || 0;
    stats.minTime = data.minTime || 0;
    stats.maxTime = data.maxTime || 0;
    stats.avgTime = data.avgTime || 0;
    stats.lastTime = data.lastTime || 0;
    stats.timeBudget = data.timeBudget || DEFAULT_TIME_BUDGET[data.name] || 100;
    return stats;
  }
}

/**
 * Storage for active timers and stats
 */
const activeTimers = new Map();
const statistics = new Map();

/**
 * Save performance stats to localStorage
 */
function saveStats() {
  try {
    const statsData = {};
    statistics.forEach((value, key) => {
      statsData[key] = value.toJSON();
    });
    localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(statsData));
  } catch (error) {
    ImageContextDebug.logError('Failed to save performance stats', error);
  }
}

/**
 * Load performance stats from localStorage
 */
function loadStats() {
  try {
    const statsData = localStorage.getItem(STORAGE_KEY_STATS);
    if (statsData) {
      const parsedData = JSON.parse(statsData);
      Object.entries(parsedData).forEach(([key, value]) => {
        statistics.set(key, OperationStats.fromJSON(value));
      });
      ImageContextDebug.logInfo('Loaded performance statistics from storage', Array.from(statistics.keys()));
    }
  } catch (error) {
    ImageContextDebug.logError('Failed to load performance stats', error);
  }
}

/**
 * Start timing an operation
 * @param {string} operationName - Name of operation to time
 * @returns {string} Timer ID to use with endTiming()
 */
function startTiming(operationName) {
  const timerId = `${operationName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  activeTimers.set(timerId, {
    name: operationName,
    startTime: performance.now()
  });
  return timerId;
}

/**
 * End timing an operation
 * @param {string} timerId - Timer ID from startTiming()
 * @param {boolean} logResult - Whether to log result to console
 * @returns {number|null} Time taken in ms, or null if timer not found
 */
function endTiming(timerId, logResult = true) {
  const timer = activeTimers.get(timerId);
  if (!timer) {
    ImageContextDebug.logWarning(`Timer ${timerId} not found`);
    return null;
  }

  activeTimers.delete(timerId);
  const endTime = performance.now();
  const timeElapsed = endTime - timer.startTime;

  // Update stats
  if (!statistics.has(timer.name)) {
    statistics.set(timer.name, new OperationStats(timer.name));
  }

  const opStats = statistics.get(timer.name);
  opStats.addSample(timeElapsed);

  // Log if requested
  if (logResult) {
    ImageContextDebug.logInfo(
      `Operation "${timer.name}" took ${timeElapsed.toFixed(2)}ms ` +
      `(avg: ${opStats.avgTime.toFixed(2)}ms, count: ${opStats.count})`
    );
  }

  // Save stats every 10 operations
  if (opStats.count % 10 === 0) {
    saveStats();
  }

  return timeElapsed;
}

/**
 * Get statistics for a specific operation
 * @param {string} operationName - Name of operation
 * @returns {Object|null} Stats for operation or null if not found
 */
function getStats(operationName) {
  const opStats = statistics.get(operationName);
  return opStats ? opStats.toJSON() : null;
}

/**
 * Get all performance statistics
 * @returns {Object} All performance statistics
 */
function getAllStats() {
  const allStats = {};
  statistics.forEach((value, key) => {
    allStats[key] = value.toJSON();
  });
  return allStats;
}

/**
 * Clear all timing statistics
 */
function clearStats() {
  statistics.clear();
  saveStats();
  ImageContextDebug.logInfo('Performance statistics cleared');
  return true;
}

/**
 * Display performance visualization in console
 */
function visualizePerformance() {
  console.group('%c[ImageContext] Performance Statistics', 'color: #4CAF50; font-weight: bold');

  if (statistics.size === 0) {
    console.log('No performance data available');
    console.groupEnd();
    return;
  }

  // Display table of stats
  console.table(Array.from(statistics.values()).map(s => s.toJSON()));

  // Create bar graph for average times
  console.log('%cAverage Processing Times (ms):', 'font-weight: bold');

  statistics.forEach((stat) => {
    const percentage = Math.min(100, (stat.avgTime / stat.timeBudget) * 100);
    const barColor = percentage > 90 ? 'crimson' : percentage > 75 ? 'orange' : 'limegreen';
    const bar = '█'.repeat(Math.ceil(percentage / 5));
    console.log(
      `%c${stat.name.padEnd(20)} %c${stat.avgTime.toFixed(2).padStart(6)}ms %c${bar}`,
      'color: #007bff',
      'color: #333',
      `color: ${barColor}`
    );
  });

  console.groupEnd();
}

// Initialize by loading saved stats
loadStats();

// Set up auto-visualization
if (typeof window !== 'undefined' && ImageContextDebug.isEnabled()) {
  // Make debug functions available in global scope when in debug mode
  window.EngageIQ = window.EngageIQ || {};
  window.EngageIQ.debug = window.EngageIQ.debug || {};
  window.EngageIQ.debug.visualizePerformance = visualizePerformance;
  window.EngageIQ.debug.clearPerformanceStats = clearStats;
}

// Export as a module
export const PerformanceTracker = {
  startTiming,
  endTiming,
  getStats,
  getAllStats,
  clearStats,
  visualizePerformance
};

// Export for direct import
export {
  startTiming,
  endTiming,
  getStats,
  getAllStats,
  clearStats,
  visualizePerformance
};