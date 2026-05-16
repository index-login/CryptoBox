/**
 * CryptoBox - History Manager
 * 操作历史记录：保存到 localStorage，支持恢复、清空
 */

const History = {
    STORAGE_KEY: 'cryptobox_history',
    MAX_ITEMS: 50,

    /**
     * 获取所有历史记录
     */
    getAll() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    },

    /**
     * 添加一条历史记录
     */
    add(record) {
        const items = this.getAll();
        const entry = {
            id: Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            timestamp: Date.now(),
            toolId: record.toolId,
            toolName: record.toolName,
            action: record.action,
            input: this._truncate(record.input, 100),
            output: this._truncate(record.output, 100),
            opts: record.opts || {},
            // 保存密钥/IV（脱敏显示但完整存储，方便恢复）
            key: record.opts.key || '',
            iv: record.opts.iv || '',
        };

        items.unshift(entry);

        // 限制最大条数
        if (items.length > this.MAX_ITEMS) {
            items.length = this.MAX_ITEMS;
        }

        this._save(items);
        return entry;
    },

    /**
     * 删除一条记录
     */
    remove(id) {
        const items = this.getAll().filter(item => item.id !== id);
        this._save(items);
    },

    /**
     * 清空所有记录
     */
    clear() {
        localStorage.removeItem(this.STORAGE_KEY);
    },

    /**
     * 保存到 localStorage
     */
    _save(items) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
        } catch (e) {
            // localStorage 满了，删除旧记录
            if (items.length > 10) {
                items.length = Math.floor(items.length / 2);
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
            }
        }
    },

    /**
     * 截断文本
     */
    _truncate(str, maxLen) {
        if (!str) return '';
        return str.length > maxLen ? str.substring(0, maxLen) + '...' : str;
    },

    /**
     * 格式化时间
     */
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return '刚刚';
        if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
        if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';

        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hour = date.getHours().toString().padStart(2, '0');
        const min = date.getMinutes().toString().padStart(2, '0');
        return `${month}-${day} ${hour}:${min}`;
    },

    /**
     * 脱敏显示密钥
     */
    maskKey(key) {
        if (!key) return '';
        if (key.length <= 4) return '****';
        return key.substring(0, 2) + '****' + key.substring(key.length - 2);
    }
};

// Export
window.History = History;
