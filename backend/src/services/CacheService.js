/**
 * 内存缓存服务 - 接口性能优化
 *
 * 功能：
 * 1. 简单内存缓存（LRU近似）
 * 2. 缓存键过期，自动清理
 * 3. 命中率统计
 *
 * 适用场景：
 * - 热点数据缓存（计划列表、用户信息）
 * - 减少重复数据库查询
 * - 智能体结果缓存
 */

class CacheService {
  constructor(options = {}) {
    // 默认配置
    this.maxSize = options.maxSize || 500;        // 最大缓存条目数
    this.defaultTTL = options.defaultTTL || 60000; // 默认TTL 60秒
    this.cleanupInterval = options.cleanupInterval || 30000; // 清理间隔30秒

    // 缓存存储: Map<key, { value, expiresAt, hitCount }>
    this.cache = new Map();

    // 统计
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0
    };

    // 启动定期清理
    this.startCleanup();
  }

  /**
   * 设置缓存
   * @param {string} key 缓存键
   * @param {any} value 缓存值
   * @param {number} ttl 可选，过期时间(毫秒)
   */
  set(key, value, ttl = this.defaultTTL) {
    // 检查容量，LRU淘汰
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictOne();
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
      hitCount: 0,
      createdAt: Date.now()
    });

    this.stats.sets++;
  }

  /**
   * 获取缓存
   * @param {string} key 缓存键
   * @returns {any|null} 缓存值，不存在或过期返回null
   */
  get(key) {
    const item = this.cache.get(key);

    if (!item) {
      this.stats.misses++;
      return null;
    }

    // 检查过期
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // 增加命中计数
    item.hitCount++;
    this.stats.hits++;

    return item.value;
  }

  /**
   * 删除缓存
   * @param {string} key 缓存键
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * 清空缓存
   */
  clear() {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, sets: 0, evictions: 0 };
  }

  /**
   * 删除用户相关的所有缓存（用于数据变更时）
   * @param {string} prefix 缓存键前缀
   */
  deleteByPrefix(prefix) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * LRU淘汰一个最久未使用的条目
   */
  evictOne() {
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (item.hitCount === 0 && item.createdAt < oldestTime) {
        oldestTime = item.createdAt;
        oldestKey = key;
      }
    }

    // 如果所有条目都被访问过，删除最早创建的
    if (!oldestKey) {
      for (const [key, item] of this.cache.entries()) {
        if (item.createdAt < oldestTime) {
          oldestTime = item.createdAt;
          oldestKey = key;
        }
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * 定期清理过期缓存
   */
  startCleanup() {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      let cleaned = 0;

      for (const [key, item] of this.cache.entries()) {
        if (now > item.expiresAt) {
          this.cache.delete(key);
          cleaned++;
        }
      }

      // 容量过大时清理一半
      if (this.cache.size > this.maxSize * 1.5) {
        const entries = Array.from(this.cache.entries())
          .sort((a, b) => a[1].hitCount - b[1].hitCount)
          .slice(0, this.cache.size / 2);

        for (const [key] of entries) {
          this.cache.delete(key);
        }
      }
    }, this.cleanupInterval);
  }

  /**
   * 停止清理
   */
  stopCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total * 100).toFixed(1) : 0;

    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: `${hitRate}%`
    };
  }
}

// 创建全局缓存实例
const cache = new CacheService({
  maxSize: 500,
  defaultTTL: 60000, // 1分钟
  cleanupInterval: 30000
});

module.exports = { CacheService, cache };