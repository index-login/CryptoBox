/**
 * CryptoBox - Format Conversion Module
 * 输入输出格式转换：UTF-8 / Hex / Base64 / Binary 互转
 */

const Format = {
    /**
     * 将字符串按指定格式转为字节数组 (Uint8Array)
     */
    decode(str, format) {
        switch (format) {
            case 'utf8':
                return this.utf8ToBytes(str);
            case 'hex':
                return this.hexToBytes(str);
            case 'base64':
                return this.base64ToBytes(str);
            case 'binary':
                return this.binaryToBytes(str);
            default:
                return this.utf8ToBytes(str);
        }
    },

    /**
     * 将字节数组按指定格式转为字符串
     */
    encode(bytes, format) {
        if (!(bytes instanceof Uint8Array)) {
            bytes = new Uint8Array(bytes);
        }
        switch (format) {
            case 'utf8':
                return this.bytesToUtf8(bytes);
            case 'hex':
                return this.bytesToHex(bytes);
            case 'base64':
                return this.bytesToBase64(bytes);
            case 'binary':
                return this.bytesToBinary(bytes);
            default:
                return this.bytesToUtf8(bytes);
        }
    },

    // --- UTF-8 ---
    utf8ToBytes(str) {
        return new TextEncoder().encode(str);
    },

    bytesToUtf8(bytes) {
        return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    },

    // --- Hex ---
    hexToBytes(hex) {
        // 清理输入：去除 0x 前缀、空格、换行等
        hex = hex.replace(/0x/gi, '').replace(/[\s\r\n,;]/g, '');
        if (hex.length % 2 !== 0) {
            hex = '0' + hex; // 奇数长度前补0
        }
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
            const byte = parseInt(hex.substr(i, 2), 16);
            if (isNaN(byte)) {
                throw new Error(`无效的 Hex 字符: "${hex.substr(i, 2)}" (位置 ${i})`);
            }
            bytes[i / 2] = byte;
        }
        return bytes;
    },

    bytesToHex(bytes, separator = '') {
        return Array.from(bytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join(separator);
    },

    // --- Base64 ---
    base64ToBytes(b64) {
        // 支持 URL-safe Base64
        b64 = b64.replace(/-/g, '+').replace(/_/g, '/');
        // 补齐 padding
        while (b64.length % 4 !== 0) {
            b64 += '=';
        }
        try {
            const binary = atob(b64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            return bytes;
        } catch (e) {
            throw new Error('无效的 Base64 输入');
        }
    },

    bytesToBase64(bytes) {
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    },

    // --- Binary string ---
    binaryToBytes(binStr) {
        // 去除空格和非01字符
        binStr = binStr.replace(/[^01]/g, '');
        if (binStr.length % 8 !== 0) {
            // 前补0到8的倍数
            binStr = binStr.padStart(Math.ceil(binStr.length / 8) * 8, '0');
        }
        const bytes = new Uint8Array(binStr.length / 8);
        for (let i = 0; i < binStr.length; i += 8) {
            bytes[i / 8] = parseInt(binStr.substr(i, 8), 2);
        }
        return bytes;
    },

    bytesToBinary(bytes, separator = ' ') {
        return Array.from(bytes)
            .map(b => b.toString(2).padStart(8, '0'))
            .join(separator);
    },

    // --- Utility ---

    /**
     * 自动检测输入格式
     * 返回: 'hex' | 'base64' | 'binary' | 'utf8'
     */
    detectFormat(str) {
        str = str.trim();

        // 检测纯二进制字符串 (只有0和1，且长度>=8)
        if (/^[01\s]{8,}$/.test(str) && str.replace(/\s/g, '').length % 8 === 0) {
            return 'binary';
        }

        // 检测 Hex (带 0x 前缀或纯hex字符)
        if (/^(0x)?[0-9a-fA-F\s]{2,}$/.test(str)) {
            const cleaned = str.replace(/0x/gi, '').replace(/\s/g, '');
            if (cleaned.length % 2 === 0 && cleaned.length >= 2) {
                return 'hex';
            }
        }

        // 检测 Base64 (标准或URL-safe)
        if (/^[A-Za-z0-9+/\-_]+=*$/.test(str) && str.length >= 4 && str.length % 4 <= 2) {
            // 进一步验证：尝试解码
            try {
                const test = str.replace(/-/g, '+').replace(/_/g, '/');
                atob(test.padEnd(test.length + (4 - test.length % 4) % 4, '='));
                // 如果全是字母数字且较短，可能只是普通文本
                if (str.length > 8 && /[+/=\-_]/.test(str)) {
                    return 'base64';
                }
            } catch (e) {
                // not base64
            }
        }

        return 'utf8';
    },

    /**
     * CryptoJS WordArray 转 Uint8Array
     */
    wordArrayToBytes(wordArray) {
        const words = wordArray.words;
        const sigBytes = wordArray.sigBytes;
        const bytes = new Uint8Array(sigBytes);
        for (let i = 0; i < sigBytes; i++) {
            bytes[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
        }
        return bytes;
    },

    /**
     * Uint8Array 转 CryptoJS WordArray
     */
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
    },

    /**
     * 获取字节长度描述
     */
    getByteLength(str, format) {
        try {
            const bytes = this.decode(str, format);
            return bytes.length;
        } catch {
            return -1;
        }
    }
};

// Export for global usage
window.Format = Format;
