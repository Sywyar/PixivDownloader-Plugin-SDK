# 贡献指南 / Contributing

本指南说明本仓库的维护边界、本地验证命令、PR 规则与 Javadoc Pages 部署核验。开发第三方插件请先阅读 [README.md](README.md)。

## 1. 仓库职责边界

| 修改内容 | 目标仓库 |
| --- | --- |
| SDK API、Maven BOM、插件模板、Javadoc 源码注释、版本门禁、SDK 打包及集中式 CI / Pages workflow 实现 | [Sywyar/PixivDownloader](https://github.com/Sywyar/PixivDownloader) |
| 下载说明（`README*.md`）、版本化 Javadoc 站点生成器（`scripts/`）、薄 workflow 调用器与安全说明 | 本仓库（`Sywyar/PixivDownloader-Plugin-SDK`） |

请勿将 Java API 源码、编译后的 JAR、SDK ZIP、生成的 Javadoc 静态站点或任何密钥提交到本仓库 `master`；SDK Release 附件由主仓库发布工作流写入，Pages 站点由 GitHub Actions artifact deployment 发布。

## 2. 本地验证

准备好 Node.js 与带 `jar` 命令的 JDK 17+（站点生成器仅使用 Node.js 标准库，无需安装 npm 依赖），在仓库根目录执行：

```bash
npm test
```

命令退出码为 `0` 且测试全部通过，表示站点生成器（支持历史 schema 1/2 与带独立运行包元数据的 schema 4）和薄调用器约束检查通过。生成输出写入临时目录或 `target/`，不纳入版本控制。

## 3. 分支、PR 与 Workflow 约束

1. 从最新 `origin/master` 创建短生命周期分支，遵循 Conventional Commits，每个 PR 聚焦单一主题并如实报告测试结果。
2. 本仓库的 `.github/workflows/ci.yml` 与 `pages.yml` 仅作为薄入口：固定引用主仓库完整 40 位 commit SHA 的 reusable workflow，声明最小权限（CI 仅 `contents: read`；仅本仓库 Pages `deploy` job 声明 `pages: write` 与 `id-token: write`），绝不接收或转发跨仓库发布令牌 `CROSS_REPO_RELEASE_TOKEN`。
3. 已发布的 SDK Tag、Release 与附件不可移动、覆盖或删除重建；任何修正均通过发布新 SDK 版本完成。

## 4. Pages 部署验收

1. 部署完成后，核对公开站点的 `releases.json`、`/javadoc/sdk-api-v<version>/` 以及 `/latest/`、`/preview/` 跳转目标。
2. 若 workflow 显示成功但线上页面未更新，比对本次 `github-pages` artifact 与线上内容，并检查部署日志中的 `pages_build_version` 是否重复了上一次部署提交（同一提交重复部署可能保留旧内容）。
3. 排查部署问题时保留原 Release、Tag 与附件，切勿为了刷新站点而重新打包或覆盖 SDK Release；需手动重部署时在已合入的 `master` 上触发 `pages.yml` 并再次核验线上页面。

## English Summary

- Contribute SDK APIs, BOM, templates, Javadoc sources, version gates, release packaging, and reusable workflow implementations to [Sywyar/PixivDownloader](https://github.com/Sywyar/PixivDownloader).
- Keep only README docs, the Pages site builder (`scripts/`), and thin workflow callers pinned to a 40-character main-repository commit SHA in this repository. Grant `pages: write` and `id-token: write` only to the local Pages `deploy` job, and never pass `CROSS_REPO_RELEASE_TOKEN` into these workflows.
- Run `npm test` before opening a PR, keep generated site output out of `master`, and never overwrite or delete published SDK tags or Release assets.
- After deployment, verify the public `releases.json`, `/javadoc/sdk-api-v<version>/`, `/latest/`, and `/preview/`. If the site stays stale after a green run, inspect `pages_build_version` and rerun `pages.yml` on `master` without repackaging the SDK.
