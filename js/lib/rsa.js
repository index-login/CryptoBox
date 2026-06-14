/**
 * CryptoBox - RSA 非对称加密
 * 支持：加解密、密钥对生成
 * 依赖：JSEncrypt 库
 */

const RSATools = {
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
                        const encrypt = new JSEncrypt();
                        encrypt.setPublicKey(opts.key);
                        const encrypted = encrypt.encrypt(input);
                        if (!encrypted) {
                            return { error: '加密失败：公钥格式错误或明文过长（RSA 加密长度受限于密钥长度）' };
                        }
                        return { output: encrypted };
                    }
                    case 'decrypt': {
                        if (!opts.key) return { error: '请输入私钥 (PEM 格式)' };
                        const decrypt = new JSEncrypt();
                        decrypt.setPrivateKey(opts.key);
                        // 清理密文
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
