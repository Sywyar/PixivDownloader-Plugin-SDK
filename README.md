# PixivDownloader Plugin SDK

[English](README_en.md)

本仓库是 PixivDownloader 插件 SDK 的发行入口，只保存下载说明、版本化 Javadoc 站点生成器和仓库维护文档。SDK API 源码、BOM、插件模板与可信发布流程由 [PixivDownloader 主仓库](https://github.com/Sywyar/PixivDownloader) 维护；本仓库不会复制或重新签发这些源码。

## 获取 SDK

可用版本以本仓库的 [Releases](https://github.com/Sywyar/PixivDownloader-Plugin-SDK/releases) 为唯一事实源。包含 `developmentRuntime` 元数据的开发包采用下述布局；历史版本按各自包内 README 使用。

- `PixivDownloader-Plugin-SDK-<version>.zip`：插件开发工程，默认源码位于根 `src/`，另含下载类型、Gradle 和 sbt 独立示例、Maven Wrapper、完整 Javadoc，以及 IntelliJ IDEA、VS Code 和 Eclipse 的共享 Run / Debug 配置；
- `PixivDownload-<host-version>-full-offline.zip`：独立运行附件，含固定宿主和完整官方插件，首次运行由工具按需下载；
- `sdk-release.json`：SDK 版本、源码提交、Maven 坐标，以及配套宿主、官方插件清单和两个 ZIP 的固定身份、大小与摘要；
- `SHA256SUMS` 与 detached signatures：完整性和来源校验材料。

下载同一 Release 的 SDK ZIP、`sdk-release.json` 和 `SHA256SUMS` 后可执行：

```bash
sha256sum --ignore-missing --check SHA256SUMS
```

安装 JDK 17 和 Node.js，解压 SDK 并导入根 `pom.xml`。只构建使用 `sh ./mvnw clean verify`，运行使用 `sh ./mvnw verify exec:exec@sdk-run`，调试改为 `sdk-debug`，停止使用 `sh ./mvnw exec:exec@sdk-stop`；Windows 将 Wrapper 改为 `.\mvnw.cmd`。完整 API 文档从 `docs/javadocs/index.html` 打开。

IDE 导入不会启动宿主。Run / Debug 会先构建当前插件，再校验配套运行包并通过正式本地安装流程部署本次产物；构建失败会中止启动。worker 插件调试其独立 JVM，full-trust 插件调试宿主，默认地址为 `127.0.0.1:5005`。各 IDE 的操作与前置条件见包内 README。

已校验的 ZIP 缓存位于 `~/.cache/pixivdownloader-sdk/`。每个工程在 `.dev/` 中保存独立运行副本、配置、数据库、日志和下载；每次运行恢复锁定的官方集合，并关闭此环境的自动更新。缺失或摘要错误会失败，不切换到新 nightly。离线运行须先完成运行包准备和构建依赖缓存。

## Maven 坐标

发行元数据包含 `pixivdownload-sdk` 的版本可使用以下 Maven Central 坐标；版本须与 Release 完全一致。历史版本按包内 README 使用独立 API 模块和 BOM。

```xml
<dependency>
  <groupId>io.github.sywyar.pixivdownloader</groupId>
  <artifactId>pixivdownload-sdk</artifactId>
  <version>SDK_VERSION</version>
  <scope>provided</scope>
</dependency>
```

Gradle 使用 `compileOnly`，sbt 使用 `Provided`。该薄 JAR 入口通过标准 POM 传递公开 SDK 和宿主提供的编译依赖，不把它们打进插件。三个 API 模块与 `pixivdownload-sdk-bom` 仍可独立消费。插件不得依赖 App artifact、宿主私有实现或官方插件私有类。

## 版本与兼容性

SDK 版本独立于 App 版本。新预发布版本使用 `x.y.z-alpha.N`、`x.y.z-beta.N` 或 `x.y.z-rc.N`，序号从 1 开始且不补零；历史 `alphaN`、`betaN`、`rcN` 继续兼容读取。SDK 按核心数字、`alpha < beta < rc < 正式版` 和数字序号排序，例如 `rc2 < rc.10`。同一序号的新旧拼写优先级相同，不能仅换拼写重新发布；Maven 坐标、Tag、附件和文档路径始终保留原始版本。App 发布本身不会生成新 SDK；只有 SDK 身份变化并通过主仓库同一源码提交的质量门禁后才会发布候选。

插件的 `plugin.requires` 继续声明 SDK 的 `major.minor` 兼容线。用于开发验证的宿主版本只是已验证基线，不表示插件只能用于该 App 版本。

## Javadoc

每次 SDK Release 发布后，Pages workflow 会重新校验全部历史 SDK 文档附件，构建并部署版本化 Javadoc。公开站点提供以下入口：

- 版本索引：<https://sywyar.github.io/PixivDownloader-Plugin-SDK/>
- 稳定版入口：`/latest/`，没有稳定版本时不会指向 RC；
- 预发布入口：`/preview/`；
- 固定版本：`/javadoc/sdk-api-v<version>/`。

以公开版本索引和固定版本页面实际可访问为准，workflow 成功本身不代表新版本已经可见。在线站点尚未更新时，可先打开同一版本 SDK ZIP 中的 `docs/javadocs/index.html`。

Pages 支持历史 schema 1/2 与带独立运行附件的 schema 4。构建站点只下载生成 Javadoc 所需的 SDK 或历史 Javadoc ZIP，不下载历代宿主；运行附件的真实性由主仓库发布及运行消费者校验。

## 贡献边界

- API、BOM、模板、Javadoc 内容和 SDK 打包逻辑：在 [PixivDownloader 主仓库](https://github.com/Sywyar/PixivDownloader) 提交。
- 本仓库 README、Pages 生成器、下载说明和安全策略：按 [CONTRIBUTING.md](CONTRIBUTING.md) 提交。
- SDK Release、Tag 和发行附件由主仓库可信发布链创建，不接受手工覆盖。

完整插件开发标准以 [PixivDownloader 在线文档](https://sywyar.github.io/PixivDownloader/) 为准。Douyin 模块是通过公开 SDK 构建的完整第三方参考实现，不属于官方分发集合。
