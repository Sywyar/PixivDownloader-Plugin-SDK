# 贡献指南 / Contributing

## 选择正确的仓库

- 修改 SDK API、Maven BOM、插件模板、Javadoc 内容、版本门禁或发行打包：提交到 [Sywyar/PixivDownloader](https://github.com/Sywyar/PixivDownloader)。
- 修改本仓库的下载说明、Pages 生成器、仓库策略或安全说明：提交到本仓库。
- 不要把 API 源码、构建出的 JAR、SDK ZIP、Javadoc 站点输出或密钥提交到本仓库 `master`；发行附件由主仓库 workflow 写入 GitHub Release，Pages 由 artifact deployment 发布。

## 本地验证

本仓库生成器只使用 Node.js 标准库和 JDK `jar` 命令，不需要安装 npm 依赖：

```bash
npm test
```

Pages 生成器的输入按 Release ID 分目录保存，包含 `sdk-release.json`、`SHA256SUMS` 及生成 Javadoc 所需的 SDK ZIP；schema 1 还需历史独立 Javadoc ZIP。schema 4 的宿主运行 ZIP 只校验其元数据，不下载到站点输入。生成内容写入临时或 `target/` 目录，不提交生成站点。

## 提交与 Pull Request

1. 从最新 `master` 创建短生命周期工作分支。
2. 使用 Conventional Commits，并让一个 PR 只处理一个可独立说明的主题。
3. 运行与改动相称的测试，并在 PR 中只报告真实执行结果。
4. SDK 发布、CI 与 Pages 的 workflow 实现统一在主仓库维护；本仓库只保留事件触发、最小权限和固定到主仓库完整 commit SHA 的薄调用器。Pages 部署 job 只取得 `pages: write` 与 `id-token: write`，所有调用器都不得接收跨仓库发布 token。
5. 已发布 Tag、Release 和附件不可移动、覆盖或删除后重建；错误通过新 SDK 版本修正。

## Pages 发布验收

部署后检查公开站点的 `releases.json` 和目标 `/javadoc/sdk-api-v<version>/` 页面。若 workflow 成功但站点仍旧，比较本次 `github-pages` artifact 与公开内容，并核对部署日志中的 `pages_build_version` 是否与上次相同；同一提交的重复部署可能仍保留旧站点。保留原 Release、Tag 和附件，先定位部署问题，不重新打包 SDK。需要手动部署时，在已合入的 `master` 上运行 `pages.yml`，完成后再次核对公开内容。

## English summary

Use the main PixivDownloader repository for API, BOM, templates, Javadocs, version gates, release packaging, and reusable CI/Pages workflow implementations. This repository keeps only event-triggered thin callers pinned to a full main-repository commit SHA and grants Pages write/OIDC permissions only to its deploy job; cross-repository release tokens never enter these callers. Run `npm test`, keep generated files out of `master`, and never overwrite an existing SDK tag or release asset.

After deployment, check the public `releases.json` and the target `/javadoc/sdk-api-v<version>/` page. If the workflow succeeds but the site stays unchanged, compare the `github-pages` artifact with the public content and check whether `pages_build_version` repeats the previous deployment's commit. Redeploying the same commit may leave the old site in place. Diagnose the deployment without repackaging the SDK or replacing its Release, tag, or assets. Manual deployments run `pages.yml` on merged `master` and require the same public-content check.
