/**
 * CryptoBox - RSA 非对称加密
 * 支持：加解密、密钥对生成
 * 依赖：JSEncrypt 库
 */

const RSATools = {
    /**
     * PEM 密钥自动格式化
     * 支持：自动补全头尾、清理空格换行、64 字符换行、自动识别公钥/私钥、检测密钥长度
     * @returns {{ key: string, type: string, size: number|null, changed: boolean }}
     */
    normalizePemKey(input) {
        const fail = (key) => ({ key, type: '', size: null, changed: false });
        if (!input || typeof input !== 'string') return fail(input);
        const original = input;
        let raw = input.trim();

        // 1. 尝试提取已有的 PEM 头尾
        const pemHeaderMatch = raw.match(/-----BEGIN\s+(.+?)-----/);
        const pemFooterMatch = raw.match(/-----END\s+(.+?)-----/);

        let keyType = '';

        if (pemHeaderMatch && pemFooterMatch) {
            keyType = pemHeaderMatch[1].trim();
            const headerEnd = raw.indexOf('-----', raw.indexOf('-----BEGIN'));
            const footerStart = raw.lastIndexOf('-----');
            raw = raw.substring(headerEnd, footerStart);
        } else if (pemHeaderMatch) {
            keyType = pemHeaderMatch[1].trim();
            const headerEnd = raw.indexOf('-----', raw.indexOf('-----BEGIN'));
            raw = raw.substring(headerEnd);
        } else if (pemFooterMatch) {
            keyType = pemFooterMatch[1].trim();
            const footerStart = raw.lastIndexOf('-----');
            raw = raw.substring(0, footerStart);
        } else {
            const cleaned = raw.replace(/\s+/g, '');
            if (!/^[A-Za-z0-9+/=]+$/.test(cleaned)) {
                return fail(original);
            }
            if (typeof JSEncrypt !== 'undefined') {
                const testPub = new JSEncrypt();
                testPub.setPublicKey(cleaned);
                if (testPub.getPublicKey()) {
                    keyType = 'PUBLIC KEY';
                } else {
                    const testPriv = new JSEncrypt();
                    testPriv.setPrivateKey(cleaned);
                    if (testPriv.getPrivateKey()) {
                        keyType = 'RSA PRIVATE KEY';
                    }
                }
            }
            if (!keyType) {
                keyType = cleaned.length > 300 ? 'RSA PRIVATE KEY' : 'PUBLIC KEY';
            }
            raw = cleaned;
        }

        // 2. 清理 base64 内容
        let base64Content = raw.replace(/\s+/g, '');
        if (!/^[A-Za-z0-9+/=]+$/.test(base64Content)) {
            return fail(original);
        }

        // 3. 每 64 字符换行
        const lines = [];
        for (let i = 0; i < base64Content.length; i += 64) {
            lines.push(base64Content.substring(i, i + 64));
        }
        const formatted = `-----BEGIN ${keyType}-----\n${lines.join('\n')}\n-----END ${keyType}-----`;

        // 4. 检测密钥实际 bit 长度
        let keySize = null;
        if (typeof JSEncrypt !== 'undefined') {
            try {
                const crypt = new JSEncrypt();
                if (keyType.includes('PRIVATE')) {
                    crypt.setPrivateKey(formatted);
                } else {
                    crypt.setPublicKey(formatted);
                }
                const keyObj = crypt.getKey();
                if (keyObj && keyObj.n) {
                    keySize = keyObj.n.bitLength();
                }
            } catch (e) {
                // 检测失败不影响格式化结果
            }
        }

        return {
            key: formatted,
            type: keyType,
            size: keySize,
            changed: formatted !== original
        };
    },

    rsa: {
        id: 'rsa',
        name: 'RSA 加解密',
        category: 'cipher',
        description: 'RSA 非对称加密，支持公钥加密/私钥解密/密钥对生成',
        autoDetectable: false,
        options: [
            {
                id: 'operation', label: '操作', type: 'select',
                values: [
                    { value: 'encrypt', label: '加密 (公钥)' },
                    { value: 'decrypt', label: '解密 (私钥)' },
                    { value: 'genkey', label: '生成密钥对' },
                ],
                default: 'encrypt'
            },
            {
                id: 'keySize', label: '密钥长度 (生成时)', type: 'select',
                values: [
                    { value: '1024', label: '1024 bit' },
                    { value: '2048', label: '2048 bit (推荐)' },
                    { value: '4096', label: '4096 bit (较慢)' },
                ],
                default: '2048'
            },
            {
                id: 'key', label: '公钥/私钥 (PEM格式)', type: 'textarea',
                placeholder: '粘贴 PEM 格式密钥\n-----BEGIN PUBLIC KEY-----\nMIIBIjANBg...\n-----END PUBLIC KEY-----',
                default: ''
            },
        ],
        encode(input, opts = {}) {
            if (typeof JSEncrypt === 'undefined') {
                return { error: 'JSEncrypt 库未加载，请检查网络连接' };
            }

            const operation = opts.operation || 'encrypt';

            try {
                switch (operation) {
                    case 'encrypt': {
                        if (!opts.key) return { error: '请输入公钥 (PEM 格式)' };
                        const { key: pubKey } = RSATools.normalizePemKey(opts.key);
                        const encrypt = new JSEncrypt();
                        encrypt.setPublicKey(pubKey);
                        const encrypted = encrypt.encrypt(input);
                        if (!encrypted) {
                            return { error: '加密失败：公钥格式错误或明文过长（RSA 加密长度受限于密钥长度）' };
                        }
                        return { output: encrypted };
                    }
                    case 'decrypt': {
                        if (!opts.key) return { error: '请输入私钥 (PEM 格式)' };
                        const { key: privKey } = RSATools.normalizePemKey(opts.key);
                        const decrypt = new JSEncrypt();
                        decrypt.setPrivateKey(privKey);
                        const ciphertext = input.trim().replace(/\s/g, '');
                        const decrypted = decrypt.decrypt(ciphertext);
                        if (!decrypted && decrypted !== '') {
                            return { error: '解密失败：可能是私钥错误或密文格式不匹配' };
                        }
                        return { output: decrypted };
                    }
                    case 'genkey': {
                        const keySize = parseInt(opts.keySize || '2048');
                        const crypt = new JSEncrypt({ default_key_size: keySize });
                        crypt.getKey();
                        const privateKey = crypt.getPrivateKey();
                        const publicKey = crypt.getPublicKey();
                        const result = [
                            `=== RSA ${keySize} bit 密钥对 ===`,
                            '',
                            '公钥 (Public Key):',
                            publicKey,
                            '',
                            '私钥 (Private Key):',
                            privateKey,
                            '',
                            '注意: 请妥善保管私钥，不要泄露！',
                        ];
                        return {
                            output: result.join('\n'),
                            info: `已生成 ${keySize} bit RSA 密钥对`
                        };
                    }
                    default:
                        return { error: '未知操作' };
                }
            } catch (e) {
                return { error: `RSA 操作失败: ${e.message}` };
            }
        },
        decode(input, opts = {}) {
            opts.operation = 'decrypt';
            return this.encode(input, opts);
        }
    }
};

// Export
window.RSATools = RSATools;
