"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleRefresh = scheduleRefresh;
exports.cancelRefresh = cancelRefresh;
exports.getPendingRefreshTasks = getPendingRefreshTasks;
exports.needsRefresh = needsRefresh;
exports.forceRefresh = forceRefresh;
exports.clearAllRefreshTasks = clearAllRefreshTasks;
const cache_events_1 = require("../events/cache-events");
const cacheCore = __importStar(require("../implementations/cache-manager-core"));
// Store for background refresh tasks
const refreshTasks = new Map();
/**
 * Schedule a background refresh task
 */
function scheduleRefresh(key, fn, options) {
    if (!options.backgroundRefresh) {
        return;
    }
    const ttl = options.ttl || 3600; // Default 1 hour
    const threshold = options.refreshThreshold || 0.75;
    const nextRefresh = Date.now() + (ttl * threshold * 1000);
    refreshTasks.set(key, {
        key,
        fn,
        options,
        nextRefresh
    });
}
/**
 * Execute background refresh for a task
 */
function executeRefresh(task) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.REFRESH_START, { key: task.key });
            const value = yield task.fn();
            yield cacheCore.setCacheValue(task.key, value, task.options);
            (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.REFRESH_SUCCESS, { key: task.key });
            // Schedule next refresh
            scheduleRefresh(task.key, task.fn, task.options);
        }
        catch (error) {
            (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.REFRESH_ERROR, {
                key: task.key,
                error: error
            });
        }
    });
}
/**
 * Process all pending refresh tasks
 */
function processRefreshTasks() {
    return __awaiter(this, void 0, void 0, function* () {
        const now = Date.now();
        for (const [key, task] of refreshTasks.entries()) {
            if (task.nextRefresh <= now) {
                refreshTasks.delete(key);
                executeRefresh(task).catch(() => {
                    // Error is already handled in executeRefresh
                });
            }
        }
    });
}
// Start the background refresh processor
const REFRESH_INTERVAL = 1000; // Check every second
setInterval(processRefreshTasks, REFRESH_INTERVAL);
/**
 * Cancel a scheduled refresh task
 */
function cancelRefresh(key) {
    refreshTasks.delete(key);
}
/**
 * Get all pending refresh tasks
 */
function getPendingRefreshTasks() {
    return Array.from(refreshTasks.values());
}
/**
 * Check if a value needs refresh
 */
function needsRefresh(key) {
    const task = refreshTasks.get(key);
    if (!task) {
        return false;
    }
    return Date.now() >= task.nextRefresh;
}
/**
 * Force immediate refresh of a cached value
 */
function forceRefresh(key) {
    return __awaiter(this, void 0, void 0, function* () {
        const task = refreshTasks.get(key);
        if (task) {
            yield executeRefresh(task);
        }
    });
}
/**
 * Clear all scheduled refresh tasks
 */
function clearAllRefreshTasks() {
    refreshTasks.clear();
}
