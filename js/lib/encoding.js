/**
 * CryptoBox - Encoding/Decoding Tools
 * 编码/解码工具集：Base64, Base32, URL, HTML Entity, Unicode, Hex
 */

const EncodingTools = {
    // --- Base64 ---
    base64: {
        id: 'base64',
        name: 'Base64 编解码',
        category: 'encoding',
        description: '标准 Base64 / URL-safe Base64 编解码',
        options: [
            {
                id: 'variant',
                label: '变体',
                type: 'select',
                values: [
                    { value: 'standard', label: '标准 Base64' },
                    { value: 'urlsafe', label: 'URL-safe Base64' },
                ],
                default: 'standard'
            }
        ],
        encode(input, opts = {}) {
            const variant = opts.variant || 'standard';
            try {
                // 使用 TextEncoder 处理 UTF-8
                const bytes = new TextEncoder().encode(input);
                let binary = '';
                for (let i = 0; i < bytes.length; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                let result = btoa(binary);
                if (variant === 'urlsafe') {
                    result = result.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
                }
                return { output: result };
            } catch (e) {
                return { error: `Base64 编码失败: ${e.message}` };
            }
        },
        decode(input, opts = {}) {
            const variant = opts.variant || 'standard';
            try {
                let b64 = input.trim();
                if (variant === 'urlsafe') {
                    b64 = b64.replace(/-/g, '+').replace(/_/g, '/');
                }
                // 补齐 padding
                while (b64.length % 4 !== 0) {
                    b64 += '=';
                }
                const binary = atob(b64);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) {
                    bytes[i] = binary.charCodeAt(i);
                }
                const result = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
                return { output: result };
            } catch (e) {
                return { error: `Base64 解码失败: ${e.message}。请检查输入是否为有效的 Base64 字符串。` };
            }
        }
    },

    // --- Base32 ---
    base32: {
        id: 'base32',
        name: 'Base32 编解码',
        category: 'encoding',
        description: '标准 Base32 (RFC 4648) 编解码',
        options: [],
        encode(input) {
            const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
            const bytes = new TextEncoder().encode(input);
            let bits = '';
            for (let i = 0; i < bytes.length; i++) {
                bits += bytes[i].toString(2).padStart(8, '0');
            }
            // Pad to multiple of 5
            while (bits.length % 5 !== 0) {
                bits += '0';
            }
            let result = '';
            for (let i = 0; i < bits.length; i += 5) {
                result += alphabet[parseInt(bits.substr(i, 5), 2)];
            }
            // Add padding
            while (result.length % 8 !== 0) {
                result += '=';
            }
            return { output: result };
        },
        decode(input) {
            const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
            const str = input.trim().replace(/=+$/, '').toUpperCase();
            let bits = '';
            for (let i = 0; i < str.length; i++) {
                const idx = alphabet.indexOf(str[i]);
                if (idx === -1) {
                    return { error: `无效的 Base32 字符: "${str[i]}" (位置 ${i})` };
                }
                bits += idx.toString(2).padStart(5, '0');
            }
            const bytes = new Uint8Array(Math.floor(bits.length / 8));
            for (let i = 0; i < bytes.length; i++) {
                bytes[i] = parseInt(bits.substr(i * 8, 8), 2);
            }
            const result = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
            return { output: result };
        }
    },

    // --- URL Encoding ---
    url: {
        id: 'url',
        name: 'URL 编解码',
        category: 'encoding',
        description: 'URL 编码/解码 (Percent-encoding)',
        options: [
            {
                id: 'mode',
                label: '模式',
                type: 'select',
                values: [
                    { value: 'component', label: 'encodeURIComponent (推荐)' },
                    { value: 'uri', label: 'encodeURI (保留URL结构)' },
                    { value: 'all', label: '全部编码 (含字母数字)' },
                ],
                default: 'component'
            }
        ],
        encode(input, opts = {}) {
            const mode = opts.mode || 'component';
            try {
                let result;
                switch (mode) {
                    case 'component':
                        result = encodeURIComponent(input);
                        break;
                    case 'uri':
                        result = encodeURI(input);
                        break;
                    case 'all':
                        result = Array.from(new TextEncoder().encode(input))
                            .map(b => '%' + b.toString(16).padStart(2, '0').toUpperCase())
                            .join('');
                        break;
                    default:
                        result = encodeURIComponent(input);
                }
                return { output: result };
            } catch (e) {
                return { error: `URL 编码失败: ${e.message}` };
            }
        },
        decode(input, opts = {}) {
            try {
                const result = decodeURIComponent(input.trim());
                return { output: result };
            } catch (e) {
                return { error: `URL 解码失败: ${e.message}。输入可能包含无效的百分号编码序列。` };
            }
        }
    },

    // --- HTML Entity ---
    htmlEntity: {
        id: 'htmlEntity',
        name: 'HTML 实体编解码',
        category: 'encoding',
        description: 'HTML 实体编码/解码',
        options: [
            {
                id: 'mode',
                label: '编码模式',
                type: 'select',
                values: [
                    { value: 'named', label: '命名实体 (&amp;)' },
                    { value: 'decimal', label: '十进制 (&#38;)' },
                    { value: 'hex', label: '十六进制 (&#x26;)' },
                ],
                default: 'named'
            }
        ],
        encode(input, opts = {}) {
            const mode = opts.mode || 'named';
            const namedEntities = {
                '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
                "'": '&#39;', ' ': '&nbsp;'
            };

            let result;
            switch (mode) {
                case 'named':
                    result = input.replace(/[&<>"'\s]/g, ch => namedEntities[ch] || ch);
                    break;
                case 'decimal':
                    result = Array.from(input).map(ch => {
                        const code = ch.codePointAt(0);
                        return code > 127 || '&<>"\''.includes(ch) ? `&#${code};` : ch;
                    }).join('');
                    break;
                case 'hex':
                    result = Array.from(input).map(ch => {
                        const code = ch.codePointAt(0);
                        return code > 127 || '&<>"\''.includes(ch) ? `&#x${code.toString(16)};` : ch;
                    }).join('');
                    break;
                default:
                    result = input;
            }
            return { output: result };
        },
        decode(input) {
            try {
                const textarea = document.createElement('textarea');
                textarea.innerHTML = input;
                return { output: textarea.value };
            } catch (e) {
                return { error: `HTML 实体解码失败: ${e.message}` };
            }
        }
    },

    // --- Unicode ---
    unicode: {
        id: 'unicode',
        name: 'Unicode 编解码',
        category: 'encoding',
        description: 'Unicode 转义序列编解码 (\\uXXXX)',
        options: [
            {
                id: 'format',
                label: '格式',
                type: 'select',
                values: [
                    { value: 'js', label: 'JavaScript (\\uXXXX)' },
                    { value: 'python', label: 'Python (\\uXXXX / \\UXXXXXXXX)' },
                    { value: 'css', label: 'CSS (\\XXXX)' },
                    { value: 'codepoint', label: 'U+XXXX' },
                ],
                default: 'js'
            }
        ],
        encode(input, opts = {}) {
            const format = opts.format || 'js';
            let result;
            switch (format) {
                case 'js':
                    result = Array.from(input).map(ch => {
                        const code = ch.codePointAt(0);
                        if (code > 0xFFFF) {
                            // Surrogate pair
                            const hi = Math.floor((code - 0x10000) / 0x400) + 0xD800;
                            const lo = (code - 0x10000) % 0x400 + 0xDC00;
                            return `\\u${hi.toString(16).padStart(4, '0')}\\u${lo.toString(16).padStart(4, '0')}`;
                        }
                        return code > 127 ? `\\u${code.toString(16).padStart(4, '0')}` : ch;
                    }).join('');
                    break;
                case 'python':
                    result = Array.from(input).map(ch => {
                        const code = ch.codePointAt(0);
                        if (code > 0xFFFF) {
                            return `\\U${code.toString(16).padStart(8, '0')}`;
                        }
                        return code > 127 ? `\\u${code.toString(16).padStart(4, '0')}` : ch;
                    }).join('');
                    break;
                case 'css':
                    result = Array.from(input).map(ch => {
                        const code = ch.codePointAt(0);
                        return code > 127 ? `\\${code.toString(16)}` : ch;
                    }).join('');
                    break;
                case 'codepoint':
                    result = Array.from(input).map(ch => {
                        const code = ch.codePointAt(0);
                        return `U+${code.toString(16).toUpperCase().padStart(4, '0')}`;
                    }).join(' ');
                    break;
                default:
                    result = input;
            }
            return { output: result };
        },
        decode(input) {
            try {
                // 处理多种 Unicode 转义格式
                let result = input;
                // \UXXXXXXXX (8位)
                result = result.replace(/\\U([0-9A-Fa-f]{8})/g, (_, hex) =>
                    String.fromCodePoint(parseInt(hex, 16))
                );
                // \uXXXX (4位)
                result = result.replace(/\\u([0-9A-Fa-f]{4})/g, (_, hex) =>
                    String.fromCharCode(parseInt(hex, 16))
                );
                // U+XXXX
                result = result.replace(/U\+([0-9A-Fa-f]{4,6})/g, (_, hex) =>
                    String.fromCodePoint(parseInt(hex, 16))
                );
                // CSS \XXXX
                result = result.replace(/\\([0-9A-Fa-f]{1,6})\s?/g, (_, hex) =>
                    String.fromCodePoint(parseInt(hex, 16))
                );
                return { output: result };
            } catch (e) {
                return { error: `Unicode 解码失败: ${e.message}` };
            }
        }
    },

    // --- Hex (Base16) ---
    hex: {
        id: 'hex',
        name: 'Hex (十六进制) 编解码',
        category: 'encoding',
        description: '文本与十六进制互转',
        options: [
            {
                id: 'separator',
                label: '分隔符',
                type: 'select',
                values: [
                    { value: 'none', label: '无分隔 (48656c6c6f)' },
                    { value: 'space', label: '空格 (48 65 6c)' },
                    { value: 'colon', label: '冒号 (48:65:6c)' },
                    { value: '0x', label: '0x前缀 (0x48 0x65)' },
                    { value: '\\x', label: '\\x前缀 (\\x48\\x65)' },
                ],
                default: 'none'
            },
            {
                id: 'case',
                label: '大小写',
                type: 'select',
                values: [
                    { value: 'lower', label: '小写' },
                    { value: 'upper', label: '大写' },
                ],
                default: 'lower'
            }
        ],
        encode(input, opts = {}) {
            const separator = opts.separator || 'none';
            const useCase = opts.case || 'lower';
            const bytes = new TextEncoder().encode(input);
            let hexArr = Array.from(bytes).map(b => b.toString(16).padStart(2, '0'));

            if (useCase === 'upper') {
                hexArr = hexArr.map(h => h.toUpperCase());
            }

            let result;
            switch (separator) {
                case 'space': result = hexArr.join(' '); break;
                case 'colon': result = hexArr.join(':'); break;
                case '0x': result = hexArr.map(h => '0x' + h).join(' '); break;
                case '\\x': result = hexArr.map(h => '\\x' + h).join(''); break;
                default: result = hexArr.join('');
            }
            return { output: result };
        },
        decode(input) {
            try {
                // 清理各种格式
                let hex = input.replace(/0x/gi, '').replace(/\\x/gi, '').replace(/[:\s,;\-]/g, '');
                if (!/^[0-9A-Fa-f]*$/.test(hex)) {
                    return { error: '输入包含无效的十六进制字符' };
                }
                if (hex.length % 2 !== 0) {
                    hex = '0' + hex;
                }
                const bytes = new Uint8Array(hex.length / 2);
                for (let i = 0; i < hex.length; i += 2) {
                    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
                }
                const result = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
                return { output: result };
            } catch (e) {
                return { error: `Hex 解码失败: ${e.message}` };
            }
        }
    },

    // --- Number Base Conversion ---
    baseConvert: {
        id: 'baseConvert',
        name: '进制转换',
        category: 'encoding',
        description: '二进制/八进制/十进制/十六进制互转',
        options: [
            {
                id: 'fromBase',
                label: '源进制',
                type: 'select',
                values: [
                    { value: '2', label: '二进制 (2)' },
                    { value: '8', label: '八进制 (8)' },
                    { value: '10', label: '十进制 (10)' },
                    { value: '16', label: '十六进制 (16)' },
                ],
                default: '10'
            },
            {
                id: 'toBase',
                label: '目标进制',
                type: 'select',
                values: [
                    { value: '2', label: '二进制 (2)' },
                    { value: '8', label: '八进制 (8)' },
                    { value: '10', label: '十进制 (10)' },
                    { value: '16', label: '十六进制 (16)' },
                ],
                default: '16'
            }
        ],
        encode(input, opts = {}) {
            const fromBase = parseInt(opts.fromBase || '10');
            const toBase = parseInt(opts.toBase || '16');
            try {
                // 支持多个数字（空格/逗号分隔）
                const numbers = input.trim().split(/[\s,;]+/);
                const results = numbers.map(num => {
                    num = num.replace(/^0[xXbBoO]/, ''); // 去除前缀
                    const decimal = parseInt(num, fromBase);
                    if (isNaN(decimal)) {
                        throw new Error(`"${num}" 不是有效的 ${fromBase} 进制数`);
                    }
                    return decimal.toString(toBase).toUpperCase();
                });
                return { output: results.join(' ') };
            } catch (e) {
                return { error: `进制转换失败: ${e.message}` };
            }
        },
        decode(input, opts) {
            // 进制转换是双向的，decode 就是反向转换
            return this.encode(input, {
                fromBase: opts.toBase,
                toBase: opts.fromBase
            });
        }
    }
};

// Export
if (typeof window !== 'undefined') {
    window.EncodingTools = EncodingTools;
}
export default EncodingTools;
