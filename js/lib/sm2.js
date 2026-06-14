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
                    { value: 'encrypt', label: '加密 (用公钥)' },
                    { value: 'decrypt', label: '解密 (用私钥)' },
                    { value: 'sign', label: '签名 (用私钥)' },
                    { value: 'verify', label: '验签 (用公钥)' },
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
                id: 'publicKey', label: '公钥 (Hex，加密/验签)', type: 'text',
                placeholder: '04 开头的 Hex 公钥 (130字符)',
                default: ''
            },
            {
                id: 'privateKey', label: '私钥 (Hex，解密/签名)', type: 'text',
                placeholder: '64字符 Hex 私钥',
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
                        let pubKey = (opts.publicKey || '').trim();
                        if (!pubKey) return { error: '请输入公钥（公钥框）' };
                        if (pubKey.length === 128) pubKey = '04' + pubKey;
                        const encrypted = sm2.doEncrypt(input, pubKey, cipherMode);
                        return { output: encrypted };
                    }
                    case 'decrypt': {
                        const priKey = (opts.privateKey || '').trim();
                        if (!priKey) return { error: '请输入私钥（私钥框）' };
                        let ciphertext = input.trim().replace(/\s/g, '');
                        if (ciphertext.startsWith('04')) ciphertext = ciphertext.substring(2);
                        const decrypted = sm2.doDecrypt(ciphertext, priKey, cipherMode);
                        if (!decrypted) return { error: '解密失败：私钥错误或密文格式不匹配' };
                        return { output: decrypted };
                    }
                    case 'sign': {
                        const priKey = (opts.privateKey || '').trim();
                        if (!priKey) return { error: '请输入私钥（私钥框）' };
                        const signature = sm2.doSignature(input, priKey, { hash: true });
                        return { output: signature };
                    }
                    case 'verify': {
                        let pubKey = (opts.publicKey || '').trim();
                        if (!pubKey) return { error: '请输入公钥（公钥框）' };
                        if (!opts.signature) return { error: '请输入签名值' };
                        if (pubKey.length === 128) pubKey = '04' + pubKey;
                        const valid = sm2.doVerifySignature(input, opts.signature.trim(), pubKey, { hash: true });
                        return { output: valid ? '验签成功: 签名有效' : '验签失败: 签名无效' };
                    }
                    case 'genkey': {
                        const keypair = sm2.generateKeyPairHex();
                        return {
                            output: keypair.publicKey + '\n' + keypair.privateKey,
                            info: '已生成密钥对，第一行是公钥，第二行是私钥，请分别粘贴到对应框中'
                        };
                    }
                    default:
                        return { error: '未知操作' };
                }
            } catch (e) {
                return { error: `SM2 操作失败: ${e.message}` };
            }
        },
        decode(input, opts = {}) {
            opts.operation = 'decrypt';
            return this.encode(input, opts);
        }
    }
};

window.SM2Tools = SM2Tools;
