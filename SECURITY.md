# 安全策略 / Security Policy

请通过本仓库的 GitHub Private Vulnerability Reporting，或 [PixivDownloader 主仓库私密安全报告入口](https://github.com/Sywyar/PixivDownloader/security/advisories/new) 私下报告安全问题，切勿在公开 Issue 或 PR 中披露未修复的漏洞细节、密钥、令牌或恶意附件。

## 报告范围与所需信息

- SDK Release、OpenPGP 签名、SHA-256 摘要、Maven Central 坐标与源码提交追溯不一致；
- Pages 站点生成或 Release 输入校验可被绕过；
- 插件公共契约导致越权访问、凭据泄露、路径逃逸或 worker / 生命周期隔离失效；
- 发布令牌、签名私钥、PGP 私钥或其它敏感凭据泄露。

报告请包含受影响的 SDK 版本（尚无对应发行版时填写精确源码 commit SHA）、复现步骤、实际影响范围与已知缓解措施。安全修复面向当前维护的稳定 SDK 分支及受影响的预发布分支。

## Reporting in English

Report vulnerabilities privately through this repository's GitHub Private Vulnerability Reporting or the [PixivDownloader main repository advisory form](https://github.com/Sywyar/PixivDownloader/security/advisories/new). Do not post secrets, tokens, undisclosed exploit details, or malicious artifacts in public Issues or PRs.

Include the affected SDK version (or exact source commit SHA for unreleased code), reproduction steps, observable impact, and known mitigations. Security fixes target the maintained stable SDK line and, where affected, the current preview line.
