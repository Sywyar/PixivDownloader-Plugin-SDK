# PixivDownloader Plugin SDK

[中文](README.md)

This repository is the distribution entry point for the PixivDownloader Plugin SDK. It stores download instructions, the versioned Javadoc site builder, and repository maintenance documents. SDK API sources, the BOM, plugin templates, and the trusted publishing workflow remain owned by the [PixivDownloader main repository](https://github.com/Sywyar/PixivDownloader); this repository does not copy or reissue those sources.

## Get the SDK

The [Releases](https://github.com/Sywyar/PixivDownloader-Plugin-SDK/releases) page is the source of truth for available versions. The layout below applies to packages with `developmentRuntime` metadata. Use the bundled README for older versions.

- `PixivDownloader-Plugin-SDK-<version>.zip`: a plugin project with root `src/`, independent download-type, Gradle and sbt examples, Maven Wrapper, complete Javadocs, and shared IntelliJ IDEA, VS Code and Eclipse Run / Debug configurations;
- `PixivDownload-<host-version>-full-offline.zip`: the separate runtime asset containing the fixed host and complete official plugin set, downloaded by the tools on first run;
- `sdk-release.json`: SDK identity, source commit, Maven coordinates, and fixed identities, sizes and hashes for the host, plugin manifest and both ZIPs;
- `SHA256SUMS` and detached signatures: integrity and provenance material.

After downloading the SDK ZIP, `sdk-release.json`, and `SHA256SUMS` from the same Release, run:

```bash
sha256sum --ignore-missing --check SHA256SUMS
```

Install JDK 17 and Node.js, extract the SDK, and import the root `pom.xml`. Build with `sh ./mvnw clean verify`, run with `sh ./mvnw verify exec:exec@sdk-run`, replace `sdk-run` with `sdk-debug` to debug, and stop with `sh ./mvnw exec:exec@sdk-stop`. On Windows, use `.\mvnw.cmd`. Open `docs/javadocs/index.html` for the complete API documentation.

Importing the project does not start the host. Run / Debug builds the current plugin, verifies the fixed runtime and installs that artifact through the production local installation flow. A failed build stops startup. Worker plugins are debugged in their own JVM; full-trust plugins are debugged in the host. The default address is `127.0.0.1:5005`. See the bundled README for IDE instructions and prerequisites.

Verified ZIPs are cached in `~/.cache/pixivdownloader-sdk/`. Each project stores its own runtime copies, configuration, databases, logs and downloads in `.dev/`. Every run restores the fixed official plugin set and disables automatic updates in this environment. Missing assets or hash mismatches fail without selecting a newer nightly. Offline use requires both the runtime package and build dependencies to be cached.

## Maven coordinates

Releases whose metadata includes `pixivdownload-sdk` can use the following Maven Central coordinates. Match the version exactly. For older releases, follow the bundled README for individual API modules and the BOM.

```xml
<dependency>
  <groupId>io.github.sywyar.pixivdownloader</groupId>
  <artifactId>pixivdownload-sdk</artifactId>
  <version>SDK_VERSION</version>
  <scope>provided</scope>
</dependency>
```

Use `compileOnly` in Gradle or `Provided` in sbt. The thin entry JAR uses standard POM dependencies to expose the public SDK and host-provided compile dependencies without bundling them into the plugin. The three API modules and `pixivdownload-sdk-bom` remain available separately. Plugins must not depend on the App artifact, private host implementations, or private classes from official plugins.

## Versioning and compatibility

The SDK version is independent from the App version. New prereleases use `x.y.z-alpha.N`, `x.y.z-beta.N`, or `x.y.z-rc.N`, with a positive sequence and no leading zeros. Readers also accept historical `alphaN`, `betaN`, and `rcN` suffixes. SDK ordering compares the core numbers, then `alpha < beta < rc < stable`, then the numeric sequence: for example, `rc2 < rc.10`. Both spellings of the same sequence have equal priority, so changing spelling alone cannot create a new release. Maven coordinates, tags, assets, and documentation paths retain the original version. An App release alone does not produce a new SDK; a candidate is published only after the SDK identity changes and the same source commit passes the main repository quality gate.

`plugin.requires` continues to declare the SDK `major.minor` compatibility line. A host version used for development verification is a tested baseline, not a statement that the plugin works only with that App version.

## Javadocs

After each SDK Release, the Pages workflow verifies the SDK documentation assets of every historical Release and deploys Javadocs to:

- version index: <https://sywyar.github.io/PixivDownloader-Plugin-SDK/>;
- stable entry: `/latest/`, which never points to an RC when no stable version exists;
- prerelease entry: `/preview/`;
- immutable version: `/javadoc/sdk-api-v<version>/`.

Pages supports historical schemas 1/2 and schema 4 with a separate runtime asset. Site builds download only the SDK or historical Javadoc ZIP needed for documentation, without downloading past hosts. The main repository publishing and runtime consumer checks verify the runtime assets.

## Contribution boundaries

- API, BOM, templates, Javadoc content, and SDK packaging: contribute to the [PixivDownloader main repository](https://github.com/Sywyar/PixivDownloader).
- README files, Pages generation, download instructions, and security policy in this repository: follow [CONTRIBUTING.md](CONTRIBUTING.md).
- SDK Releases, tags, and release assets are created by the trusted publishing workflow in the main repository and must not be overwritten manually.

The complete plugin development standard lives in the [PixivDownloader documentation](https://sywyar.github.io/PixivDownloader/). The Douyin module is a complete third-party reference implementation built through the public SDK. It is outside the official distribution set.
