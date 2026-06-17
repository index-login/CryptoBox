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
        autoDetectable: true,
        detectEncoded(input) {
            const s = input.trim();
            // Base64: 只含合法字符，长度>=4，且能成功解码
            if (!/^[A-Za-z0-9+/\-_=\s]+$/.test(s)) return false;
            const clean = s.replace(/\s/g, '');
            if (clean.length < 4) return false;
            // 含有非ASCII可打印字符的不太可能是手打文本
            try {
                let b64 = clean.replace(/-/g, '+').replace(/_/g, '/');
                while (b64.length % 4 !== 0) b64 += '=';
                atob(b64);
                // 如果包含 +/= 或 -_ 特征字符，大概率是 Base64
                if (/[+/=]/.test(clean) || (/[-_]/.test(clean) && clean.length > 8)) return true;
                // 纯字母数字且长度较长也可能是
                if (clean.length >= 16 && /[0-9]/.test(clean) && /[A-Z]/.test(clean) && /[a-z]/.test(clean)) return true;
                return false;
            } catch { return false; }
        },
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
        autoDetectable: true,
        detectEncoded(input) {
            const s = input.trim().toUpperCase();
            // Base32: 只含 A-Z2-7 和 =，长度>=8
            return /^[A-Z2-7=\s]{8,}$/.test(s) && s.replace(/[=\s]/g, '').length >= 8;
        },
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
        autoDetectable: true,
        detectEncoded(input) {
            // 包含 %XX 格式即为已编码
            return /%[0-9A-Fa-f]{2}/.test(input);
        },
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
        autoDetectable: true,
        detectEncoded(input) {
            // 包含 &xxx; 或 &#xxx; 格式即为已编码
            return /&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/.test(input);
        },
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
        autoDetectable: true,
        detectEncoded(input) {
            // 包含 \uXXXX 或 \UXXXXXXXX 或 U+XXXX 格式
            return /\\u[0-9A-Fa-f]{4}|\\U[0-9A-Fa-f]{8}|U\+[0-9A-Fa-f]{4,6}/.test(input);
        },
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
        autoDetectable: true,
        detectEncoded(input) {
            const s = input.trim();
            // 带 0x 或 \x 前缀的一定是 hex
            if (/^(0x[0-9A-Fa-f]{2}[\s,;]*)+$/i.test(s)) return true;
            if (/^(\\x[0-9A-Fa-f]{2})+$/i.test(s)) return true;
            // 纯 hex 字符，偶数长度，且长度>=4
            const clean = s.replace(/[\s:,;\-]/g, '');
            if (/^[0-9A-Fa-f]+$/.test(clean) && clean.length >= 4 && clean.length % 2 === 0) {
                // 排除纯数字（可能是十进制数）
                if (/[a-fA-F]/.test(clean)) return true;
                // 纯数字但很长，也可能是 hex
                if (clean.length >= 8) return true;
            }
            return false;
        },
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
    },

    // --- QR Code Generator ---
    qrcode: {
        id: 'qrcode',
        name: '二维码生成',
        category: 'utils',
        description: '文本/URL 生成 QR Code 图片，支持自定义尺寸/颜色/中心 Logo',
        autoDetectable: false,
        options: [
            {
                id: 'ecLevel', label: '纠错等级', type: 'select',
                values: [
                    { value: 'L', label: 'L - 低 (7%)' },
                    { value: 'M', label: 'M - 中 (15%)' },
                    { value: 'Q', label: 'Q - 较高 (25%)' },
                    { value: 'H', label: 'H - 高 (30%)' },
                ],
                default: 'M'
            },
            {
                id: 'size', label: '尺寸 (px)', type: 'number',
                default: '512', min: '64', max: '4096'
            },
            {
                id: 'margin', label: '边距模块数', type: 'number',
                default: '4', min: '0', max: '8'
            },
            {
                id: 'outputType', label: '输出格式', type: 'select',
                values: [
                    { value: 'png', label: 'PNG 图片' },
                    { value: 'svg', label: 'SVG 矢量' },
                ],
                default: 'png'
            },
            {
                id: 'fgColor', label: '前景色', type: 'text',
                placeholder: '#000000', default: '#000000'
            },
            {
                id: 'bgColor', label: '背景色', type: 'text',
                placeholder: '#ffffff', default: '#ffffff'
            },
            {
                id: 'logoSize', label: 'Logo 占比 (%)', type: 'number',
                default: '20', min: '5', max: '40'
            }
        ],

        _generateQr(input, opts) {
            const ecLevel = opts.ecLevel || 'M';
            const targetSize = parseInt(opts.size || '512');
            const margin = parseInt(opts.margin || '4');
            const fgColor = opts.fgColor || '#000000';
            const bgColor = opts.bgColor || '#ffffff';
            const logoSizePercent = parseInt(opts.logoSize || '20') / 100;

            const qr = qrcode(0, ecLevel);
            qr.addData(input);
            qr.make();

            const moduleCount = qr.getModuleCount();
            const totalModules = moduleCount + margin * 2;
            const moduleSize = Math.max(1, Math.floor(targetSize / totalModules));
            const canvasSize = totalModules * moduleSize;

            return { qr, moduleCount, totalModules, moduleSize, canvasSize, fgColor, bgColor, logoSizePercent, ecLevel, margin };
        },

        _drawQrCanvas(qr, moduleCount, margin, moduleSize, canvasSize, fgColor, bgColor) {
            const canvas = document.createElement('canvas');
            canvas.width = canvasSize;
            canvas.height = canvasSize;
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, canvasSize, canvasSize);

            ctx.fillStyle = fgColor;
            for (let row = 0; row < moduleCount; row++) {
                for (let col = 0; col < moduleCount; col++) {
                    if (qr.isDark(row, col)) {
                        ctx.fillRect(
                            (col + margin) * moduleSize,
                            (row + margin) * moduleSize,
                            moduleSize,
                            moduleSize
                        );
                    }
                }
            }
            return canvas;
        },

        _drawLogo(canvas, logoDataUrl, logoSizePercent) {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    const ctx = canvas.getContext('2d');
                    const logoW = canvas.width * logoSizePercent;
                    const logoH = logoW * (img.height / img.width);
                    const x = (canvas.width - logoW) / 2;
                    const y = (canvas.height - logoH) / 2;

                    const pad = logoW * 0.08;
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    const rx = x - pad, ry = y - pad, rw = logoW + pad * 2, rh = logoH + pad * 2, rr = pad * 1.5;
                    ctx.moveTo(rx + rr, ry);
                    ctx.lineTo(rx + rw - rr, ry);
                    ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + rr);
                    ctx.lineTo(rx + rw, ry + rh - rr);
                    ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - rr, ry + rh);
                    ctx.lineTo(rx + rr, ry + rh);
                    ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - rr);
                    ctx.lineTo(rx, ry + rr);
                    ctx.quadraticCurveTo(rx, ry, rx + rr, ry);
                    ctx.closePath();
                    ctx.fill();

                    ctx.drawImage(img, x, y, logoW, logoH);
                    resolve();
                };
                img.onerror = () => resolve();
                img.src = logoDataUrl;
            });
        },

        encode(input, opts = {}) {
            if (typeof qrcode === 'undefined') {
                return { error: 'QR Code 库未加载，请检查网络连接' };
            }
            if (!input || !input.trim()) {
                return { error: '请输入要编码的文本或 URL' };
            }

            try {
                const params = this._generateQr(input, opts);
                const { qr, moduleCount, totalModules, moduleSize, canvasSize, fgColor, bgColor, logoSizePercent, ecLevel } = params;
                const outputType = opts.outputType || 'png';

                const logoDataUrl = opts._logoDataUrl || null;

                if (outputType === 'svg') {
                    const size = totalModules * moduleSize;
                    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`;
                    svg += `<rect width="${size}" height="${size}" fill="${bgColor}"/>`;
                    for (let row = 0; row < moduleCount; row++) {
                        for (let col = 0; col < moduleCount; col++) {
                            if (qr.isDark(row, col)) {
                                svg += `<rect x="${(col + params.margin) * moduleSize}" y="${(row + params.margin) * moduleSize}" width="${moduleSize}" height="${moduleSize}" fill="${fgColor}"/>`;
                            }
                        }
                    }
                    if (logoDataUrl) {
                        const logoW = size * logoSizePercent;
                        const logoH = logoW;
                        const lx = (size - logoW) / 2;
                        const ly = (size - logoH) / 2;
                        const pad = logoW * 0.08;
                        svg += `<rect x="${lx - pad}" y="${ly - pad}" width="${logoW + pad * 2}" height="${logoH + pad * 2}" rx="${pad * 1.5}" fill="#ffffff"/>`;
                        svg += `<image href="${logoDataUrl}" x="${lx}" y="${ly}" width="${logoW}" height="${logoH}"/>`;
                    }
                    svg += '</svg>';

                    return {
                        output: svg,
                        qrData: {
                            svg, moduleCount, totalModules, ecLevel, fgColor, bgColor,
                            moduleSize, margin: params.margin, logoDataUrl, canvasSize
                        },
                        info: `${moduleCount}×${moduleCount} 模块 · ${canvasSize}×${canvasSize} px · 纠错 ${ecLevel} · SVG`
                    };
                }

                const canvas = this._drawQrCanvas(qr, moduleCount, params.margin, moduleSize, canvasSize, fgColor, bgColor);

                const finalize = (c) => {
                    const dataUrl = c.toDataURL('image/png');
                    return {
                        output: dataUrl,
                        qrData: {
                            dataUrl, moduleCount, totalModules, ecLevel, fgColor, bgColor,
                            moduleSize, margin: params.margin, logoDataUrl, canvasSize, canvas: c
                        },
                        info: `${moduleCount}×${moduleCount} 模块 · ${canvasSize}×${canvasSize} px · 纠错 ${ecLevel} · PNG`
                    };
                };

                if (logoDataUrl) {
                    return this._drawLogo(canvas, logoDataUrl, logoSizePercent).then(() => finalize(canvas));
                }
                return finalize(canvas);
            } catch (e) {
                return { error: `二维码生成失败: ${e.message}` };
            }
        },
        decode() {
            return { error: '暂不支持二维码解码，请使用手机扫码或在线二维码识别工具' };
        }
    }
};

// Export for global usage
window.EncodingTools = EncodingTools;
