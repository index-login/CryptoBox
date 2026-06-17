/**
 * CryptoBox - Hash Tools
 * 哈希计算工具集：MD5, SHA-1, SHA-256, SHA-512, SHA-3, HMAC, CRC32
 */

const HashTools = {
    // --- MD5 ---
    md5: {
        id: 'md5',
        name: 'MD5',
        category: 'hash',
        description: 'MD5 哈希计算 (128位)',
        options: [
            {
                id: 'outputCase',
                label: '输出大小写',
                type: 'select',
                values: [
                    { value: 'lower', label: '小写' },
                    { value: 'upper', label: '大写' },
                ],
                default: 'lower'
            }
        ],
        encode(input, opts = {}) {
            try {
                const hash = CryptoJS.MD5(input);
                let result = hash.toString(CryptoJS.enc.Hex);
                if (opts.outputCase === 'upper') {
                    result = result.toUpperCase();
                }
                return { output: result };
            } catch (e) {
                return { error: `MD5 计算失败: ${e.message}` };
            }
        },
        decode() {
            return { error: 'MD5 是单向哈希函数，不支持解密。' };
        }
    },

    // --- SHA-1 ---
    sha1: {
        id: 'sha1',
        name: 'SHA-1',
        category: 'hash',
        description: 'SHA-1 哈希计算 (160位)',
        options: [
            {
                id: 'outputCase',
                label: '输出大小写',
                type: 'select',
                values: [
                    { value: 'lower', label: '小写' },
                    { value: 'upper', label: '大写' },
                ],
                default: 'lower'
            }
        ],
        encode(input, opts = {}) {
            try {
                const hash = CryptoJS.SHA1(input);
                let result = hash.toString(CryptoJS.enc.Hex);
                if (opts.outputCase === 'upper') {
                    result = result.toUpperCase();
                }
                return { output: result };
            } catch (e) {
                return { error: `SHA-1 计算失败: ${e.message}` };
            }
        },
        decode() {
            return { error: 'SHA-1 是单向哈希函数，不支持解密。' };
        }
    },

    // --- SHA-256 ---
    sha256: {
        id: 'sha256',
        name: 'SHA-256',
        category: 'hash',
        description: 'SHA-256 哈希计算 (256位)',
        options: [
            {
                id: 'outputCase',
                label: '输出大小写',
                type: 'select',
                values: [
                    { value: 'lower', label: '小写' },
                    { value: 'upper', label: '大写' },
                ],
                default: 'lower'
            }
        ],
        encode(input, opts = {}) {
            try {
                const hash = CryptoJS.SHA256(input);
                let result = hash.toString(CryptoJS.enc.Hex);
                if (opts.outputCase === 'upper') {
                    result = result.toUpperCase();
                }
                return { output: result };
            } catch (e) {
                return { error: `SHA-256 计算失败: ${e.message}` };
            }
        },
        decode() {
            return { error: 'SHA-256 是单向哈希函数，不支持解密。' };
        }
    },

    // --- SHA-512 ---
    sha512: {
        id: 'sha512',
        name: 'SHA-512',
        category: 'hash',
        description: 'SHA-512 哈希计算 (512位)',
        options: [
            {
                id: 'outputCase',
                label: '输出大小写',
                type: 'select',
                values: [
                    { value: 'lower', label: '小写' },
                    { value: 'upper', label: '大写' },
                ],
                default: 'lower'
            }
        ],
        encode(input, opts = {}) {
            try {
                const hash = CryptoJS.SHA512(input);
                let result = hash.toString(CryptoJS.enc.Hex);
                if (opts.outputCase === 'upper') {
                    result = result.toUpperCase();
                }
                return { output: result };
            } catch (e) {
                return { error: `SHA-512 计算失败: ${e.message}` };
            }
        },
        decode() {
            return { error: 'SHA-512 是单向哈希函数，不支持解密。' };
        }
    },

    // --- SHA-3 (256) ---
    sha3: {
        id: 'sha3',
        name: 'SHA-3',
        category: 'hash',
        description: 'SHA-3 (Keccak) 哈希计算',
        options: [
            {
                id: 'length',
                label: '输出长度',
                type: 'select',
                values: [
                    { value: '224', label: 'SHA3-224' },
                    { value: '256', label: 'SHA3-256' },
                    { value: '384', label: 'SHA3-384' },
                    { value: '512', label: 'SHA3-512' },
                ],
                default: '256'
            },
            {
                id: 'outputCase',
                label: '输出大小写',
                type: 'select',
                values: [
                    { value: 'lower', label: '小写' },
                    { value: 'upper', label: '大写' },
                ],
                default: 'lower'
            }
        ],
        encode(input, opts = {}) {
            try {
                const length = parseInt(opts.length || '256');
                const hash = CryptoJS.SHA3(input, { outputLength: length });
                let result = hash.toString(CryptoJS.enc.Hex);
                if (opts.outputCase === 'upper') {
                    result = result.toUpperCase();
                }
                return { output: result };
            } catch (e) {
                return { error: `SHA-3 计算失败: ${e.message}` };
            }
        },
        decode() {
            return { error: 'SHA-3 是单向哈希函数，不支持解密。' };
        }
    },

    // --- HMAC ---
    hmac: {
        id: 'hmac',
        name: 'HMAC',
        category: 'hash',
        description: '基于密钥的哈希消息认证码',
        options: [
            {
                id: 'algorithm',
                label: '哈希算法',
                type: 'select',
                values: [
                    { value: 'MD5', label: 'HMAC-MD5' },
                    { value: 'SHA1', label: 'HMAC-SHA1' },
                    { value: 'SHA256', label: 'HMAC-SHA256' },
                    { value: 'SHA512', label: 'HMAC-SHA512' },
                ],
                default: 'SHA256'
            },
            {
                id: 'key',
                label: '密钥',
                type: 'text',
                placeholder: '输入 HMAC 密钥',
                default: ''
            },
            {
                id: 'keyFormat',
                label: '密钥格式',
                type: 'select',
                values: [
                    { value: 'utf8', label: 'UTF-8 文本' },
                    { value: 'hex', label: 'Hex' },
                    { value: 'base64', label: 'Base64' },
                ],
                default: 'utf8'
            },
            {
                id: 'outputCase',
                label: '输出大小写',
                type: 'select',
                values: [
                    { value: 'lower', label: '小写' },
                    { value: 'upper', label: '大写' },
                ],
                default: 'lower'
            }
        ],
        encode(input, opts = {}) {
            const algorithm = opts.algorithm || 'SHA256';
            const keyStr = opts.key || '';
            const keyFormat = opts.keyFormat || 'utf8';

            if (!keyStr) {
                return { error: '请输入 HMAC 密钥' };
            }

            try {
                let key;
                switch (keyFormat) {
                    case 'hex':
                        key = CryptoJS.enc.Hex.parse(keyStr);
                        break;
                    case 'base64':
                        key = CryptoJS.enc.Base64.parse(keyStr);
                        break;
                    default:
                        key = keyStr;
                }

                const algMap = {
                    'MD5': CryptoJS.HmacMD5,
                    'SHA1': CryptoJS.HmacSHA1,
                    'SHA256': CryptoJS.HmacSHA256,
                    'SHA512': CryptoJS.HmacSHA512,
                };

                const hmacFn = algMap[algorithm];
                if (!hmacFn) {
                    return { error: `不支持的算法: ${algorithm}` };
                }

                const hash = hmacFn(input, key);
                let result = hash.toString(CryptoJS.enc.Hex);
                if (opts.outputCase === 'upper') {
                    result = result.toUpperCase();
                }
                return { output: result };
            } catch (e) {
                return { error: `HMAC 计算失败: ${e.message}` };
            }
        },
        decode() {
            return { error: 'HMAC 是单向哈希函数，不支持解密。' };
        }
    },

    // --- RIPEMD-160 ---
    ripemd160: {
        id: 'ripemd160',
        name: 'RIPEMD-160',
        category: 'hash',
        description: 'RIPEMD-160 哈希计算 (160位)',
        options: [
            {
                id: 'outputCase',
                label: '输出大小写',
                type: 'select',
                values: [
                    { value: 'lower', label: '小写' },
                    { value: 'upper', label: '大写' },
                ],
                default: 'lower'
            }
        ],
        encode(input, opts = {}) {
            try {
                const hash = CryptoJS.RIPEMD160(input);
                let result = hash.toString(CryptoJS.enc.Hex);
                if (opts.outputCase === 'upper') {
                    result = result.toUpperCase();
                }
                return { output: result };
            } catch (e) {
                return { error: `RIPEMD-160 计算失败: ${e.message}` };
            }
        },
        decode() {
            return { error: 'RIPEMD-160 是单向哈希函数，不支持解密。' };
        }
    },

    // --- CRC32 ---
    crc32: {
        id: 'crc32',
        name: 'CRC32',
        category: 'hash',
        description: 'CRC32 循环冗余校验',
        options: [
            {
                id: 'outputCase',
                label: '输出大小写',
                type: 'select',
                values: [
                    { value: 'lower', label: '小写' },
                    { value: 'upper', label: '大写' },
                ],
                default: 'lower'
            }
        ],
        encode(input, opts = {}) {
            try {
                // CRC32 implementation (table computed once and cached)
                if (!HashTools._crc32Table) {
                    const table = new Uint32Array(256);
                    for (let i = 0; i < 256; i++) {
                        let crc = i;
                        for (let j = 0; j < 8; j++) {
                            crc = (crc & 1) ? (0xEDB88320 ^ (crc >>> 1)) : (crc >>> 1);
                        }
                        table[i] = crc;
                    }
                    HashTools._crc32Table = table;
                }
                const crc32Table = HashTools._crc32Table;

                const bytes = new TextEncoder().encode(input);
                let crc = 0xFFFFFFFF;
                for (let i = 0; i < bytes.length; i++) {
                    crc = crc32Table[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
                }
                crc = (crc ^ 0xFFFFFFFF) >>> 0;

                let result = crc.toString(16).padStart(8, '0');
                if (opts.outputCase === 'upper') {
                    result = result.toUpperCase();
                }
                return { output: result };
            } catch (e) {
                return { error: `CRC32 计算失败: ${e.message}` };
            }
        },
        decode() {
            return { error: 'CRC32 是单向校验函数，不支持逆向。' };
        }
    },

    // --- NTLM Hash ---
    ntlm: {
        id: 'ntlm',
        name: 'NTLM Hash',
        category: 'hash',
        description: 'Windows NTLM 密码哈希 (MD4 of UTF-16LE)',
        options: [
            {
                id: 'outputCase',
                label: '输出大小写',
                type: 'select',
                values: [
                    { value: 'lower', label: '小写' },
                    { value: 'upper', label: '大写' },
                ],
                default: 'lower'
            }
        ],
        encode(input, opts = {}) {
            try {
                // NTLM = MD4(UTF-16LE(password))
                // Convert to UTF-16LE
                const utf16le = CryptoJS.enc.Utf16LE.parse(input);
                // MD4 hash
                const hash = CryptoJS.MD4(utf16le);
                let result = hash.toString(CryptoJS.enc.Hex);
                if (opts.outputCase === 'upper') {
                    result = result.toUpperCase();
                }
                return { output: result };
            } catch (e) {
                // MD4 might not be available in all CryptoJS builds
                return { error: `NTLM Hash 计算失败: ${e.message}。可能需要加载 CryptoJS MD4 模块。` };
            }
        },
        decode() {
            return { error: 'NTLM Hash 是单向哈希函数，不支持解密。' };
        }
    },

    // --- Multi-Hash (一次计算多种哈希) ---
    multiHash: {
        id: 'multiHash',
        name: '多重哈希',
        category: 'hash',
        description: '同时计算 MD5, SHA-1, SHA-256, SHA-512 等多种哈希',
        options: [],
        encode(input) {
            try {
                const results = [
                    `MD5:        ${CryptoJS.MD5(input).toString()}`,
                    `SHA-1:      ${CryptoJS.SHA1(input).toString()}`,
                    `SHA-256:    ${CryptoJS.SHA256(input).toString()}`,
                    `SHA-512:    ${CryptoJS.SHA512(input).toString()}`,
                    `SHA-3-256:  ${CryptoJS.SHA3(input, { outputLength: 256 }).toString()}`,
                    `RIPEMD-160: ${CryptoJS.RIPEMD160(input).toString()}`,
                ];
                if (typeof sm3 !== 'undefined') {
                    results.push(`SM3:        ${sm3(input)}`);
                }
                return { output: results.join('\n') };
            } catch (e) {
                return { error: `哈希计算失败: ${e.message}` };
            }
        },
        decode() {
            return { error: '哈希是单向函数，不支持解密。' };
        }
    },

    // --- SM3 国密哈希 ---
    sm3Hash: {
        id: 'sm3Hash',
        name: 'SM3',
        category: 'hash',
        description: '国密 SM3 哈希算法 (256位摘要)',
        options: [
            {
                id: 'mode', label: '模式', type: 'select',
                values: [
                    { value: 'hash', label: '普通哈希' },
                    { value: 'hmac', label: 'HMAC-SM3' },
                ],
                default: 'hash'
            },
            {
                id: 'key', label: 'HMAC 密钥', type: 'text',
                placeholder: 'HMAC 模式时输入密钥', default: ''
            },
            {
                id: 'outputCase', label: '输出大小写', type: 'select',
                values: [
                    { value: 'lower', label: '小写' },
                    { value: 'upper', label: '大写' },
                ],
                default: 'lower'
            }
        ],
        encode(input, opts = {}) {
            if (typeof sm3 === 'undefined') {
                return { error: 'SM3 库未加载，请检查网络连接' };
            }
            try {
                let result;
                if (opts.mode === 'hmac') {
                    if (!opts.key) return { error: '请输入 HMAC 密钥' };
                    result = sm3(input, { mode: 'hmac', key: opts.key });
                } else {
                    result = sm3(input);
                }
                if (opts.outputCase === 'upper') {
                    result = result.toUpperCase();
                }
                return { output: result };
            } catch (e) {
                return { error: `SM3 计算失败: ${e.message}` };
            }
        },
        decode() {
            return { error: 'SM3 是单向哈希函数，不支持解密。' };
        }
    }
};

// Export for global usage
window.HashTools = HashTools;
