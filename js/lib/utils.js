/**
 * CryptoBox - Utility Tools
 * 实用工具集：JWT 解析/创建/验证、时间戳转换
 */

const UtilsTools = {
    // --- JWT 解析/创建/验证 ---
    jwt: {
        id: 'jwt',
        name: 'JWT 解析',
        category: 'utils',
        description: '解析/创建/验证 JWT Token，支持 HMAC 和 RSA 签名验证',
        autoDetectable: false,
        options: [
            {
                id: 'secret', label: '密钥 (验证签名 / 创建JWT)', type: 'text',
                placeholder: 'HMAC 密钥或 RSA/SM2 公钥 (可选)',
                default: ''
            },
            {
                id: 'secretFormat', label: '密钥格式', type: 'select',
                values: [
                    { value: 'utf8', label: 'UTF-8 文本' },
                    { value: 'hex', label: 'Hex' },
                    { value: 'base64', label: 'Base64' },
                    { value: 'pem', label: 'PEM (RSA公钥)' },
                ],
                default: 'utf8'
            },
            {
                id: 'algorithm', label: '签名算法 (创建JWT时)', type: 'select',
                values: [
                    { value: 'HS256', label: 'HS256 (HMAC-SHA256)' },
                    { value: 'HS384', label: 'HS384 (HMAC-SHA384)' },
                    { value: 'HS512', label: 'HS512 (HMAC-SHA512)' },
                ],
                default: 'HS256'
            },
        ],

        // === Base64URL 编解码 ===
        _base64UrlDecode(str) {
            let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
            while (b64.length % 4 !== 0) b64 += '=';
            try {
                const binary = atob(b64);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
            } catch { return null; }
        },
        _base64UrlEncode(str) {
            const bytes = new TextEncoder().encode(str);
            let binary = '';
            for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
            return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        },

        // === 时间/算法工具 ===
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
        _formatDuration(seconds) {
            if (seconds < 60) return `${seconds}秒`;
            if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟`;
            if (seconds < 86400) return `${Math.floor(seconds / 3600)}小时${Math.floor((seconds % 3600) / 60)}分钟`;
            return `${Math.floor(seconds / 86400)}天${Math.floor((seconds % 86400) / 3600)}小时`;
        },
        _getAlgorithmName(alg) {
            const map = {
                'HS256': 'HMAC-SHA256 (对称)', 'HS384': 'HMAC-SHA384 (对称)', 'HS512': 'HMAC-SHA512 (对称)',
                'RS256': 'RSA-SHA256 (非对称)', 'RS384': 'RSA-SHA384 (非对称)', 'RS512': 'RSA-SHA512 (非对称)',
                'ES256': 'ECDSA-P256-SHA256 (非对称)', 'ES384': 'ECDSA-P384-SHA384 (非对称)', 'ES512': 'ECDSA-P521-SHA512 (非对称)',
                'PS256': 'RSA-PSS-SHA256 (非对称)', 'PS384': 'RSA-PSS-SHA384 (非对称)', 'PS512': 'RSA-PSS-SHA512 (非对称)',
                'EdDSA': 'EdDSA (非对称)',
                'none': '无签名 (不安全!)',
            };
            return map[alg] || alg;
        },
        _getAlgorithmType(alg) {
            if (!alg) return 'unknown';
            if (alg === 'none') return 'none';
            if (alg.startsWith('HS')) return 'hmac';
            if (alg.startsWith('RS') || alg.startsWith('PS')) return 'rsa';
            if (alg.startsWith('ES') || alg === 'EdDSA') return 'ecdsa';
            return 'unknown';
        },
        _getHeaderFieldDesc(field) {
            const map = {
                'alg': '签名算法',
                'typ': 'Token 类型',
                'kid': '密钥 ID (用于查找验证密钥)',
                'jku': 'JWK Set URL (公钥集合地址)',
                'jwk': '嵌入的 JWK 公钥',
                'x5u': 'X.509 证书链 URL',
                'x5c': 'X.509 证书链 (Base64)',
                'x5t': 'X.509 证书 SHA-1 指纹',
                'x5t#S256': 'X.509 证书 SHA-256 指纹',
                'cty': '内容类型',
                'crit': '关键头部字段列表',
                'enc': '加密算法 (JWE)',
                'zip': '压缩算法 (JWE)',
                'epk': '临时公钥 (JWE ECDH)',
                'apu': '发起方密钥信息 (JWE)',
                'apv': '接收方密钥信息 (JWE)',
            };
            return map[field] || null;
        },
        _getClaimDesc(claim) {
            const map = {
                'iss': '签发者 (Issuer) - 谁签发了这个 Token',
                'sub': '主题 (Subject) - Token 关于谁',
                'aud': '受众 (Audience) - Token 发给谁',
                'exp': '过期时间 (Expiration) - Token 何时失效',
                'nbf': '生效时间 (Not Before) - Token 何时开始有效',
                'iat': '签发时间 (Issued At) - Token 何时签发',
                'jti': 'JWT ID - Token 唯一标识符',
                'name': '用户姓名',
                'email': '用户邮箱',
                'roles': '角色列表',
                'permissions': '权限列表',
                'scope': 'OAuth2 作用域',
                'scp': 'OAuth2 作用域 (缩写)',
                'groups': '用户组',
                'admin': '管理员标志',
                'iat_ago': '签发于多久之前',
            };
            return map[claim] || null;
        },

        // === 签名验证 ===
        _parseSecret(secret, format) {
            if (!secret) return null;
            switch (format) {
                case 'hex':
                    const hex = secret.replace(/\s/g, '');
                    const bytes = new Uint8Array(hex.length / 2);
                    for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
                    return bytes;
                case 'base64':
                    const binary = atob(secret.replace(/\s/g, ''));
                    const b = new Uint8Array(binary.length);
                    for (let i = 0; i < binary.length; i++) b[i] = binary.charCodeAt(i);
                    return b;
                case 'pem':
                case 'utf8':
                default:
                    return new TextEncoder().encode(secret);
            }
        },
        _verifyHMAC(headerB64, payloadB64, signatureB64, secretStr, secretFormat, algorithm) {
            if (typeof CryptoJS === 'undefined') return { error: 'CryptoJS 库未加载' };
            const message = headerB64 + '.' + payloadB64;
            let key;
            if (secretFormat === 'hex') {
                key = CryptoJS.enc.Hex.parse(secretStr.replace(/\s/g, ''));
            } else if (secretFormat === 'base64') {
                key = CryptoJS.enc.Base64.parse(secretStr.replace(/\s/g, ''));
            } else {
                key = CryptoJS.enc.Utf8.parse(secretStr);
            }
            let hash;
            switch (algorithm) {
                case 'HS256': hash = CryptoJS.HmacSHA256(message, key); break;
                case 'HS384': hash = CryptoJS.HmacSHA384(message, key); break;
                case 'HS512': hash = CryptoJS.HmacSHA512(message, key); break;
                default: return { error: `不支持的 HMAC 算法: ${algorithm}` };
            }
            const expectedB64 = hash.toString(CryptoJS.enc.Base64)
                .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
            return { valid: expectedB64 === signatureB64, expected: expectedB64 };
        },
        _verifyRSA(headerB64, payloadB64, signatureB64, publicKeyPem, algorithm) {
            if (typeof JSEncrypt === 'undefined') return { error: 'JSEncrypt 库未加载' };
            const message = headerB64 + '.' + payloadB64;
            // Compute the hash of the message
            let hashAlg;
            switch (algorithm) {
                case 'RS256': hashAlg = 'SHA256'; break;
                case 'RS384': hashAlg = 'SHA384'; break;
                case 'RS512': hashAlg = 'SHA512'; break;
                default: return { error: `不支持的 RSA 算法: ${algorithm}` };
            }
            // Use KJUR/jsrsasign style verification via JSEncrypt
            // JSEncrypt's verify method expects: verify(message, signature, algorithm)
            // But JSEncrypt v3 verify signature expects base64, not base64url
            let sigB64 = signatureB64.replace(/-/g, '+').replace(/_/g, '/');
            while (sigB64.length % 4 !== 0) sigB64 += '=';
            try {
                const jsEncrypt = new JSEncrypt();
                jsEncrypt.setPublicKey(publicKeyPem);
                const hashHex = CryptoJS.SHA256(message).toString(CryptoJS.enc.Hex);
                // JSEncrypt verify expects hex hash and base64 signature
                const valid = jsEncrypt.verify(message, sigB64, hashAlg === 'SHA256' ? CryptoJS.SHA256 : null);
                if (valid === true) return { valid: true };
                if (valid === false) return { valid: false };
                // JSEncrypt verify may not be available in all builds
                return { error: '当前 JSEncrypt 版本不支持签名验证，请使用 HMAC 算法测试' };
            } catch (e) {
                return { error: `RSA 验证失败: ${e.message}` };
            }
        },

        // === 安全警告 ===
        _getSecurityWarnings(header, payload, parts) {
            const warnings = [];
            const alg = header.alg;
            if (!alg) {
                warnings.push({ level: 'CRITICAL', msg: '缺少 alg 字段，无法确定签名算法' });
            } else if (alg === 'none') {
                warnings.push({ level: 'CRITICAL', msg: 'alg=none：Token 无签名保护！任何人可伪造。常见于 CVE-2015-2951 攻击。' });
            } else if (alg.startsWith('HS') && !parts[2]) {
                warnings.push({ level: 'CRITICAL', msg: 'HMAC 算法但签名为空，等同于 alg=none 攻击' });
            }

            const now = Math.floor(Date.now() / 1000);
            if (!payload.exp) {
                warnings.push({ level: 'WARN', msg: '缺少 exp (过期时间)，Token 将永不过期' });
            } else if (payload.exp < now) {
                warnings.push({ level: 'INFO', msg: `Token 已过期 (${this._formatDuration(now - payload.exp)}前)` });
            } else if (payload.exp - now > 30 * 86400) {
                warnings.push({ level: 'WARN', msg: `过期时间超过 30 天 (${this._formatDuration(payload.exp - now)})，建议缩短有效期` });
            }

            if (!payload.iat) {
                warnings.push({ level: 'INFO', msg: '缺少 iat (签发时间)，建议添加以支持 Token 轮换' });
            }

            if (header.jku || header.x5u) {
                warnings.push({ level: 'WARN', msg: `Header 包含远程 URL (${header.jku ? 'jku' : 'x5u'})，服务器可能被利用获取攻击者密钥 (CVE-2018-0114)` });
            }

            if (header.jwk) {
                warnings.push({ level: 'CRITICAL', msg: 'Header 嵌入了 JWK 公钥，攻击者可能注入自己的密钥 (CVE-2018-0114)' });
            }

            if (header.kid && /[\.\/]/.test(header.kid)) {
                warnings.push({ level: 'WARN', msg: `kid 包含路径分隔符 (. 或 /)，可能存在路径遍历攻击风险` });
            }

            return warnings;
        },

        // === JWT 解析 (encode) ===
        encode(input, opts = {}) {
            const token = input.trim();
            if (!token) return { error: '请输入 JWT Token' };

            const parts = token.split('.');
            if (parts.length < 2 || parts.length > 3) {
                return { error: '无效的 JWT 格式：JWT 应由 2 或 3 段组成（以 . 分隔）' };
            }

            try {
                const headerStr = this._base64UrlDecode(parts[0]);
                if (!headerStr) return { error: 'JWT Header 解码失败：无效的 Base64URL 编码' };
                let header;
                try { header = JSON.parse(headerStr); }
                catch { return { error: 'JWT Header 解码失败：不是有效的 JSON' }; }

                const payloadStr = this._base64UrlDecode(parts[1]);
                if (!payloadStr) return { error: 'JWT Payload 解码失败：无效的 Base64URL 编码' };
                let payload;
                try { payload = JSON.parse(payloadStr); }
                catch { return { error: 'JWT Payload 解码失败：不是有效的 JSON' }; }

                const alg = header.alg || 'unknown';
                const now = Math.floor(Date.now() / 1000);
                const infoParts = [];
                const messages = [];

                // Header
                const output = [JSON.stringify(header, null, 2), ''];

                // Payload - 替换时间戳为可读格式
                const payloadDisplay = {};
                for (const [key, value] of Object.entries(payload)) {
                    if (['iat', 'nbf', 'exp'].includes(key) && typeof value === 'number') {
                        payloadDisplay[key] = `${value}  (${this._formatTimestamp(value)})`;
                    } else {
                        payloadDisplay[key] = value;
                    }
                }
                output.push(JSON.stringify(payloadDisplay, null, 2));

                // 一行摘要
                infoParts.push(this._getAlgorithmName(alg));

                if (payload.iat) infoParts.push(`签发 ${this._formatTimestamp(payload.iat)}`);

                if (payload.exp) {
                    const remaining = payload.exp - now;
                    if (remaining < 0) {
                        infoParts.push(`已过期 ${this._formatDuration(-remaining)}`);
                        messages.push('Token 已过期');
                    } else {
                        infoParts.push(`剩余 ${this._formatDuration(remaining)}`);
                    }
                }

                if (parts[2]) {
                    infoParts.push('有签名');
                }

                output.push('');
                output.push(infoParts.join(' | '));

                // 签名验证
                if (opts.secret && alg !== 'none') {
                    const secretFormat = opts.secretFormat || 'utf8';
                    const algType = this._getAlgorithmType(alg);
                    let verifyResult;
                    if (algType === 'hmac') {
                        verifyResult = this._verifyHMAC(parts[0], parts[1], parts[2] || '', opts.secret, secretFormat, alg);
                    } else if (algType === 'rsa') {
                        if (secretFormat === 'pem' || opts.secret.includes('-----BEGIN')) {
                            verifyResult = this._verifyRSA(parts[0], parts[1], parts[2] || '', opts.secret, alg);
                        } else {
                            verifyResult = { error: 'RSA 需要 PEM 格式公钥' };
                        }
                    } else {
                        verifyResult = { error: `不支持 ${alg} 验证` };
                    }
                    if (verifyResult.error) {
                        output.push(verifyResult.error);
                    } else if (verifyResult.valid) {
                        output.push('Signature Verified');
                        messages.push('签名验证通过');
                    } else {
                        output.push('Invalid Signature');
                        messages.push('签名验证失败');
                    }
                }

                // 安全警告
                const warnings = this._getSecurityWarnings(header, payload, parts);
                for (const w of warnings) {
                    const icon = w.level === 'CRITICAL' ? '[!!]' : w.level === 'WARN' ? '[!]' : '[i]';
                    output.push(`${icon} ${w.msg}`);
                }

                return {
                    output: output.join('\n'),
                    info: messages.length > 0 ? messages.join('; ') : null
                };
            } catch (e) {
                return { error: `JWT 解析失败: ${e.message}` };
            }
        },

        // === JWT 创建 (decode) ===
        decode(input, opts = {}) {
            const algorithm = opts.algorithm || 'HS256';
            const secret = opts.secret;
            if (!secret) return { error: '创建 JWT 需要输入密钥（在选项中填写）' };

            try {
                let payload;
                try { payload = JSON.parse(input.trim()); }
                catch { return { error: '输入不是有效的 JSON，请输入 JSON 格式的 Payload\n示例: {"sub": "1234", "name": "Test", "iat": 1700000000}' }; }

                const header = { alg: algorithm, typ: 'JWT' };
                const headerB64 = this._base64UrlEncode(JSON.stringify(header));
                const payloadB64 = this._base64UrlEncode(JSON.stringify(payload));
                const message = headerB64 + '.' + payloadB64;

                let signature = '';
                const algType = this._getAlgorithmType(algorithm);
                if (algType === 'hmac' && typeof CryptoJS !== 'undefined') {
                    let key;
                    const secretFormat = opts.secretFormat || 'utf8';
                    if (secretFormat === 'hex') {
                        key = CryptoJS.enc.Hex.parse(secret.replace(/\s/g, ''));
                    } else if (secretFormat === 'base64') {
                        key = CryptoJS.enc.Base64.parse(secret.replace(/\s/g, ''));
                    } else {
                        key = CryptoJS.enc.Utf8.parse(secret);
                    }
                    let hash;
                    switch (algorithm) {
                        case 'HS256': hash = CryptoJS.HmacSHA256(message, key); break;
                        case 'HS384': hash = CryptoJS.HmacSHA384(message, key); break;
                        case 'HS512': hash = CryptoJS.HmacSHA512(message, key); break;
                    }
                    signature = hash.toString(CryptoJS.enc.Base64)
                        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
                }

                const jwt = message + '.' + signature;
                return { output: jwt, info: `${algorithm} 签名` };
            } catch (e) {
                return { error: `JWT 创建失败: ${e.message}` };
            }
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
                case 'iso': return date.toISOString();
                case 'utc': return date.toUTCString();
                case 'date': return `${y}-${m}-${d}`;
                case 'full': return `${y}-${m}-${d} ${h}:${min}:${s}.${ms} 星期${weekDays[date.getDay()]}`;
                case 'local': default: return `${y}-${m}-${d} ${h}:${min}:${s}`;
            }
        },
        encode(input, opts = {}) {
            const unit = opts.unit || 'auto';
            const format = opts.format || 'local';
            const trimmed = input.trim();
            if (!trimmed) {
                const now = new Date();
                const tsSec = Math.floor(now.getTime() / 1000);
                const tsMs = now.getTime();
                const formatted = this._formatDate(now, format);
                return {
                    output: ['当前时间:', formatted, '', `秒级时间戳: ${tsSec}`, `毫秒级时间戳: ${tsMs}`].join('\n')
                };
            }
            const values = trimmed.split(/[\s,;]+/).filter(v => v);
            const results = [];
            for (const v of values) {
                const num = Number(v);
                if (isNaN(num)) { results.push(`${v}: 不是有效的时间戳数字`); continue; }
                const date = this._parseTimestamp(num, unit);
                const formatted = this._formatDate(date, format);
                if (!formatted) { results.push(`${v}: 无效的时间戳`); continue; }
                results.push(`${v} → ${formatted}`);
            }
            return { output: results.join('\n') };
        },
        decode(input, opts = {}) {
            const trimmed = input.trim();
            if (!trimmed) {
                const now = new Date();
                return {
                    output: ['当前时间戳:', `秒: ${Math.floor(now.getTime() / 1000)}`, `毫秒: ${now.getTime()}`].join('\n')
                };
            }
            if (trimmed.toLowerCase() === 'now') {
                const now = new Date();
                return {
                    output: [`当前时间: ${this._formatDate(now, 'full')}`, `秒级时间戳: ${Math.floor(now.getTime() / 1000)}`, `毫秒级时间戳: ${now.getTime()}`].join('\n')
                };
            }
            const lines = trimmed.split('\n').filter(l => l.trim());
            const results = [];
            for (const line of lines) {
                const date = new Date(line.trim());
                if (isNaN(date.getTime())) { results.push(`${line.trim()}: 无法解析为日期`); continue; }
                const tsSec = Math.floor(date.getTime() / 1000);
                const tsMs = date.getTime();
                results.push(`${line.trim()} → 秒: ${tsSec} | 毫秒: ${tsMs}`);
            }
            return { output: results.join('\n') };
        }
    }
};

window.UtilsTools = UtilsTools;
