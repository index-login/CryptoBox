/**
 * CryptoBox - Classical Ciphers
 * 古典密码工具集：Caesar/Vigenere/ROT13/Atbash/Rail Fence/Bacon/XOR/Affine/Playfair
 */

const ClassicalCiphers = {
    // --- Caesar Cipher (凯撒密码) ---
    caesar: {
        id: 'caesar',
        name: '凯撒密码',
        category: 'cipher',
        description: '字母位移加密 (Caesar Cipher)，支持暴力破解',
        autoDetectable: false,
        options: [
            {
                id: 'shift', label: '位移量', type: 'number',
                default: '3', min: '0', max: '25'
            },
            {
                id: 'mode', label: '模式', type: 'select',
                values: [
                    { value: 'normal', label: '加密/解密' },
                    { value: 'bruteforce', label: '暴力破解 (枚举所有偏移)' },
                ],
                default: 'normal'
            }
        ],
        _shift(text, n) {
            return text.replace(/[a-zA-Z]/g, ch => {
                const base = ch >= 'a' ? 97 : 65;
                return String.fromCharCode((ch.charCodeAt(0) - base + n + 26) % 26 + base);
            });
        },
        encode(input, opts = {}) {
            const shift = parseInt(opts.shift || '3');
            if (opts.mode === 'bruteforce') {
                const results = [];
                for (let i = 0; i < 26; i++) {
                    results.push(`位移 ${String(i).padStart(2, '0')}: ${this._shift(input, i)}`);
                }
                return { output: results.join('\n') };
            }
            return { output: this._shift(input, shift) };
        },
        decode(input, opts = {}) {
            const shift = parseInt(opts.shift || '3');
            if (opts.mode === 'bruteforce') {
                const results = [];
                for (let i = 0; i < 26; i++) {
                    results.push(`位移 ${String(i).padStart(2, '0')}: ${this._shift(input, -i)}`);
                }
                return { output: results.join('\n') };
            }
            return { output: this._shift(input, -shift) };
        }
    },

    // --- ROT13 ---
    rot13: {
        id: 'rot13',
        name: 'ROT13',
        category: 'cipher',
        description: '字母旋转 13 位（自反密码：编码=解码）',
        autoDetectable: true,
        detectEncoded() { return false; }, // ROT13 双向相同，默认编码
        options: [],
        encode(input) {
            const result = input.replace(/[a-zA-Z]/g, ch => {
                const base = ch >= 'a' ? 97 : 65;
                return String.fromCharCode((ch.charCodeAt(0) - base + 13) % 26 + base);
            });
            return { output: result };
        },
        decode(input) { return this.encode(input); }
    },

    // --- Atbash ---
    atbash: {
        id: 'atbash',
        name: 'Atbash 密码',
        category: 'cipher',
        description: '字母表反转 (A↔Z, B↔Y, ...)，自反密码',
        autoDetectable: true,
        detectEncoded() { return false; },
        options: [],
        encode(input) {
            const result = input.replace(/[a-zA-Z]/g, ch => {
                const base = ch >= 'a' ? 97 : 65;
                return String.fromCharCode(25 - (ch.charCodeAt(0) - base) + base);
            });
            return { output: result };
        },
        decode(input) { return this.encode(input); }
    },

    // --- Vigenere ---
    vigenere: {
        id: 'vigenere',
        name: '维吉尼亚密码',
        category: 'cipher',
        description: 'Vigenere Cipher，基于关键词的多表替换密码',
        autoDetectable: false,
        options: [
            {
                id: 'key', label: '密钥（字母）', type: 'text',
                placeholder: '如: KEY', default: ''
            }
        ],
        _process(text, key, decrypt = false) {
            if (!key) return text;
            const cleanKey = key.toUpperCase().replace(/[^A-Z]/g, '');
            if (!cleanKey) return text;
            let keyIdx = 0;
            return text.replace(/[a-zA-Z]/g, ch => {
                const base = ch >= 'a' ? 97 : 65;
                const shift = cleanKey.charCodeAt(keyIdx % cleanKey.length) - 65;
                const code = (ch.charCodeAt(0) - base + (decrypt ? -shift : shift) + 26) % 26 + base;
                keyIdx++;
                return String.fromCharCode(code);
            });
        },
        encode(input, opts = {}) {
            if (!opts.key) return { error: '请输入密钥' };
            return { output: this._process(input, opts.key, false) };
        },
        decode(input, opts = {}) {
            if (!opts.key) return { error: '请输入密钥' };
            return { output: this._process(input, opts.key, true) };
        }
    },

    // --- Affine Cipher (仿射密码) ---
    affine: {
        id: 'affine',
        name: '仿射密码',
        category: 'cipher',
        description: 'Affine Cipher: E(x) = (ax + b) mod 26，a 必须与 26 互质',
        autoDetectable: false,
        options: [
            { id: 'a', label: '参数 a (与26互质)', type: 'number', default: '5' },
            { id: 'b', label: '参数 b', type: 'number', default: '8' },
        ],
        _modInverse(a, m) {
            for (let i = 1; i < m; i++) {
                if ((a * i) % m === 1) return i;
            }
            return -1;
        },
        _gcd(a, b) { return b === 0 ? a : this._gcd(b, a % b); },
        encode(input, opts = {}) {
            const a = parseInt(opts.a || '5');
            const b = parseInt(opts.b || '8');
            if (this._gcd(a, 26) !== 1) {
                return { error: `参数 a=${a} 必须与 26 互质（gcd(a,26)=1）` };
            }
            const result = input.replace(/[a-zA-Z]/g, ch => {
                const base = ch >= 'a' ? 97 : 65;
                const x = ch.charCodeAt(0) - base;
                return String.fromCharCode((a * x + b) % 26 + base);
            });
            return { output: result };
        },
        decode(input, opts = {}) {
            const a = parseInt(opts.a || '5');
            const b = parseInt(opts.b || '8');
            const aInv = this._modInverse(a, 26);
            if (aInv === -1) {
                return { error: `参数 a=${a} 必须与 26 互质` };
            }
            const result = input.replace(/[a-zA-Z]/g, ch => {
                const base = ch >= 'a' ? 97 : 65;
                const y = ch.charCodeAt(0) - base;
                return String.fromCharCode(((aInv * (y - b + 26 * 26)) % 26) + base);
            });
            return { output: result };
        }
    },

    // --- Rail Fence (栅栏密码) ---
    railFence: {
        id: 'railFence',
        name: '栅栏密码',
        category: 'cipher',
        description: 'Rail Fence Cipher，按 N 行 zigzag 排列后按行读出',
        autoDetectable: false,
        options: [
            { id: 'rails', label: '栅栏数 (行数)', type: 'number', default: '3', min: '2' }
        ],
        encode(input, opts = {}) {
            const rails = parseInt(opts.rails || '3');
            if (rails < 2) return { error: '栅栏数必须 >= 2' };
            const fence = Array(rails).fill('').map(() => []);
            let rail = 0, dir = 1;
            for (const ch of input) {
                fence[rail].push(ch);
                rail += dir;
                if (rail === rails - 1 || rail === 0) dir = -dir;
            }
            return { output: fence.map(r => r.join('')).join('') };
        },
        decode(input, opts = {}) {
            const rails = parseInt(opts.rails || '3');
            if (rails < 2) return { error: '栅栏数必须 >= 2' };
            const len = input.length;
            // Calculate position of each char
            const pattern = [];
            let rail = 0, dir = 1;
            for (let i = 0; i < len; i++) {
                pattern.push(rail);
                rail += dir;
                if (rail === rails - 1 || rail === 0) dir = -dir;
            }
            // Count chars per rail
            const railCounts = Array(rails).fill(0);
            pattern.forEach(r => railCounts[r]++);
            // Distribute input chars to each rail
            const railChars = Array(rails).fill(null).map(() => []);
            let pos = 0;
            for (let r = 0; r < rails; r++) {
                for (let j = 0; j < railCounts[r]; j++) {
                    railChars[r].push(input[pos++]);
                }
            }
            // Read in zigzag order
            const result = pattern.map(r => railChars[r].shift()).join('');
            return { output: result };
        }
    },

    // --- Bacon Cipher ---
    bacon: {
        id: 'bacon',
        name: '培根密码',
        category: 'cipher',
        description: 'Bacon Cipher，每个字母用 5 位 A/B 序列表示',
        autoDetectable: true,
        detectEncoded(input) {
            return /^[ABab\s]+$/.test(input.trim()) && input.length >= 5;
        },
        options: [
            {
                id: 'variant', label: '变体', type: 'select',
                values: [
                    { value: 'standard', label: '标准 (I=J, U=V)' },
                    { value: 'modern', label: '现代 (26字母)' },
                ],
                default: 'standard'
            }
        ],
        _getMap(variant) {
            const map = {};
            const reverseMap = {};
            if (variant === 'modern') {
                for (let i = 0; i < 26; i++) {
                    const code = i.toString(2).padStart(5, '0').replace(/0/g, 'A').replace(/1/g, 'B');
                    const letter = String.fromCharCode(65 + i);
                    map[letter] = code;
                    reverseMap[code] = letter;
                }
            } else {
                // Standard: I=J, U=V
                let idx = 0;
                for (let i = 0; i < 26; i++) {
                    const letter = String.fromCharCode(65 + i);
                    if (letter === 'J') { map['J'] = map['I']; continue; }
                    if (letter === 'V') { map['V'] = map['U']; continue; }
                    const code = idx.toString(2).padStart(5, '0').replace(/0/g, 'A').replace(/1/g, 'B');
                    map[letter] = code;
                    reverseMap[code] = letter;
                    idx++;
                }
            }
            return { map, reverseMap };
        },
        encode(input, opts = {}) {
            const { map } = this._getMap(opts.variant || 'standard');
            const result = input.toUpperCase().split('').map(ch => {
                if (/[A-Z]/.test(ch)) return map[ch] || '';
                return ch === ' ' ? ' ' : '';
            }).filter(s => s).join(' ');
            return { output: result };
        },
        decode(input, opts = {}) {
            const { reverseMap } = this._getMap(opts.variant || 'standard');
            const cleaned = input.toUpperCase().replace(/[^AB]/g, '');
            const result = [];
            for (let i = 0; i < cleaned.length; i += 5) {
                const code = cleaned.substr(i, 5);
                if (code.length === 5) {
                    result.push(reverseMap[code] || '?');
                }
            }
            return { output: result.join('') };
        }
    },

    // --- XOR Cipher ---
    xor: {
        id: 'xor',
        name: 'XOR 加解密',
        category: 'cipher',
        description: '异或运算，密钥循环异或明文，自反加密',
        autoDetectable: false,
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
                ],
                default: 'utf8'
            },
            {
                id: 'inputFormat', label: '输入格式', type: 'select',
                values: [
                    { value: 'utf8', label: 'UTF-8 文本' },
                    { value: 'hex', label: 'Hex' },
                    { value: 'base64', label: 'Base64' },
                ],
                default: 'utf8'
            },
            {
                id: 'outputFormat', label: '输出格式', type: 'select',
                values: [
                    { value: 'hex', label: 'Hex' },
                    { value: 'base64', label: 'Base64' },
                    { value: 'utf8', label: 'UTF-8 文本' },
                ],
                default: 'hex'
            }
        ],
        _parseBytes(str, format) {
            switch (format) {
                case 'hex':
                    str = str.replace(/0x/gi, '').replace(/\\x/gi, '').replace(/[\s:,;\-]/g, '');
                    if (str.length % 2 !== 0) str = '0' + str;
                    const bytes = new Uint8Array(str.length / 2);
                    for (let i = 0; i < str.length; i += 2) {
                        bytes[i / 2] = parseInt(str.substr(i, 2), 16);
                    }
                    return bytes;
                case 'base64':
                    const binary = atob(str.replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, ''));
                    const b = new Uint8Array(binary.length);
                    for (let i = 0; i < binary.length; i++) b[i] = binary.charCodeAt(i);
                    return b;
                default:
                    return new TextEncoder().encode(str);
            }
        },
        _bytesToOutput(bytes, format) {
            switch (format) {
                case 'hex':
                    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
                case 'base64':
                    let bin = '';
                    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
                    return btoa(bin);
                default:
                    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
            }
        },
        _xor(input, opts) {
            if (!opts.key) return { error: '请输入密钥' };
            try {
                const inputBytes = this._parseBytes(input, opts.inputFormat || 'utf8');
                const keyBytes = this._parseBytes(opts.key, opts.keyFormat || 'utf8');
                if (keyBytes.length === 0) return { error: '密钥不能为空' };
                const result = new Uint8Array(inputBytes.length);
                for (let i = 0; i < inputBytes.length; i++) {
                    result[i] = inputBytes[i] ^ keyBytes[i % keyBytes.length];
                }
                return { output: this._bytesToOutput(result, opts.outputFormat || 'hex') };
            } catch (e) {
                return { error: `XOR 处理失败: ${e.message}` };
            }
        },
        encode(input, opts = {}) { return this._xor(input, opts); },
        decode(input, opts = {}) {
            // 解密时输入格式默认是 hex/base64，输出是 utf8
            const decodeOpts = {
                ...opts,
                inputFormat: opts.outputFormat || 'hex',
                outputFormat: opts.inputFormat || 'utf8'
            };
            return this._xor(input, decodeOpts);
        }
    }
};

// Export
window.ClassicalCiphers = ClassicalCiphers;
