# 安全策略 / Security Policy

请通过本仓库或 [PixivDownloader 主仓库](https://github.com/Sywyar/PixivDownloader/security/advisories/new) 的 GitHub Private Vulnerability Reporting 私下报告以下问题：

- SDK Release、签名、摘要、Maven 坐标或源码提交追溯不一致；
- Pages 构建或 Release 输入校验可被绕过；
- 插件稳定契约导致越权、凭据泄露、路径逃逸或生命周期隔离失效；
- 发布 token、PGP 私钥或其它敏感材料泄露。

报告中请包含受影响版本、复现步骤、可观察影响和已知缓解措施。不要在公开 Issue 中粘贴密钥、token、未公开漏洞细节或恶意发行附件。

Security fixes target the maintained stable SDK line and, when applicable, the current preview line. Before the first public SDK Release, reports should identify the affected source commit instead of inventing a version number.
