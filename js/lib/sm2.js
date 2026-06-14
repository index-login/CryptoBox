/**
 * CryptoBox - SM2 国密非对称加密
 * 支持：加解密、签名/验签、密钥对生成、PEM/Hex 格式互转
 */

const SM2Tools = {

    // ==================== ASN.1 DER 编解码 ====================

    _berToHex(buf) {
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    },
    _hexToBytes(hex) {
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
        return bytes;
    },

    _asn1Parse(buf, off) {
        off = off || 0;
        const tag = buf[off];
        let pos = off + 1;
        let len = buf[pos++];
        if (len & 0x80) {
            const n = len & 0x7f;
            len = 0;
            for (let i = 0; i < n; i++) len = (len << 8) | buf[pos++];
        }
        return { tag, length: len, headerLen: pos - off, valueOffset: pos, value: buf.slice(pos, pos + len) };
    },

    _asn1EncodeSequence(content) {
        const len = content.length;
        if (len < 128) return new Uint8Array([0x30, len, ...content]);
        if (len < 256) return new Uint8Array([0x30, 0x81, len, ...content]);
        return new Uint8Array([0x30, 0x82, (len >> 8) & 0xff, len & 0xff, ...content]);
    },
    _asn1EncodeOid(oid) {
        const parts = oid.split('.').map(Number);
        const body = [parts[0] * 40 + parts[1]];
        for (let i = 2; i < parts.length; i++) {
            let v = parts[i], bytes = [];
            if (v < 128) { bytes = [v]; }
            else {
                bytes = [v & 0x7f];
                v >>= 7;
                while (v > 0) { bytes.push((v & 0x7f) | 0x80); v >>= 7; }
                bytes.reverse();
            }
            body.push(...bytes);
        }
        return new Uint8Array([0x06, body.length, ...body]);
    },
    _asn1EncodeBitString(data) {
        return new Uint8Array([0x03, data.length + 1, 0x00, ...data]);
    },
    _asn1EncodeOctetString(data) {
        const len = data.length;
        if (len < 128) return new Uint8Array([0x04, len, ...data]);
        if (len < 256) return new Uint8Array([0x04, 0x81, len, ...data]);
        return new Uint8Array([0x04, 0x82, (len >> 8) & 0xff, len & 0xff, ...data]);
    },
    _asn1EncodeInteger(data) {
        const needPad = data[0] & 0x80;
        const content = needPad ? new Uint8Array([0x00, ...data]) : data;
        const len = content.length;
        if (len < 128) return new Uint8Array([0x02, len, ...content]);
        return new Uint8Array([0x02, 0x81, len, ...content]);
    },

    // SM2 curve OID: 1.2.156.10197.1.301
    _sm2Oid() { return this._asn1EncodeOid('1.2.156.10197.1.301'); },
    // ecPublicKey OID: 1.2.840.10045.2.1
    _ecOid() { return this._asn1EncodeOid('1.2.840.10045.2.1'); },

    // ==================== PEM ↔ Hex ====================

    hexToSm2PublicPem(hex) {
        const raw = hex.replace(/^04/i, '');
        const pointBytes = this._hexToBytes('04' + raw);
        const algSeq = this._asn1EncodeSequence(new Uint8Array([...this._ecOid(), ...this._sm2Oid()]));
        const spki = this._asn1EncodeSequence(new Uint8Array([...algSeq, ...this._asn1EncodeBitString(pointBytes)]));
        return '-----BEGIN PUBLIC KEY-----\n' + btoa(String.fromCharCode(...spki)).replace(/.{64}/g, '$&\n') + '\n-----END PUBLIC KEY-----';
    },

    hexToSm2PrivatePem(hex) {
        const privBytes = this._hexToBytes(hex);
        const octet = this._asn1EncodeOctetString(privBytes);
        // context [1] explicit: curve OID
        const curveTag = new Uint8Array([...this._sm2Oid()]);
        const ctx1 = new Uint8Array([0xa1, curveTag.length, ...curveTag]);
        const ecPriv = this._asn1EncodeSequence(new Uint8Array([0x02, 0x01, 0x01, ...octet, ...ctx1]));
        const algSeq = this._asn1EncodeSequence(new Uint8Array([...this._ecOid(), ...this._sm2Oid()]));
        const pkcs8 = this._asn1EncodeSequence(new Uint8Array([0x02, 0x01, 0x00, ...algSeq, ...this._asn1EncodeOctetString(ecPriv)]));
        return '-----BEGIN PRIVATE KEY-----\n' + btoa(String.fromCharCode(...pkcs8)).replace(/.{64}/g, '$&\n') + '\n-----END PRIVATE KEY-----';
    },

    pemToHex(pem) {
        const b64 = pem.replace(/-----.*?-----/g, '').replace(/\s+/g, '');
        const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
        const top = this._asn1Parse(bytes, 0);

        // Detect PKCS#8 private key (outer SEQUENCE first child = INTEGER version 0)
        const firstChild = this._asn1Parse(bytes, top.valueOffset);
        if (firstChild.tag === 0x02 && firstChild.length === 1 && firstChild.value[0] === 0) {
            // PKCS#8: version, algId, privateKey OCTET STRING
            const algIdOff = firstChild.valueOffset + firstChild.length;
            const algId = this._asn1Parse(bytes, algIdOff);
            const privOctOff = algIdOff + algId.headerLen + algId.length;
            const privOct = this._asn1Parse(bytes, privOctOff);
            // Inside OCTET STRING: ECPrivateKey SEQUENCE
            const ecPriv = this._asn1Parse(bytes, privOct.valueOffset);
            const ecVersion = this._asn1Parse(bytes, ecPriv.valueOffset);
            const privKeyOff = ecVersion.valueOffset + ecVersion.length;
            const privKey = this._asn1Parse(bytes, privKeyOff);
            return { hex: this._berToHex(privKey.value), type: 'private' };
        }

        // SubjectPublicKeyInfo
        const algId = this._asn1Parse(bytes, top.valueOffset);
        const bitOff = algId.valueOffset + algId.length;
        const bitStr = this._asn1Parse(bytes, bitOff);
        const pointHex = this._berToHex(bitStr.value.subarray(1));
        return { hex: pointHex.toLowerCase(), type: 'public' };
    },

    // ==================== 密钥格式化 ====================

    normalizeSm2Key(input) {
        const fail = (key) => ({ key, type: '', changed: false, addedPrefix: false, fromPem: false });
        if (!input || typeof input !== 'string') return fail(input);
        const original = input;
        let addedPrefix = false, fromPem = false;

        // 检测 PEM 格式
        if (/-----BEGIN\s+(PUBLIC KEY|PRIVATE KEY|EC PRIVATE KEY)-----/i.test(original)) {
            try {
                const result = this.pemToHex(original);
                fromPem = true;
                return { key: result.hex, type: result.type, changed: true, addedPrefix: false, fromPem: true };
            } catch (e) {
                return fail(original);
            }
        }

        // Hex 格式处理
        let raw = input.trim().replace(/\s+/g, '');
        if (/^(0x[0-9A-Fa-f]{1,2}[\s,;]*)+$/i.test(raw)) {
            raw = raw.replace(/0x/gi, '').replace(/[\s,;]+/g, '');
        } else {
            raw = raw.replace(/^0x/i, '');
        }

        if (!/^[0-9A-Fa-f]+$/.test(raw)) {
            return fail(original);
        }

        let keyType = '';
        if (raw.length === 128) {
            raw = '04' + raw;
            keyType = 'public';
            addedPrefix = true;
        } else if (raw.length === 130 && raw.startsWith('04')) {
            keyType = 'public';
        } else if (raw.length === 64) {
            keyType = 'private';
        } else if (raw.length > 130) {
            return { key: original, type: '', changed: false, addedPrefix: false, fromPem: false };
        } else {
            keyType = raw.length > 64 ? 'public' : 'private';
        }

        raw = raw.toLowerCase();

        const changed = raw !== original.trim().replace(/\s+/g, '').replace(/^0x/i, '').toLowerCase();
        return {
            key: raw,
            type: keyType,
            changed: changed || (original.includes(' ') || original.includes('\n')),
            addedPrefix,
            fromPem
        };
    },

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
                id: 'keyFormat', label: '密钥格式', type: 'select',
                values: [
                    { value: 'auto', label: '自动识别' },
                    { value: 'hex', label: 'Hex' },
                    { value: 'pem', label: 'PEM' },
                ],
                default: 'auto'
            },
            {
                id: 'key', label: '公钥/私钥', type: 'textarea',
                placeholder: 'Hex 或 PEM 格式均可，自动识别',
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
                        if (!opts.key) return { error: '请输入公钥 (Hex 或 PEM)' };
                        const { key: publicKey } = SM2Tools.normalizeSm2Key(opts.key);
                        const encrypted = sm2.doEncrypt(input, publicKey, cipherMode);
                        return { output: encrypted };
                    }
                    case 'decrypt': {
                        if (!opts.key) return { error: '请输入私钥 (Hex 或 PEM)' };
                        const { key: privateKey } = SM2Tools.normalizeSm2Key(opts.key);
                        let ciphertext = input.trim().replace(/\s/g, '');
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
                        if (!opts.key) return { error: '请输入私钥 (Hex 或 PEM)' };
                        const { key: signKey } = SM2Tools.normalizeSm2Key(opts.key);
                        const signature = sm2.doSignature(input, signKey, {
                            hash: true,
                        });
                        return { output: signature };
                    }
                    case 'verify': {
                        if (!opts.key) return { error: '请输入公钥 (Hex 或 PEM)' };
                        if (!opts.signature) return { error: '请输入签名值 (Hex)' };
                        const { key: verifyKey } = SM2Tools.normalizeSm2Key(opts.key);
                        const sig = opts.signature.trim();
                        const valid = sm2.doVerifySignature(input, sig, verifyKey, {
                            hash: true,
                        });
                        return { output: valid ? '验签成功: 签名有效' : '验签失败: 签名无效' };
                    }
                    case 'genkey': {
                        const keypair = sm2.generateKeyPairHex();
                        const outputFormat = opts.keyFormat || 'auto';
                        const lines = ['=== SM2 密钥对 ===', ''];
                        lines.push('私钥 (Hex):', keypair.privateKey, '');
                        lines.push('公钥 (Hex):', keypair.publicKey, '');
                        if (outputFormat === 'pem' || outputFormat === 'auto') {
                            try {
                                const privPem = SM2Tools.hexToSm2PrivatePem(keypair.privateKey);
                                const pubPem = SM2Tools.hexToSm2PublicPem(keypair.publicKey);
                                lines.push('私钥 (PEM):', privPem, '');
                                lines.push('公钥 (PEM):', pubPem, '');
                            } catch (e) { /* PEM 生成失败不影响 hex 输出 */ }
                        }
                        lines.push('注意: 请妥善保管私钥，不要泄露！');
                        return { output: lines.join('\n') };
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

// Export
window.SM2Tools = SM2Tools;
