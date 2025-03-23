"use strict";
/**
 * In-memory storage implementation
 */
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
exports.getValue = getValue;
exports.setValue = setValue;
exports.hasKey = hasKey;
exports.deleteKey = deleteKey;
exports.clearStore = clearStore;
exports.getKeys = getKeys;
exports.getMany = getMany;
exports.setMany = setMany;
const store = new Map();
/**
 * Get a value from memory storage
 */
function getValue(key) {
    return __awaiter(this, void 0, void 0, function* () {
        const item = store.get(key);
        if (!item) {
            return null;
        }
        if (item.expiry && item.expiry < Date.now()) {
            store.delete(key);
            return null;
        }
        return item.value;
    });
}
/**
 * Set a value in memory storage
 */
function setValue(key, value, ttl) {
    return __awaiter(this, void 0, void 0, function* () {
        const expiry = ttl ? Date.now() + (ttl * 1000) : null;
        store.set(key, { value, expiry });
    });
}
/**
 * Check if key exists in memory storage
 */
function hasKey(key) {
    return __awaiter(this, void 0, void 0, function* () {
        const value = yield getValue(key);
        return value !== null;
    });
}
/**
 * Delete a key from memory storage
 */
function deleteKey(key) {
    return __awaiter(this, void 0, void 0, function* () {
        return store.delete(key);
    });
}
/**
 * Clear all data from memory storage
 */
function clearStore() {
    return __awaiter(this, void 0, void 0, function* () {
        store.clear();
    });
}
/**
 * Get all keys matching a pattern
 */
function getKeys(pattern) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!pattern) {
            return Array.from(store.keys());
        }
        try {
            const regex = new RegExp(pattern);
            return Array.from(store.keys()).filter(key => regex.test(key));
        }
        catch (_a) {
            return Array.from(store.keys()).filter(key => key.includes(pattern));
        }
    });
}
/**
 * Get multiple values at once
 */
function getMany(keys) {
    return __awaiter(this, void 0, void 0, function* () {
        const result = {};
        for (const key of keys) {
            result[key] = yield getValue(key);
        }
        return result;
    });
}
/**
 * Set multiple values at once
 */
function setMany(entries, ttl) {
    return __awaiter(this, void 0, void 0, function* () {
        for (const [key, value] of Object.entries(entries)) {
            yield setValue(key, value, ttl);
        }
    });
}
