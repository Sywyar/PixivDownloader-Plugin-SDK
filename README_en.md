# PixivDownloader Plugin SDK

[中文](README.md)

This repository is the distribution and documentation entry point for the PixivDownloader Plugin SDK, providing development packages, Maven coordinates, and versioned Javadocs. SDK API sources, the BOM, plugin templates, and the trusted publishing workflow are maintained in the [PixivDownloader main repository](https://github.com/Sywyar/PixivDownloader). For the full plugin development guide, see the [online documentation](https://sywyar.github.io/PixivDownloader/#/en/plugin-development).

## 1. Download and Verify the SDK

Download the release assets for your target version from [Releases](https://github.com/Sywyar/PixivDownloader-Plugin-SDK/releases) (for older layouts, follow the bundled README):

| Asset | Purpose |
| --- | --- |
| `PixivDownloader-Plugin-SDK-<version>.zip` | Standalone plugin project containing root `src/`, download-type and Gradle / sbt examples, Maven Wrapper, offline Javadocs, and shared IntelliJ IDEA / VS Code / Eclipse Run / Debug configurations |
| `PixivDownload-<host-version>-full-offline.zip` | Companion runtime bundle with the pinned host and full official plugin set, downloaded on demand on first Run / Debug |
| `sdk-release.json` | Release metadata pinning the SDK version, source commit, Maven coordinates, and exact sizes and SHA-256 digests of both ZIPs |
| `SHA256SUMS` and `.asc` | SHA-256 checksums and detached OpenPGP signatures |

Verify downloaded files against `SHA256SUMS`:

```bash
sha256sum --ignore-missing --check SHA256SUMS
```

## 2. Build and Run Your First Plugin

1. Install JDK 17+ and Node.js (see the bundled README for exact version requirements), then extract `PixivDownloader-Plugin-SDK-<version>.zip`.
2. Run the following commands from the project root (in Windows PowerShell, replace `sh ./mvnw` with `.\mvnw.cmd`):

   ```bash
   # Build and run tests only (outputs the plugin JAR to target/)
   sh ./mvnw clean verify

   # Build the plugin, prepare the pinned runtime, and start the host
   sh ./mvnw verify exec:exec@sdk-run

   # Start in remote debug mode (listens on 127.0.0.1:5005 by default)
   sh ./mvnw verify exec:exec@sdk-debug

   # Stop the development host for this project
   sh ./mvnw exec:exec@sdk-stop
   ```

Importing the project into an IDE does not start the host. Running the shared Run / Debug configuration compiles the plugin, verifies the pinned runtime bundle, and installs the artifact into an isolated environment (build failures abort startup). `declarative-process` plugins debug the worker JVM; `host-process-full-trust` plugins debug the host JVM.

Verified runtime archives are cached under `~/.cache/pixivdownloader-sdk/`. Each project keeps its own runtime copy, configuration, databases, logs, and downloads under `.dev/`; every run restores the pinned official plugin set and disables automatic updates. Offline use requires warming both the runtime cache and build dependencies in advance.

## 3. Maven / Gradle / sbt Coordinates

Releases that include the unified `pixivdownload-sdk` artifact are available on Maven Central (replace `SDK_VERSION` with the exact Release version):

```xml
<dependency>
  <groupId>io.github.sywyar.pixivdownloader</groupId>
  <artifactId>pixivdownload-sdk</artifactId>
  <version>SDK_VERSION</version>
  <scope>provided</scope>
</dependency>
```

Use `compileOnly("io.github.sywyar.pixivdownloader:pixivdownload-sdk:SDK_VERSION")` in Gradle or `"io.github.sywyar.pixivdownloader" % "pixivdownload-sdk" % "SDK_VERSION" % Provided` in sbt. This thin entry JAR uses standard POM dependencies to expose the public SDK modules (`pixivdownload-sdk-info`, `pixivdownload-plugin-api`, `pixivdownload-core-api`) and host compile dependencies without bundling host classes into your plugin JAR; individual API modules and `pixivdownload-sdk-bom` remain available separately. Never depend on `pixivdownload-app`, internal host classes, or private classes from official plugins.

## 4. Versioning and Compatibility

SDK versions are independent from application versions. Prereleases use `x.y.z-alpha.N`, `x.y.z-beta.N`, or `x.y.z-rc.N` (positive integers without leading zeros; historical `alphaN` / `betaN` / `rcN` remain readable) and sort by core version, `alpha < beta < rc < stable`, then numeric sequence (for example, `rc2 < rc.10`). Both spellings of the same sequence have equal priority; changing the spelling alone does not create a new release.

Declare the required runtime SDK contract via `plugin.requires` in `plugin.properties`:

| Compiled against | `plugin.properties` declaration | Host compatibility rule |
| --- | --- | --- |
| Stable SDK | `plugin.requires=major.minor` | Host SDK must have the same major version and at least the declared minor version; no patch minimum is declared |
| Prerelease SDK | `plugin.requires==full-SDK-version` | The second `=` is part of the property value and requires an exact prerelease match; different RCs or an RC and stable release are not compatible by default |

The host version bundled for development is a tested baseline; runtime installation compatibility is governed by the SDK contract version.

## 5. Online and Offline Javadocs

After each SDK Release, GitHub Pages verifies all historical documentation assets and deploys versioned Javadocs:

- Version index: <https://sywyar.github.io/PixivDownloader-Plugin-SDK/>
- Latest stable release: `/latest/` (never points to a prerelease when no stable release exists)
- Latest prerelease: `/preview/`
- Immutable version path: `/javadoc/sdk-api-v<version>/`

Confirm public availability by opening the version index and target version page; if the online site has not refreshed yet, open `docs/javadocs/index.html` inside the corresponding SDK ZIP.

## 6. Contributing and Security

- SDK APIs, BOM, plugin templates, Javadoc comments, and release packaging: contribute to the [PixivDownloader main repository](https://github.com/Sywyar/PixivDownloader).
- README files, the Pages generator, and security documentation in this repository: follow [CONTRIBUTING.md](CONTRIBUTING.md) (SDK Tags and Releases are written by the main repository's trusted release workflow and must not be overwritten manually).
- For a complete third-party reference plugin built on the public SDK, see [PixivDownloader-Plugin-Douyin](https://github.com/Sywyar/PixivDownloader-Plugin-Douyin). Report security or signature vulnerabilities privately via [SECURITY.md](SECURITY.md).
