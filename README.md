# Eva Font Registry

Eva Inc. 的字体资产登记与受控发布项目。它把“管理字体”和“发布字体”拆成两个边界：原始字体只归档到私有 COS，开源仓库只保存代码、清单格式与审批规则；只有明确获得 Web/小程序再分发授权的精确文件哈希，才会生成 WOFF2、CSS 和公开清单。

## 为什么是 FontTools + FontBakery

[FontBase](https://fontba.se/) 与 [font-manager](https://github.com/FontManager/font-manager) 适合人在桌面上预览、启用和整理本机字体，但它们不负责可审计的 Webfont 构建与 CI 质量门禁。本项目需要可复现地读取 metadata、按字符子集、转换 WOFF2、按 SHA-256 审批并自动生成机器清单，因此选择：

- **FontTools**：解析 OpenType/TTC，执行 subset 与 WOFF2 构建。
- **FontBakery**：在发布前对已批准的源字体执行质量检查。
- **Web 管理端**：提供 Eva ID 登录、审批状态与发布审计；它不替代桌面字体管理器。

## 安全模型

```text
iCloud Fonts ──sync──> COS raw/* (private)
                          │
                     scan + SHA-256
                          │
                human license approval
                          │
             FontBakery ──> FontTools WOFF2/subset
                          │
                 COS public/* (public read only)
                          │
                 CSS + JSON manifest
```

- bucket 本身保持 private；只给 `public/*` 对象前缀添加匿名 `GetObject` 权限。
- `raw/*`、私有 inventory、字体二进制和真实审批记录都被 `.gitignore` 排除。
- name table 中的 license 字段只作为**提示**，永远不会自动批准发布。
- 审批以源文件 SHA-256 为准；文件变化后必须重新审核。
- 当前管理端只允许 `wxd`（owner）与 `lyn`（editor），复用 `design.evainc.cn` 的 Eva ID 手机验证码验证，再建立本站独立的 12 小时会话。

## 本地使用

Python 流水线推荐使用 [uv](https://docs.astral.sh/uv/)：

```bash
uv sync

# 输出文件包含私有目录和 license metadata，必须留在 private/ 或仓库外
uv run eva-font scan "/path/to/iCloud/Fonts" \
  --output private/inventory.json \
  --raw-prefix raw/icloud-fonts

# 复制样例后逐个填入精确 SHA、授权依据和审核人
cp config/approvals.example.json private/approvals.json

# 只检查 approved=true 的源字体
uv run eva-font quality "/path/to/iCloud/Fonts" \
  --inventory private/inventory.json \
  --approvals private/approvals.json

# 构建 WOFF2，并同时生成 fonts.css 与 font-manifest.json
uv run eva-font build "/path/to/iCloud/Fonts" \
  --inventory private/inventory.json \
  --approvals private/approvals.json \
  --output dist-public \
  --base-url https://font.evainc.cn/public

# 审批、FontBakery 和构建全部通过后，才执行公开上传
./scripts/publish-cos.sh dist-public
```

传入 `--text-file config/subset-*.txt` 可构建指定字符集；不传时保留完整字符集，仅转换 WOFF2。

Web 管理端：

```bash
npm install
npm run dev
npm run build
```

Cloudflare/Sites 环境变量：

| 变量 | 用途 | 默认值 |
| --- | --- | --- |
| `EVA_AUTH_BASE_URL` | Eva ID 服务地址 | `https://design.evainc.cn` |
| `EVA_OTP_APPLICATION` | 发送验证码时的 application | `penpot` |
| `EVA_WXD_PHONE_SHA256` | 可选：允许用 wxd 的手机号直接输入登录 | 未设置 |
| `EVA_LYN_PHONE_SHA256` | 可选：允许用 lyn 的手机号直接输入登录 | 未设置 |

不设置手机号哈希时仍可用 `wxd` / `lyn` 作为 Eva ID 登录，验证码会发送到各自当前绑定手机。

## 消费方式

正式批准字体后，Web 与微信小程序都只引用公开产物：

```css
@import url("https://font.evainc.cn/fonts.css");
```

```js
const manifestUrl = "https://font.evainc.cn/font-manifest.json";
```

`font.evainc.cn/public/*` 由站点以同域只读方式代理 COS 的 `public/*`；它不会转发到 `raw/*`，因此 Web 和小程序只需配置一个业务域名。

公开清单现在刻意为空；在没有完成授权复核前，不会把任何现有字体二进制放入 `public/*`。

## License

项目代码使用 [MIT License](./LICENSE)。此许可**不覆盖**被管理的任何字体文件；每个字体继续受其自身许可约束。
