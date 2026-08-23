# Contributing

提交代码前请运行 `npm run lint && npm run build`。涉及字体发布的变更还必须遵守以下规则：

1. 不提交字体二进制、私有 inventory、手机号、验证码、COS 凭证或真实审批记录。
2. 不把 name table 中的 license 文本当作最终授权结论。
3. 发布审批必须记录精确 SHA-256、license ID、可核验的 evidence、审核人与时间。
4. 先运行 FontBakery，再用 FontTools 生成 WOFF2；任何失败都不得进入 `public/*`。
5. CSS 与 manifest 必须由工具生成，避免手工地址与实际对象不一致。
