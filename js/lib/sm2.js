/**
 * CryptoBox - SM2 国密非对称加密
 * 支持：加解密、签名/验签、密钥对生成
 */

const SM2Tools = {
    sm2: {
        id: 'sm2',
        name: 'SM2 加解密',
        category: 'cipher',
        description: '国密 SM2 非对称加密（椭圆曲线），支持加解密/签名/验签/密钥对生成',
        autoDetectable: false,
        options: [
            {
                id: 'operation', label: '操作', type: 'select',
                values: [
                    { value: 'encrypt', label: '加密 (公钥)' },
                    { value: 'decrypt', label: '解密 (私钥)' },
                    { value: 'sign', label: '签名 (私钥)' },
                    { value: 'verify', label: '验签 (公钥)' },
                    { value: 'genkey', label: '生成密钥对' },
                ],
                default: 'encrypt'
            },
            {
                id: 'cipherMode', label: '密文格式', type: 'select',
                values: [
                    { value: '1', label: 'C1C3C2 (新标准)' },
                    { value: '0', label: 'C1C2C3 (旧标准)' },
                ],
                default: '1'
            },
            {
                id: 'key', label: '公钥/私钥', type: 'text',
                placeholder: '加密/验签填公钥，解密/签名填私钥',
                default: ''
            },
            {
                id: 'signature', label: '签名值 (验签时填)', type: 'text',
                placeholder: '验签时填入签名 Hex',
                default: ''
            },
        ],
        encode(input, opts = {}) {
            if (typeof sm2 === 'undefined') {
                return { error: 'SM2 库未加载，请检查网络连接' };
            }

            const operation = opts.operation || 'encrypt';
            const cipherMode = parseInt(opts.cipherMode || '1');

            try {
                switch (operation) {
                    case 'encrypt': {
                        if (!opts.key) return { error: '请输入公钥 (Hex)' };
                        let publicKey = opts.key.trim();
                        // 确保公钥有 04 前缀
                        if (publicKey.length === 128) publicKey = '04' + publicKey;
                        const encrypted = sm2.doEncrypt(input, publicKey, cipherMode);
                        return { output: encrypted };
                    }
                    case 'decrypt': {
                        if (!opts.key) return { error: '请输入私钥 (Hex)' };
                        const privateKey = opts.key.trim();
                        // 清理密文
                        let ciphertext = input.trim().replace(/\s/g, '');
                        // 去除可能的 04 前缀
                        if (ciphertext.startsWith('04')) {
                            ciphertext = ciphertext.substring(2);
                        }
                        const decrypted = sm2.doDecrypt(ciphertext, privateKey, cipherMode);
                        if (!decrypted) {
                            return { error: '解密失败：可能是私钥错误或密文格式不匹配' };
                        }
                        return { output: decrypted };
                    }
                    case 'sign': {
                        if (!opts.key) return { error: '请输入私钥 (Hex)' };
                        const privateKey = opts.key.trim();
                        const signature = sm2.doSignature(input, privateKey, {
                            hash: true,
                        });
                        return { output: signature };
                    }
                    case 'verify': {
                        if (!opts.key) return { error: '请输入公钥 (Hex)' };
                        if (!opts.signature) return { error: '请输入签名值 (Hex)' };
                        let publicKey = opts.key.trim();
                        if (publicKey.length === 128) publicKey = '04' + publicKey;
                        const sig = opts.signature.trim();
                        const valid = sm2.doVerifySignature(input, sig, publicKey, {
                            hash: true,
                        });
                        return { output: valid ? '验签成功: 签名有效' : '验签失败: 签名无效' };
                    }
                    case 'genkey': {
                        const keypair = sm2.generateKeyPairHex();
                        const result = [
                            '=== SM2 密钥对 ===',
                            '',
                            '私钥 (Private Key):',
                            keypair.privateKey,
                            '',
                            '公钥 (Public Key):',
                            keypair.publicKey,
                            '',
                            '注意: 请妥善保管私钥，不要泄露！',
                        ];
                        return { output: result.join('\n') };
                    }
                    default:
                        return { error: '未知操作' };
                }
            } catch (e) {
                return { error: `SM2 操作失败: ${e.message}` };
            }
        },
        decode(input, opts = {}) {
            // decode 就是解密操作
            opts.operation = 'decrypt';
            return this.encode(input, opts);
        }
    }
};

// Export
window.SM2Tools = SM2Tools;
