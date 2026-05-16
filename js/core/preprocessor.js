/**
 * CryptoBox - Smart Input Preprocessor
 * 智能输入预处理：自动清理 URL 编码、转义字符、格式干扰等
 */

const Preprocessor = {
    /**
     * 执行全部预处理
     */
    process(input, options = {}) {
        const {
            urlDecode = true,
            unescape = true,
            trimWhitespace = true,
            removePrefix = true,
            stripQuotes = true,
        } = options;

        let result = input;

        if (stripQuotes) {
            result = this.stripQuotes(result);
        }
        if (urlDecode) {
            result = this.urlDecode(result);
        }
        if (unescape) {
            result = this.unescapeString(result);
        }
        if (removePrefix) {
            result = this.removeCommonPrefixes(result);
        }
        if (trimWhitespace) {
            result = this.trimWhitespace(result);
        }

        return result;
    },

    /**
     * URL 解码 - 检测并还原 URL 编码
     * 支持多层 URL 编码
     */
    urlDecode(str) {
        // 检测是否包含 URL 编码字符
        if (!/%[0-9A-Fa-f]{2}/.test(str)) {
            return str;
        }
        try {
            let decoded = str;
            let prev = '';
            // 最多解码 3 层嵌套
            for (let i = 0; i < 3 && decoded !== prev; i++) {
                prev = decoded;
                decoded = decodeURIComponent(decoded);
            }
            return decoded;
        } catch (e) {
            // 部分解码失败时尝试逐段解码
            return str.replace(/%[0-9A-Fa-f]{2}/g, (match) => {
                try {
                    return decodeURIComponent(match);
                } catch {
                    return match;
                }
            });
        }
    },

    /**
     * 转义字符处理
     * 支持: \n \t \r \\ \' \" \x41 \u0041 \U00000041 \0
     */
    unescapeString(str) {
        // 检测是否包含转义序列
        if (!/\\[nrtbfv0'\"\\xuU]/.test(str)) {
            return str;
        }

        return str.replace(/\\(x[0-9A-Fa-f]{2}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8}|[nrtbfv0'"\\])/g, (match, seq) => {
            switch (seq[0]) {
                case 'n': return '\n';
                case 'r': return '\r';
                case 't': return '\t';
                case 'b': return '\b';
                case 'f': return '\f';
                case 'v': return '\v';
                case '0': return '\0';
                case "'": return "'";
                case '"': return '"';
                case '\\': return '\\';
                case 'x': return String.fromCharCode(parseInt(seq.slice(1), 16));
                case 'u': return String.fromCharCode(parseInt(seq.slice(1), 16));
                case 'U': return String.fromCodePoint(parseInt(seq.slice(1), 16));
                default: return match;
            }
        });
    },

    /**
     * 去除常见前缀
     * 0x, \x, 0b 等
     */
    removeCommonPrefixes(str) {
        // 检测是否是 0x 分隔的 hex 格式: 0x41 0x42 0x43
        if (/^(0x[0-9A-Fa-f]{1,2}[\s,;]+)+0x[0-9A-Fa-f]{1,2}$/i.test(str.trim())) {
            return str.replace(/0x/gi, '').replace(/[\s,;]+/g, '');
        }

        // 检测 \x 格式: \x41\x42\x43
        if (/^(\\x[0-9A-Fa-f]{2})+$/i.test(str.trim())) {
            return str.replace(/\\x/gi, '');
        }

        return str;
    },

    /**
     * 清理空白字符
     * 去除首尾空白，可选去除中间多余空白
     */
    trimWhitespace(str) {
        return str.trim();
    },

    /**
     * 去除包裹的引号或括号
     */
    stripQuotes(str) {
        str = str.trim();
        // 匹配成对的引号
        if ((str.startsWith('"') && str.endsWith('"')) ||
            (str.startsWith("'") && str.endsWith("'")) ||
            (str.startsWith('`') && str.endsWith('`'))) {
            return str.slice(1, -1);
        }
        // 匹配成对的括号（常见于某些编码输出）
        if ((str.startsWith('[') && str.endsWith(']')) ||
            (str.startsWith('(') && str.endsWith(')'))) {
            // 只在内容看起来像编码数据时去除
            const inner = str.slice(1, -1);
            if (/^[0-9A-Fa-f\s,;x\\]+$/.test(inner)) {
                return inner;
            }
        }
        return str;
    },

    /**
     * 检测输入是否需要预处理
     * 返回需要处理的项目列表
     */
    detect(str) {
        const issues = [];

        if (/%[0-9A-Fa-f]{2}/.test(str)) {
            issues.push({ type: 'url_encoded', desc: '检测到 URL 编码' });
        }
        if (/\\[nrtbfv0'"\\xuU]/.test(str)) {
            issues.push({ type: 'escaped', desc: '检测到转义字符' });
        }
        if (/^(0x[0-9A-Fa-f]{1,2}[\s,;]*)+$/i.test(str.trim())) {
            issues.push({ type: 'hex_prefix', desc: '检测到 0x 前缀' });
        }
        if (/^(\\x[0-9A-Fa-f]{2})+$/i.test(str.trim())) {
            issues.push({ type: 'hex_escape', desc: '检测到 \\x 转义' });
        }
        if ((str.startsWith('"') && str.endsWith('"')) ||
            (str.startsWith("'") && str.endsWith("'"))) {
            issues.push({ type: 'quoted', desc: '检测到引号包裹' });
        }

        return issues;
    }
};

// Export for global usage
window.Preprocessor = Preprocessor;
