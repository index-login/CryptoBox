/**
 * CryptoBox - Utility Tools
 * 实用工具集：JWT 解析、时间戳转换
 */

const UtilsTools = {
    // --- JWT 解析 ---
    jwt: {
        id: 'jwt',
        name: 'JWT 解析',
        category: 'utils',
        description: '解析 JWT Token，显示 Header/Payload/Signature 及过期状态',
        autoDetectable: false,
        options: [],
        _base64UrlDecode(str) {
            let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
            while (b64.length % 4 !== 0) b64 += '=';
            try {
                const binary = atob(b64);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) {
                    bytes[i] = binary.charCodeAt(i);
                }
                return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
            } catch (e) {
                return null;
            }
        },
        _formatTimestamp(ts) {
            const date = new Date(ts * 1000);
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            const h = String(date.getHours()).padStart(2, '0');
            const min = String(date.getMinutes()).padStart(2, '0');
            const s = String(date.getSeconds()).padStart(2, '0');
            return `${y}-${m}-${d} ${h}:${min}:${s}`;
        },
        _getAlgorithmName(alg) {
            const map = {
                'HS256': 'HMAC-SHA256', 'HS384': 'HMAC-SHA384', 'HS512': 'HMAC-SHA512',
                'RS256': 'RSA-SHA256', 'RS384': 'RSA-SHA384', 'RS512': 'RSA-SHA512',
                'ES256': 'ECDSA-SHA256', 'ES384': 'ECDSA-SHA384', 'ES512': 'ECDSA-SHA512',
                'PS256': 'RSA-PSS-SHA256', 'PS384': 'RSA-PSS-SHA384', 'PS512': 'RSA-PSS-SHA512',
                'none': '无签名',
            };
            return map[alg] || alg;
        },
        encode(input, opts = {}) {
            const token = input.trim();
            if (!token) return { error: '请输入 JWT Token' };

            const parts = token.split('.');
            if (parts.length < 2 || parts.length > 3) {
                return { error: '无效的 JWT 格式：JWT 应由 2 或 3 段组成（以 . 分隔）' };
            }

            try {
                const output = [];
                const messages = [];

                // === Header ===
                const headerStr = this._base64UrlDecode(parts[0]);
                if (!headerStr) return { error: 'JWT Header 解码失败：无效的 Base64URL 编码' };
                let header;
                try {
                    header = JSON.parse(headerStr);
                } catch {
                    return { error: 'JWT Header 解码失败：不是有效的 JSON' };
                }
                output.push('=== Header ===');
                output.push(JSON.stringify(header, null, 2));

                // === Payload ===
                output.push('');
                output.push('=== Payload ===');
                const payloadStr = this._base64UrlDecode(parts[1]);
                if (!payloadStr) return { error: 'JWT Payload 解码失败：无效的 Base64URL 编码' };
                let payload;
                try {
                    payload = JSON.parse(payloadStr);
                } catch {
                    return { error: 'JWT Payload 解码失败：不是有效的 JSON' };
                }
                output.push(JSON.stringify(payload, null, 2));

                // === Signature ===
                output.push('');
                output.push('=== Signature ===');
                if (parts[2]) {
                    try {
                        const sigBinary = atob(parts[2].replace(/-/g, '+').replace(/_/g, '/'));
                        const sigHex = Array.from(sigBinary).map(ch => ch.charCodeAt(0).toString(16).padStart(2, '0')).join('');
                        output.push(sigHex);
                    } catch {
                        output.push(parts[2]);
                    }
                } else {
                    output.push('(无签名)');
                }

                // === 信息摘要 ===
                output.push('');
                output.push('=== 信息 ===');

                const alg = header.alg || '未知';
                output.push(`算法: ${this._getAlgorithmName(alg)}`);

                if (header.typ) {
                    output.push(`类型: ${header.typ}`);
                }

                const now = Math.floor(Date.now() / 1000);

                if (payload.iat) {
                    output.push(`签发时间 (iat): ${this._formatTimestamp(payload.iat)} (${payload.iat})`);
                }

                if (payload.exp) {
                    const expDate = this._formatTimestamp(payload.exp);
                    const remaining = payload.exp - now;
                    if (remaining < 0) {
                        output.push(`过期时间 (exp): ${expDate} (${payload.exp}) [已过期 ${this._formatDuration(-remaining)}]`);
                        messages.push('Token 已过期');
                    } else {
                        output.push(`过期时间 (exp): ${expDate} (${payload.exp}) [剩余 ${this._formatDuration(remaining)}]`);
                    }
                } else {
                    output.push('过期时间 (exp): 未设置');
                }

                if (payload.nbf) {
                    output.push(`生效时间 (nbf): ${this._formatTimestamp(payload.nbf)} (${payload.nbf})`);
                }

                if (payload.sub) {
                    output.push(`主题 (sub): ${payload.sub}`);
                }

                if (payload.iss) {
                    output.push(`签发者 (iss): ${payload.iss}`);
                }

                if (payload.aud) {
                    const aud = Array.isArray(payload.aud) ? payload.aud.join(', ') : payload.aud;
                    output.push(`受众 (aud): ${aud}`);
                }

                if (payload.jti) {
                    output.push(`JWT ID (jti): ${payload.jti}`);
                }

                return {
                    output: output.join('\n'),
                    info: messages.length > 0 ? messages.join('; ') : null
                };
            } catch (e) {
                return { error: `JWT 解析失败: ${e.message}` };
            }
        },
        _formatDuration(seconds) {
            if (seconds < 60) return `${seconds}秒`;
            if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟`;
            if (seconds < 86400) return `${Math.floor(seconds / 3600)}小时${Math.floor((seconds % 3600) / 60)}分钟`;
            return `${Math.floor(seconds / 86400)}天${Math.floor((seconds % 86400) / 3600)}小时`;
        },
        decode() {
            return { error: 'JWT 解析不支持反向操作' };
        }
    },

    // --- 时间戳转换 ---
    timestamp: {
        id: 'timestamp',
        name: '时间戳转换',
        category: 'utils',
        description: 'Unix 时间戳与日期互转，支持秒/毫秒',
        autoDetectable: true,
        detectEncoded(input) {
            const s = input.trim();
            if (!s) return false;
            // 纯数字（可能带负号）→ 时间戳 → 已编码状态 → 应解码为日期
            return /^-?\d{9,13}$/.test(s);
        },
        options: [
            {
                id: 'unit', label: '时间戳单位', type: 'select',
                values: [
                    { value: 'auto', label: '自动检测' },
                    { value: 's', label: '秒 (10位)' },
                    { value: 'ms', label: '毫秒 (13位)' },
                ],
                default: 'auto'
            },
            {
                id: 'format', label: '输出格式', type: 'select',
                values: [
                    { value: 'local', label: '本地时间' },
                    { value: 'iso', label: 'ISO 8601' },
                    { value: 'utc', label: 'UTC' },
                    { value: 'date', label: '仅日期' },
                    { value: 'full', label: '全格式（含星期）' },
                ],
                default: 'local'
            },
        ],
        _parseTimestamp(value, unit) {
            let ms;
            if (unit === 's') {
                ms = value * 1000;
            } else if (unit === 'ms') {
                ms = value;
            } else {
                // auto: 13位=毫秒，10位=秒，其他按位数推断
                const str = String(Math.abs(value));
                if (str.length >= 12) {
                    ms = value;
                } else {
                    ms = value * 1000;
                }
            }
            return new Date(ms);
        },
        _formatDate(date, format) {
            if (isNaN(date.getTime())) return null;

            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            const h = String(date.getHours()).padStart(2, '0');
            const min = String(date.getMinutes()).padStart(2, '0');
            const s = String(date.getSeconds()).padStart(2, '0');
            const ms = String(date.getMilliseconds()).padStart(3, '0');

            const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

            switch (format) {
                case 'iso':
                    return date.toISOString();
                case 'utc':
                    return date.toUTCString();
                case 'date':
                    return `${y}-${m}-${d}`;
                case 'full':
                    return `${y}-${m}-${d} ${h}:${min}:${s}.${ms} 星期${weekDays[date.getDay()]}`;
                case 'local':
                default:
                    return `${y}-${m}-${d} ${h}:${min}:${s}`;
            }
        },
        encode(input, opts = {}) {
            // 时间戳 → 日期
            const unit = opts.unit || 'auto';
            const format = opts.format || 'local';

            const trimmed = input.trim();
            if (!trimmed) {
                // 空输入：显示当前时间
                const now = new Date();
                const tsSec = Math.floor(now.getTime() / 1000);
                const tsMs = now.getTime();
                const formatted = this._formatDate(now, format);
                return {
                    output: [
                        '当前时间:',
                        formatted,
                        '',
                        `秒级时间戳: ${tsSec}`,
                        `毫秒级时间戳: ${tsMs}`,
                    ].join('\n')
                };
            }

            // 支持多个时间戳（空格/逗号/换行分隔）
            const values = trimmed.split(/[\s,;]+/).filter(v => v);
            const results = [];

            for (const v of values) {
                const num = Number(v);
                if (isNaN(num)) {
                    results.push(`${v}: 不是有效的时间戳数字`);
                    continue;
                }
                const date = this._parseTimestamp(num, unit);
                const formatted = this._formatDate(date, format);
                if (!formatted) {
                    results.push(`${v}: 无效的时间戳`);
                    continue;
                }
                results.push(`${v} → ${formatted}`);
            }

            return { output: results.join('\n') };
        },
        decode(input, opts = {}) {
            // 日期 → 时间戳
            const trimmed = input.trim();
            if (!trimmed) {
                const now = new Date();
                return {
                    output: [
                        '当前时间戳:',
                        `秒: ${Math.floor(now.getTime() / 1000)}`,
                        `毫秒: ${now.getTime()}`,
                    ].join('\n')
                };
            }

            // 特殊值: now
            if (trimmed.toLowerCase() === 'now') {
                const now = new Date();
                return {
                    output: [
                        `当前时间: ${this._formatDate(now, 'full')}`,
                        `秒级时间戳: ${Math.floor(now.getTime() / 1000)}`,
                        `毫秒级时间戳: ${now.getTime()}`,
                    ].join('\n')
                };
            }

            // 支持多行日期
            const lines = trimmed.split('\n').filter(l => l.trim());
            const results = [];

            for (const line of lines) {
                const date = new Date(line.trim());
                if (isNaN(date.getTime())) {
                    results.push(`${line.trim()}: 无法解析为日期`);
                    continue;
                }
                const tsSec = Math.floor(date.getTime() / 1000);
                const tsMs = date.getTime();
                results.push(`${line.trim()} → 秒: ${tsSec} | 毫秒: ${tsMs}`);
            }

            return { output: results.join('\n') };
        }
    }
};

// Export
window.UtilsTools = UtilsTools;
