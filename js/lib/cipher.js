/**
 * CryptoBox - Symmetric Cipher Tools
 * 对称加密工具集：AES/DES/3DES/RC4/Rabbit
 *
 * 智能处理特性:
 * - 密钥/IV 支持 UTF-8/Hex/Base64 格式
 * - 密钥/IV 长度不足时自动补0，超出时自动截断（带提示）
 * - 密文自动预处理（去除换行、空白、URL编码等）
 * - 完整 Padding 支持：PKCS7/ZeroPadding/NoPadding/Iso10126/AnsiX923
 */

// ============================================================
// Cipher Helper - 处理密钥、IV、密文的格式与补位
// ============================================================

const CipherHelper = {
    /**
     * 解析密钥/IV，支持多种格式
     * @param {string} keyStr 输入字符串
     * @param {string} format 'utf8' | 'hex' | 'base64'
     * @param {number} requiredBytes 期望的字节数（不足补0，超出截断）
     * @returns {{wordArray: CryptoJS.lib.WordArray, info: string}}
     */
    parseKey(keyStr, format, requiredBytes) {
        let wordArray;
        try {
            switch (format) {
                case 'hex':
                    wordArray = CryptoJS.enc.Hex.parse(keyStr.replace(/\s/g, ''));
                    break;
                case 'base64':
                    wordArray = CryptoJS.enc.Base64.parse(keyStr.replace(/\s/g, ''));
                    break;
                case 'utf8':
                default:
                    wordArray = CryptoJS.enc.Utf8.parse(keyStr);
                    break;
            }
        } catch (e) {
            throw new Error(`密钥格式无效（${format}）: ${e.message}`);
        }

        const actualBytes = wordArray.sigBytes;
        let info = '';

        if (requiredBytes && actualBytes !== requiredBytes) {
            if (actualBytes < requiredBytes) {
                // 不足补0
                const bytes = this.wordArrayToBytes(wordArray);
                const padded = new Uint8Array(requiredBytes);
                padded.set(bytes);
                wordArray = this.bytesToWordArray(padded);
                info = `密钥不足 ${requiredBytes} 字节(实际 ${actualBytes})，已自动补0`;
            } else {
                // 超出截断
                wordArray = CryptoJS.lib.WordArray.create(
                    wordArray.words.slice(0, Math.ceil(requiredBytes / 4)),
                    requiredBytes
                );
                info = `密钥超出 ${requiredBytes} 字节(实际 ${actualBytes})，已自动截断`;
            }
        }

        return { wordArray, info, actualBytes };
    },

    /**
     * 预处理密文：去除换行、空白、URL 编码等干扰
     */
    cleanCiphertext(input) {
        let result = input;
        // URL 解码
        if (/%[0-9A-Fa-f]{2}/.test(result)) {
            try { result = decodeURIComponent(result); } catch {}
        }
        // 去除所有空白字符（密文不应包含空白）
        result = result.replace(/\s/g, '');
        return result;
    },

    /**
     * 解析密文为 WordArray
     */
    parseCiphertext(input, format) {
        const cleaned = this.cleanCiphertext(input);
        try {
            switch (format) {
                case 'hex':
                    return CryptoJS.enc.Hex.parse(cleaned);
                case 'base64':
                default:
                    return CryptoJS.enc.Base64.parse(cleaned);
            }
        } catch (e) {
            throw new Error(`密文格式无效（${format}）: ${e.message}`);
        }
    },

    /**
     * 输出加密结果
     */
    formatCiphertext(wordArray, format) {
        switch (format) {
            case 'hex':
                return wordArray.toString(CryptoJS.enc.Hex);
            case 'base64':
            default:
                return wordArray.toString(CryptoJS.enc.Base64);
        }
    },

    /**
     * 输出解密结果
     */
    formatPlaintext(wordArray, format) {
        switch (format) {
            case 'hex':
                return wordArray.toString(CryptoJS.enc.Hex);
            case 'base64':
                return wordArray.toString(CryptoJS.enc.Base64);
            case 'utf8':
            default:
                return wordArray.toString(CryptoJS.enc.Utf8);
        }
    },

    /**
     * 获取 CryptoJS Mode 对象
     */
    getMode(modeName) {
        const map = {
            'CBC': CryptoJS.mode.CBC,
            'ECB': CryptoJS.mode.ECB,
            'CTR': CryptoJS.mode.CTR,
            'CFB': CryptoJS.mode.CFB,
            'OFB': CryptoJS.mode.OFB,
        };
        return map[modeName] || CryptoJS.mode.CBC;
    },

    /**
     * 获取 CryptoJS Padding 对象
     */
    getPadding(paddingName) {
        const map = {
            'Pkcs7': CryptoJS.pad.Pkcs7,
            'ZeroPadding': CryptoJS.pad.ZeroPadding,
            'NoPadding': CryptoJS.pad.NoPadding,
            'Iso10126': CryptoJS.pad.Iso10126,
            'AnsiX923': CryptoJS.pad.AnsiX923,
            'Iso97971': CryptoJS.pad.Iso97971,
        };
        return map[paddingName] || CryptoJS.pad.Pkcs7;
    },

    wordArrayToBytes(wordArray) {
        const words = wordArray.words;
        const sigBytes = wordArray.sigBytes;
        const bytes = new Uint8Array(sigBytes);
        for (let i = 0; i < sigBytes; i++) {
            bytes[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
        }
        return bytes;
    },

    bytesToWordArray(bytes) {
        const words = [];
        for (let i = 0; i < bytes.length; i += 4) {
            words.push(
                ((bytes[i] || 0) << 24) |
                ((bytes[i + 1] || 0) << 16) |
                ((bytes[i + 2] || 0) << 8) |
                (bytes[i + 3] || 0)
            );
        }
        return CryptoJS.lib.WordArray.create(words, bytes.length);
    }
};

// ============================================================
// 通用块加密工具构造器
// ============================================================

function createBlockCipher(config) {
    const {
        id, name, description,
        algorithm,           // CryptoJS.AES / DES / TripleDES
        keySizes,            // [16, 24, 32] for AES
        defaultKeySize,      // 16 for AES-128
        blockSize = 16,      // IV 长度（字节）
        supportsModes = ['CBC', 'ECB', 'CTR', 'CFB', 'OFB'],
    } = config;

    return {
        id,
        name,
        category: 'cipher',
        description,
        autoDetectable: true,
        detectEncoded(input) {
            const s = input.trim();
            if (!s) return false;
            // Looks like Base64 ciphertext: valid base64 chars, length multiple of 4, length >= 16
            const b64Clean = s.replace(/\s/g, '');
            if (/^[A-Za-z0-9+/=\-_]+$/.test(b64Clean) && b64Clean.length >= 16 && b64Clean.length % 4 <= 1) {
                return true;
            }
            // Looks like Hex ciphertext: all hex chars, even length, length >= 16
            const hexClean = s.replace(/[\s:,;\-]/g, '');
            if (/^[0-9A-Fa-f]+$/.test(hexClean) && hexClean.length >= 16 && hexClean.length % 2 === 0) {
                return true;
            }
            return false;
        },
        options: [
            {
                id: 'mode', label: '加密模式', type: 'select',
                values: supportsModes.map(m => ({ value: m, label: m })),
                default: 'CBC'
            },
            {
                id: 'padding', label: 'Padding', type: 'select',
                values: [
                    { value: 'Pkcs7', label: 'PKCS7 (默认)' },
                    { value: 'ZeroPadding', label: 'Zero Padding' },
                    { value: 'NoPadding', label: 'No Padding' },
                    { value: 'Iso10126', label: 'ISO 10126' },
                    { value: 'AnsiX923', label: 'ANSI X9.23' },
                ],
                default: 'Pkcs7'
            },
            ...(keySizes.length > 1 ? [{
                id: 'keySize', label: '密钥长度', type: 'select',
                values: keySizes.map(s => ({ value: String(s), label: `${s * 8} bit (${s} 字节)` })),
                default: String(defaultKeySize)
            }] : []),
            {
                id: 'key', label: '密钥', type: 'text',
                placeholder: '输入密钥（不足自动补0）',
                default: ''
            },
            {
                id: 'keyFormat', label: '密钥格式', type: 'select',
                values: [
                    { value: 'utf8', label: 'UTF-8 文本' },
                    { value: 'hex', label: 'Hex' },
                    { value: 'base64', label: 'Base64' },
                ],
                default: 'utf8'
            },
            {
                id: 'iv', label: 'IV (初始向量)', type: 'text',
                placeholder: 'CBC/CTR/CFB/OFB 模式必需',
                default: ''
            },
            {
                id: 'ivFormat', label: 'IV 格式', type: 'select',
                values: [
                    { value: 'utf8', label: 'UTF-8 文本' },
                    { value: 'hex', label: 'Hex' },
                    { value: 'base64', label: 'Base64' },
                ],
                default: 'utf8'
            },
            {
                id: 'outputFormat', label: '密文输出格式', type: 'select',
                values: [
                    { value: 'base64', label: 'Base64' },
                    { value: 'hex', label: 'Hex' },
                ],
                default: 'base64'
            },
        ],

        encode(input, opts = {}) {
            try {
                const mode = opts.mode || 'CBC';
                const padding = opts.padding || 'Pkcs7';
                const keySize = parseInt(opts.keySize || defaultKeySize);
                const keyFormat = opts.keyFormat || 'utf8';
                const ivFormat = opts.ivFormat || 'utf8';
                const outputFormat = opts.outputFormat || 'base64';

                if (!opts.key) {
                    return { error: '请输入密钥' };
                }

                const messages = [];

                // Parse key
                const keyResult = CipherHelper.parseKey(opts.key, keyFormat, keySize);
                if (keyResult.info) messages.push(keyResult.info);

                // Parse IV (ECB 不需要)
                let iv = null;
                if (mode !== 'ECB') {
                    if (!opts.iv) {
                        return { error: `${mode} 模式需要 IV (初始向量)` };
                    }
                    const ivResult = CipherHelper.parseKey(opts.iv, ivFormat, blockSize);
                    if (ivResult.info) messages.push(ivResult.info.replace('密钥', 'IV'));
                    iv = ivResult.wordArray;
                }

                // Encrypt
                const cfg = {
                    mode: CipherHelper.getMode(mode),
                    padding: CipherHelper.getPadding(padding),
                };
                if (iv) cfg.iv = iv;

                const encrypted = algorithm.encrypt(input, keyResult.wordArray, cfg);
                const output = CipherHelper.formatCiphertext(encrypted.ciphertext, outputFormat);

                return {
                    output,
                    info: messages.length > 0 ? messages.join('; ') : null
                };
            } catch (e) {
                return { error: `加密失败: ${e.message}` };
            }
        },

        decode(input, opts = {}) {
            try {
                const mode = opts.mode || 'CBC';
                const padding = opts.padding || 'Pkcs7';
                const keySize = parseInt(opts.keySize || defaultKeySize);
                const keyFormat = opts.keyFormat || 'utf8';
                const ivFormat = opts.ivFormat || 'utf8';
                const inputFormat = opts.outputFormat || 'base64';

                if (!opts.key) {
                    return { error: '请输入密钥' };
                }
                if (!input.trim()) {
                    return { error: '请输入密文' };
                }

                const messages = [];

                // Parse key
                const keyResult = CipherHelper.parseKey(opts.key, keyFormat, keySize);
                if (keyResult.info) messages.push(keyResult.info);

                // Parse IV
                let iv = null;
                if (mode !== 'ECB') {
                    if (!opts.iv) {
                        return { error: `${mode} 模式需要 IV (初始向量)` };
                    }
                    const ivResult = CipherHelper.parseKey(opts.iv, ivFormat, blockSize);
                    if (ivResult.info) messages.push(ivResult.info.replace('密钥', 'IV'));
                    iv = ivResult.wordArray;
                }

                // Parse ciphertext (auto-clean: remove whitespace, URL decode)
                const ciphertext = CipherHelper.parseCiphertext(input, inputFormat);

                // Decrypt
                const cfg = {
                    mode: CipherHelper.getMode(mode),
                    padding: CipherHelper.getPadding(padding),
                };
                if (iv) cfg.iv = iv;

                const decrypted = algorithm.decrypt(
                    { ciphertext: ciphertext },
                    keyResult.wordArray,
                    cfg
                );

                // Try UTF-8 first, fallback to Hex
                let output;
                try {
                    output = decrypted.toString(CryptoJS.enc.Utf8);
                    if (!output && decrypted.sigBytes > 0) {
                        // Decryption returned empty UTF-8, fallback to Hex
                        output = '(无法以UTF-8显示) Hex: ' + decrypted.toString(CryptoJS.enc.Hex);
                    }
                } catch {
                    output = '(无法以UTF-8显示) Hex: ' + decrypted.toString(CryptoJS.enc.Hex);
                }

                if (!output) {
                    return { error: '解密失败：可能是密钥错误、IV错误或Padding不匹配' };
                }

                return {
                    output,
                    info: messages.length > 0 ? messages.join('; ') : null
                };
            } catch (e) {
                return {
                    error: `解密失败: ${e.message}。可能原因：密钥/IV错误、Padding不匹配、密文格式错误`
                };
            }
        }
    };
}

// ============================================================
// Stream Cipher 构造器（RC4, Rabbit）
// ============================================================

function createStreamCipher(config) {
    const { id, name, description, algorithm } = config;

    return {
        id, name, category: 'cipher', description,
        autoDetectable: true,
        detectEncoded(input) {
            const s = input.trim().replace(/\s/g, '');
            if (!s) return false;
            if (/^[A-Za-z0-9+/=\-_]+$/.test(s) && s.length >= 8 && s.length % 4 <= 1) return true;
            if (/^[0-9A-Fa-f]+$/.test(s) && s.length >= 8 && s.length % 2 === 0) return true;
            return false;
        },
        options: [
            {
                id: 'key', label: '密钥', type: 'text',
                placeholder: '输入密钥', default: ''
            },
            {
                id: 'keyFormat', label: '密钥格式', type: 'select',
                values: [
                    { value: 'utf8', label: 'UTF-8 文本' },
                    { value: 'hex', label: 'Hex' },
                    { value: 'base64', label: 'Base64' },
                ],
                default: 'utf8'
            },
            {
                id: 'outputFormat', label: '密文格式', type: 'select',
                values: [
                    { value: 'base64', label: 'Base64' },
                    { value: 'hex', label: 'Hex' },
                ],
                default: 'base64'
            },
        ],
        encode(input, opts = {}) {
            try {
                if (!opts.key) return { error: '请输入密钥' };
                const keyResult = CipherHelper.parseKey(opts.key, opts.keyFormat || 'utf8');
                const encrypted = algorithm.encrypt(input, keyResult.wordArray);
                return {
                    output: CipherHelper.formatCiphertext(encrypted.ciphertext, opts.outputFormat || 'base64')
                };
            } catch (e) {
                return { error: `加密失败: ${e.message}` };
            }
        },
        decode(input, opts = {}) {
            try {
                if (!opts.key) return { error: '请输入密钥' };
                if (!input.trim()) return { error: '请输入密文' };

                const keyResult = CipherHelper.parseKey(opts.key, opts.keyFormat || 'utf8');
                const ciphertext = CipherHelper.parseCiphertext(input, opts.outputFormat || 'base64');

                const decrypted = algorithm.decrypt(
                    { ciphertext: ciphertext },
                    keyResult.wordArray
                );
                let output;
                try {
                    output = decrypted.toString(CryptoJS.enc.Utf8);
                    if (!output && decrypted.sigBytes > 0) {
                        output = '(无法以UTF-8显示) Hex: ' + decrypted.toString(CryptoJS.enc.Hex);
                    }
                } catch {
                    output = '(无法以UTF-8显示) Hex: ' + decrypted.toString(CryptoJS.enc.Hex);
                }
                if (!output) return { error: '解密失败：可能是密钥错误' };
                return { output };
            } catch (e) {
                return { error: `解密失败: ${e.message}` };
            }
        }
    };
}

// ============================================================
// Cipher Tools
// ============================================================

const CipherTools = {
    aes: createBlockCipher({
        id: 'aes',
        name: 'AES 加解密',
        description: 'AES 高级加密标准 (128/192/256 位)',
        algorithm: typeof CryptoJS !== 'undefined' ? CryptoJS.AES : null,
        keySizes: [16, 24, 32],
        defaultKeySize: 16,
        blockSize: 16,
        supportsModes: ['CBC', 'ECB', 'CTR', 'CFB', 'OFB'],
    }),

    des: createBlockCipher({
        id: 'des',
        name: 'DES 加解密',
        description: 'DES 数据加密标准 (64位密钥，已不安全，仅供兼容)',
        algorithm: typeof CryptoJS !== 'undefined' ? CryptoJS.DES : null,
        keySizes: [8],
        defaultKeySize: 8,
        blockSize: 8,
        supportsModes: ['CBC', 'ECB', 'CTR', 'CFB', 'OFB'],
    }),

    tripleDes: createBlockCipher({
        id: 'tripleDes',
        name: '3DES (Triple DES) 加解密',
        description: '三重 DES 加密 (16/24 字节密钥)',
        algorithm: typeof CryptoJS !== 'undefined' ? CryptoJS.TripleDES : null,
        keySizes: [16, 24],
        defaultKeySize: 24,
        blockSize: 8,
        supportsModes: ['CBC', 'ECB', 'CTR', 'CFB', 'OFB'],
    }),

    rc4: createStreamCipher({
        id: 'rc4',
        name: 'RC4 加解密',
        description: 'RC4 流密码 (1-256 字节密钥)',
        algorithm: typeof CryptoJS !== 'undefined' ? CryptoJS.RC4 : null,
    }),

    rabbit: createStreamCipher({
        id: 'rabbit',
        name: 'Rabbit 加解密',
        description: 'Rabbit 流密码 (16 字节密钥)',
        algorithm: typeof CryptoJS !== 'undefined' ? CryptoJS.Rabbit : null,
    }),

    // --- SM4 国密对称加密 ---
    sm4: {
        id: 'sm4',
        name: 'SM4 加解密',
        category: 'cipher',
        description: '国密 SM4 对称加密 (128位密钥，128位分组)',
        autoDetectable: true,
        detectEncoded(input) {
            const s = input.trim().replace(/\s/g, '');
            if (!s) return false;
            if (/^[A-Za-z0-9+/=\-_]+$/.test(s) && s.length >= 16 && s.length % 4 <= 1) return true;
            if (/^[0-9A-Fa-f]+$/.test(s) && s.length >= 16 && s.length % 2 === 0) return true;
            return false;
        },
        options: [
            {
                id: 'mode', label: '加密模式', type: 'select',
                values: [
                    { value: 'ecb', label: 'ECB' },
                    { value: 'cbc', label: 'CBC' },
                ],
                default: 'ecb'
            },
            {
                id: 'padding', label: 'Padding', type: 'select',
                values: [
                    { value: 'pkcs#7', label: 'PKCS7 (默认)' },
                    { value: 'none', label: 'No Padding' },
                ],
                default: 'pkcs#7'
            },
            {
                id: 'key', label: '密钥 (16字节)', type: 'text',
                placeholder: '输入密钥（不足自动补0）', default: ''
            },
            {
                id: 'keyFormat', label: '密钥格式', type: 'select',
                values: [
                    { value: 'utf8', label: 'UTF-8 文本' },
                    { value: 'hex', label: 'Hex' },
                ],
                default: 'utf8'
            },
            {
                id: 'iv', label: 'IV (CBC模式)', type: 'text',
                placeholder: 'CBC 模式必需 (16字节)', default: ''
            },
            {
                id: 'ivFormat', label: 'IV 格式', type: 'select',
                values: [
                    { value: 'utf8', label: 'UTF-8 文本' },
                    { value: 'hex', label: 'Hex' },
                ],
                default: 'utf8'
            },
            {
                id: 'outputFormat', label: '密文格式', type: 'select',
                values: [
                    { value: 'hex', label: 'Hex' },
                    { value: 'base64', label: 'Base64' },
                ],
                default: 'hex'
            },
        ],
        _parseToHex(str, format, requiredLen) {
            let hex;
            if (format === 'hex') {
                hex = str.replace(/\s/g, '');
            } else {
                // UTF-8 to hex
                const bytes = new TextEncoder().encode(str);
                hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
            }
            // Pad or truncate to required length (in hex chars = requiredLen * 2)
            const requiredHexLen = requiredLen * 2;
            let info = '';
            if (hex.length < requiredHexLen) {
                info = `长度不足 ${requiredLen} 字节(实际 ${hex.length / 2})，已自动补0`;
                hex = hex.padEnd(requiredHexLen, '0');
            } else if (hex.length > requiredHexLen) {
                info = `长度超出 ${requiredLen} 字节(实际 ${hex.length / 2})，已自动截断`;
                hex = hex.substring(0, requiredHexLen);
            }
            return { hex, info };
        },
        encode(input, opts = {}) {
            if (typeof sm4 === 'undefined') {
                return { error: 'SM4 库未加载，请检查网络连接' };
            }
            if (!opts.key) return { error: '请输入密钥' };

            try {
                const messages = [];
                const keyResult = this._parseToHex(opts.key, opts.keyFormat || 'utf8', 16);
                if (keyResult.info) messages.push('密钥' + keyResult.info);

                const smOpts = { padding: opts.padding || 'pkcs#7' };

                if (opts.mode === 'cbc') {
                    if (!opts.iv) return { error: 'CBC 模式需要 IV' };
                    const ivResult = this._parseToHex(opts.iv, opts.ivFormat || 'utf8', 16);
                    if (ivResult.info) messages.push('IV' + ivResult.info);
                    smOpts.mode = 'cbc';
                    smOpts.iv = ivResult.hex;
                }

                const encrypted = sm4.encrypt(input, keyResult.hex, smOpts);
                let output = encrypted;
                if (opts.outputFormat === 'base64') {
                    // hex to base64
                    const bytes = [];
                    for (let i = 0; i < encrypted.length; i += 2) {
                        bytes.push(parseInt(encrypted.substr(i, 2), 16));
                    }
                    output = btoa(String.fromCharCode.apply(null, bytes));
                }

                return { output, info: messages.length > 0 ? messages.join('; ') : null };
            } catch (e) {
                return { error: `SM4 加密失败: ${e.message}` };
            }
        },
        decode(input, opts = {}) {
            if (typeof sm4 === 'undefined') {
                return { error: 'SM4 库未加载，请检查网络连接' };
            }
            if (!opts.key) return { error: '请输入密钥' };
            if (!input.trim()) return { error: '请输入密文' };

            try {
                const messages = [];
                const keyResult = this._parseToHex(opts.key, opts.keyFormat || 'utf8', 16);
                if (keyResult.info) messages.push('密钥' + keyResult.info);

                // Clean ciphertext
                let cipherHex = CipherHelper.cleanCiphertext(input);

                // If base64, convert to hex
                if (opts.outputFormat === 'base64') {
                    try {
                        const binary = atob(cipherHex);
                        cipherHex = Array.from(binary).map(ch => ch.charCodeAt(0).toString(16).padStart(2, '0')).join('');
                    } catch {
                        return { error: '密文 Base64 格式无效' };
                    }
                }

                const smOpts = { padding: opts.padding || 'pkcs#7' };

                if (opts.mode === 'cbc') {
                    if (!opts.iv) return { error: 'CBC 模式需要 IV' };
                    const ivResult = this._parseToHex(opts.iv, opts.ivFormat || 'utf8', 16);
                    if (ivResult.info) messages.push('IV' + ivResult.info);
                    smOpts.mode = 'cbc';
                    smOpts.iv = ivResult.hex;
                }

                const decrypted = sm4.decrypt(cipherHex, keyResult.hex, smOpts);
                if (!decrypted) {
                    return { error: '解密失败：可能是密钥/IV错误或Padding不匹配' };
                }

                return { output: decrypted, info: messages.length > 0 ? messages.join('; ') : null };
            } catch (e) {
                return { error: `SM4 解密失败: ${e.message}。可能原因：密钥/IV错误、Padding不匹配` };
            }
        }
    },
};

// Export
window.CipherTools = CipherTools;
window.CipherHelper = CipherHelper;
