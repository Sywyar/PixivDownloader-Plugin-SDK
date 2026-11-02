# PixivDownloader Plugin SDK

[English](README_en.md)

本仓库是 PixivDownloader 第三方插件 SDK 的发行与文档站点入口，提供开发包下载说明、Maven 依赖坐标和版本化 Javadoc。SDK API 源码、BOM、插件模板与可信发布流程由 [PixivDownloader 主仓库](https://github.com/Sywyar/PixivDownloader) 维护；完整插件开发教程见 [在线文档](https://sywyar.github.io/PixivDownloader/#/zh-cn/plugin-development)。

## 1. 获取并校验 SDK 开发包

从 [Releases](https://github.com/Sywyar/PixivDownloader-Plugin-SDK/releases) 下载目标版本的发行附件（历史版本请按各自包内 README 使用）：

| 附件 | 用途 |
| --- | --- |
| `PixivDownloader-Plugin-SDK-<version>.zip` | 独立插件开发工程（含根 `src/`、下载类型与 Gradle / sbt 示例、Maven Wrapper、离线 Javadoc 及 IntelliJ IDEA / VS Code / Eclipse 的 Run / Debug 配置） |
| `PixivDownload-<host-version>-full-offline.zip` | 配套固定宿主与完整官方插件运行包（首次执行 Run / Debug 时由工具自动按需下载） |
| `sdk-release.json` | SDK 版本、源码提交、Maven 坐标及上述两个 ZIP 的固定大小与 SHA-256 清单 |
| `SHA256SUMS` 与 `.asc` | 完整性校验清单与 OpenPGP 独立签名 |

下载同一 Release 的附件后，可校验文件摘要：

```bash
sha256sum --ignore-missing --check SHA256SUMS
```

## 2. 构建并运行第一个插件

1. 安装 JDK 17+ 与 Node.js（具体版本要求见包内 README），解压 `PixivDownloader-Plugin-SDK-<version>.zip`。
2. 在工程根目录构建并运行验证（Windows PowerShell 将 `sh ./mvnw` 替换为 `.\mvnw.cmd`）：

   ```bash
   # 仅构建并运行测试（产物位于 target/）
   sh ./mvnw clean verify

   # 构建插件、准备固定运行包并启动配套宿主
   sh ./mvnw verify exec:exec@sdk-run

   # 以远程调试模式启动（默认监听 127.0.0.1:5005）
   sh ./mvnw verify exec:exec@sdk-debug

   # 停止当前工程的开发宿主
   sh ./mvnw exec:exec@sdk-stop
   ```

IDE 导入工程本身不会启动宿主；执行共享的 Run / Debug 配置时才会编译插件并通过正式本地安装流程部署到隔离环境（构建失败则中止启动）。`declarative-process` 插件调试独立 worker JVM，`host-process-full-trust` 插件调试宿主 JVM。

已校验的运行包缓存在 `~/.cache/pixivdownloader-sdk/`；工程运行副本、配置、数据库、日志与下载数据隔离在工程 `.dev/` 目录（每次启动恢复锁定的官方插件集合并关闭自动更新）。离线开发需先完成一次运行包准备与构建依赖缓存。

## 3. Maven / Gradle / sbt 坐标

包含统一入口 `pixivdownload-sdk` 的发行版本可使用以下 Maven Central 坐标（请将 `SDK_VERSION` 替换为与 Release 完全一致的版本号）：

```xml
<dependency>
  <groupId>io.github.sywyar.pixivdownloader</groupId>
  <artifactId>pixivdownload-sdk</artifactId>
  <version>SDK_VERSION</version>
  <scope>provided</scope>
</dependency>
```

Gradle 使用 `compileOnly("io.github.sywyar.pixivdownloader:pixivdownload-sdk:SDK_VERSION")`，sbt 使用 `"io.github.sywyar.pixivdownloader" % "pixivdownload-sdk" % "SDK_VERSION" % Provided`。该入口通过标准 POM 传递公开 API（`pixivdownload-sdk-info`、`pixivdownload-plugin-api`、`pixivdownload-core-api`）及宿主提供的编译依赖，不会将宿主共享类打入插件包；三个 API 模块与 `pixivdownload-sdk-bom` 仍可单独引用。严禁依赖 `pixivdownload-app`、宿主内部实现类或官方插件私有类。

## 4. 版本与兼容性声明

SDK 版本独立于主程序版本。预发布版采用 `x.y.z-alpha.N`、`x.y.z-beta.N` 或 `x.y.z-rc.N`（正整数序号、无前导零，兼容读取历史 `alphaN` / `betaN` / `rcN`），按核心版本号、`alpha < beta < rc < 正式版` 及数字序号排序（如 `rc2 < rc.10`；同序号新旧拼写优先级相同，不重复发布）。

插件在 `plugin.properties` 中通过 `plugin.requires` 声明运行所需 SDK 契约：

| 编译所用 SDK | `plugin.properties` 写法 | 宿主兼容规则 |
| --- | --- | --- |
| 稳定版 | `plugin.requires=major.minor` | 宿主 SDK major 相同且 minor 不低于声明值（不声明 patch 下限） |
| 预发布版 | `plugin.requires==完整SDK版本` | 第二个 `=` 属于属性值，要求精确匹配该预发布版本；不同 RC 及 RC 与稳定版默认不兼容 |

配套运行包的宿主版本仅作为开发验证基线，插件在用户端能否安装仍由 SDK 契约版本决定。

## 5. 在线与离线 Javadoc

每次 SDK Release 发布后，GitHub Pages 会校验全部历史文档附件并部署版本化 Javadoc：

- 版本索引：<https://sywyar.github.io/PixivDownloader-Plugin-SDK/>
- 最新稳定版：`/latest/`（尚无稳定版时不指向预发布版）
- 最新预发布版：`/preview/`
- 固定版本：`/javadoc/sdk-api-v<version>/`

线上版本是否可用以版本索引和固定版本页面实际可访问为准；站点尚未刷新时，可直接打开同版本 SDK ZIP 内的 `docs/javadocs/index.html`。

## 6. 贡献与安全反馈

- 修改 SDK API、BOM、插件模板、Javadoc 注释或发布脚本：提交至 [PixivDownloader 主仓库](https://github.com/Sywyar/PixivDownloader)。
- 修改本仓库 README、Pages 生成器或安全说明：按 [CONTRIBUTING.md](CONTRIBUTING.md) 提交 PR（SDK Tag / Release 由主仓库可信发布链写入，禁止手动覆盖）。
- 完整第三方 SDK 参考实现见 [Douyin 插件源码仓库](https://github.com/Sywyar/PixivDownloader-Plugin-Douyin)。安全与签名问题请按 [SECURITY.md](SECURITY.md) 私密报告。
