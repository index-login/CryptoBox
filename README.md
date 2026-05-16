# CryptoBox - 在线加解密工具箱

> 纯前端加解密工具集合，所有数据本地处理，不上传服务器。面向网络安全从业者、CTF 选手、渗透测试人员和开发者。

**在线使用：** [https://index-login.github.io/CryptoBox/](https://index-login.github.io/CryptoBox/)

## 特性

- **纯前端运行** - 所有加解密、编解码、哈希计算均在浏览器本地完成，数据不会发送到任何服务器
- **智能识别** - 自动检测输入是明文还是密文，自动选择编码/解码方向
- **智能预处理** - 自动清理 URL 编码、转义字符、多余空白等干扰
- **密钥自动补位** - 密钥/IV 长度不足自动补 0，超出自动截断，并给出提示
- **批量处理** - 支持多行文本逐行处理
- **暗色主题** - 专为安全工具设计的深色 UI
- **零依赖部署** - 纯静态文件，无需构建，GitHub Pages 直接托管

## 支持的工具

### 编码/解码
| 工具 | 说明 |
|------|------|
| Base64 | 标准 / URL-safe Base64 |
| Base32 | RFC 4648 标准 |
| Hex (Base16) | 多种分隔格式 (空格/冒号/0x/\x) |
| URL 编解码 | encodeURIComponent / encodeURI / 全编码 |
| HTML 实体 | 命名实体 / 十进制 / 十六进制 |
| Unicode | \uXXXX / \UXXXXXXXX / U+XXXX / CSS |
| 进制转换 | 二进制 / 八进制 / 十进制 / 十六进制互转 |

### 对称加密
| 工具 | 说明 |
|------|------|
| AES | 128/192/256 位，CBC/ECB/CTR/CFB/OFB 模式 |
| DES | 64 位密钥 |
| 3DES (Triple DES) | 112/168 位密钥，EDE2/EDE3 |
| SM4 | 国密对称加密，ECB/CBC 模式 |
| RC4 | 流密码 |
| Rabbit | 流密码 |

### 古典密码
| 工具 | 说明 |
|------|------|
| Caesar (凯撒) | 支持暴力破解所有 26 种偏移 |
| ROT13 | 字母旋转 13 位 |
| Atbash | 字母表反转 |
| Vigenere (维吉尼亚) | 关键词多表替换 |
| Affine (仿射) | E(x) = (ax + b) mod 26 |
| Rail Fence (栅栏) | N 行 zigzag |
| Bacon (培根) | 5 位 A/B 序列 |
| XOR | 循环异或，支持多种输入输出格式 |

### 哈希计算
| 工具 | 说明 |
|------|------|
| MD5 | 128 位 |
| SHA-1 | 160 位 |
| SHA-256 / SHA-512 | SHA-2 系列 |
| SHA-3 | Keccak (224/256/384/512) |
| HMAC | 支持 MD5/SHA1/SHA256/SHA512 |
| CRC32 | 循环冗余校验 |
| RIPEMD-160 | 160 位 |
| NTLM | Windows 密码哈希 |
| 多重哈希 | 一次计算所有常用哈希 |

### Padding 支持
PKCS7 / Zero Padding / No Padding / ISO 10126 / ANSI X9.23

### 密钥格式
UTF-8 文本 / Hex / Base64 三种格式自由切换

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl + K` | 搜索工具 |
| `Ctrl + Enter` | 执行 |
| `Ctrl + L` | 清空 |

## 本地运行

```bash
# 克隆仓库
git clone https://github.com/index-login/CryptoBox.git

# 启动本地服务器（任选一种）
cd CryptoBox
python -m http.server 8080
# 或
npx serve .

# 浏览器访问
open http://localhost:8080
```

也可以直接双击 `index.html` 打开使用。

## 技术栈

- 纯 HTML + CSS + JavaScript（无框架、无构建）
- [Tailwind CSS](https://tailwindcss.com/) (CDN)
- [CryptoJS](https://github.com/brix/crypto-js) - AES/DES/3DES/RC4/Rabbit/Hash
- [sm-crypto](https://github.com/nicehash/sm-crypto) - SM4 国密算法
- GitHub Pages 部署

## 安全说明

- 所有计算在浏览器端完成，不发送任何数据到服务器
- 不使用 Cookie、不追踪用户
- 无第三方分析脚本
- 源代码完全开放，可自行审计

## 路线图

- [x] 编码/解码工具 (Base64, URL, Hex, Unicode, HTML Entity, Base32, 进制转换)
- [x] 哈希计算 (MD5, SHA 全系列, HMAC, CRC32, NTLM)
- [x] 对称加密 (AES, DES, 3DES, SM4, RC4, Rabbit)
- [x] 古典密码 (Caesar, Vigenere, ROT13, Atbash, Affine, Rail Fence, Bacon, XOR)
- [x] 智能输入预处理 & 自动识别
- [ ] SM2 非对称加密 / SM3 哈希
- [ ] RSA 加解密
- [ ] JWT 解析
- [ ] 时间戳转换 / UUID 生成 / 随机密码生成
- [ ] 流水线/链式处理 (Recipe)
- [ ] 操作历史记录
- [ ] URL 分享功能
- [ ] 离线支持 (PWA)

## License

MIT

---

**关键词：** 在线加密解密工具, AES加密, DES加密, 3DES, SM4国密, Base64编解码, MD5, SHA256, 哈希计算, CTF工具, 网络安全工具, 密码学工具, 在线编码解码, XOR加密, 凯撒密码, 栅栏密码, CryptoBox, crypto tool online, encryption decryption tool, cybersecurity tools
