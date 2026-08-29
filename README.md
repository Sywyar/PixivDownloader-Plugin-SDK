# PixivDownloader Plugin SDK

[English](README_en.md)

本仓库是 PixivDownloader 插件 SDK 的发行入口，只保存下载说明、版本化 Javadoc 站点生成器和仓库维护文档。SDK API 源码、BOM、插件模板与可信发布流程由 [PixivDownloader 主仓库](https://github.com/Sywyar/PixivDownloader) 维护；本仓库不会复制或重新签发这些源码。

## 获取 SDK

可用版本以本仓库的 [Releases](https://github.com/Sywyar/PixivDownloader-Plugin-SDK/releases) 为唯一事实源。列表为空表示尚未公开发布 SDK。每个版本发布后提供：

- `PixivDownloader-Plugin-SDK-<version>.zip`：唯一的完整 SDK 包，包含默认下载类型插件工程、最小 feature 示例、Maven Wrapper、完整聚合 Javadoc，以及 IntelliJ IDEA、VS Code 和 Eclipse 的共享开发配置；
- `sdk-release.json`：SDK 版本、源码提交、Maven 坐标和产物摘要；
- `SHA256SUMS` 与 detached signatures：完整性和来源校验材料。

下载同一 Release 的 SDK ZIP、`sdk-release.json` 和 `SHA256SUMS` 后可执行：

```bash
sha256sum -c SHA256SUMS
```

SDK ZIP 解压后，直接用受支持的 IDE 打开根目录；命令行构建使用 `./mvnw clean verify`，Windows 使用 `mvnw.cmd clean verify`。完整 API 文档从 `docs/javadocs/index.html` 打开。

## Maven 坐标

公开版本统一使用以下 Maven Central 坐标，版本必须与 Release 完全一致：

```xml
<dependencyManagement>
  <dependencies>
    <dependency>
      <groupId>io.github.sywyar.pixivdownloader</groupId>
      <artifactId>pixivdownload-sdk-bom</artifactId>
      <version>SDK_VERSION</version>
      <type>pom</type>
      <scope>import</scope>
    </dependency>
  </dependencies>
</dependencyManagement>
```

BOM 统一管理 `pixivdownload-sdk-info`、`pixivdownload-plugin-api` 和 `pixivdownload-core-api`。插件不得依赖 App artifact、宿主私有实现或官方插件私有类。

## 版本与兼容性

SDK 版本独立于 App 版本，使用 `x.y.z` 以及结构化的 `-alphaN`、`-betaN`、`-rcN` 预发布后缀。App 发布本身不会生成新 SDK；只有 SDK 身份变化并通过主仓库同一源码提交的质量门禁后才会发布候选。

插件的 `plugin.requires` 继续声明 SDK 的 `major.minor` 兼容线。用于开发验证的宿主版本只是已验证基线，不表示插件只能用于该 App 版本。

## Javadoc

每次 SDK Release 发布后，Pages workflow 会重新校验全部历史 Release，并将 Javadoc 部署到：

- 版本索引：<https://sywyar.github.io/PixivDownloader-Plugin-SDK/>
- 稳定版入口：`/latest/`，没有稳定版本时不会指向 RC；
- 预发布入口：`/preview/`；
- 固定版本：`/javadoc/sdk-api-v<version>/`。

## 贡献边界

- API、BOM、模板、Javadoc 内容和 SDK 打包逻辑：在 [PixivDownloader 主仓库](https://github.com/Sywyar/PixivDownloader) 提交。
- 本仓库 README、Pages 生成器、下载说明和安全策略：按 [CONTRIBUTING.md](CONTRIBUTING.md) 提交。
- SDK Release、Tag 和发行附件由主仓库可信发布链创建，不接受手工覆盖。

完整插件开发标准以 [PixivDownloader 在线文档](https://sywyar.github.io/PixivDownloader/) 为准。Douyin 官方插件是完整参考实现，不是宿主依赖、第三方依赖或私有 SDK 契约。
