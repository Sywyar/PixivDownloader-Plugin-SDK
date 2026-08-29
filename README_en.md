# PixivDownloader Plugin SDK

[中文](README.md)

This repository is the distribution entry point for the PixivDownloader Plugin SDK. It stores download instructions, the versioned Javadoc site builder, and repository maintenance documents. SDK API sources, the BOM, plugin templates, and the trusted publishing workflow remain owned by the [PixivDownloader main repository](https://github.com/Sywyar/PixivDownloader); this repository does not copy or reissue those sources.

## Get the SDK

The [Releases](https://github.com/Sywyar/PixivDownloader-Plugin-SDK/releases) page is the source of truth for available versions. An empty list means that no SDK has been published yet. Each published version provides:

- `PixivDownloader-Plugin-SDK-<version>.zip`: the single complete SDK package, containing the default download-type plugin project, a minimal feature example, Maven Wrapper, complete aggregate Javadocs, and shared IntelliJ IDEA, VS Code, and Eclipse development configurations;
- `sdk-release.json`: SDK identity, source commit, Maven coordinates, and artifact digests;
- `SHA256SUMS` and detached signatures: integrity and provenance material.

After downloading the SDK ZIP, `sdk-release.json`, and `SHA256SUMS` from the same Release, run:

```bash
sha256sum -c SHA256SUMS
```

Extract the SDK ZIP and open its root in a supported IDE. For a command-line build, run `./mvnw clean verify`, or `mvnw.cmd clean verify` on Windows. Open `docs/javadocs/index.html` for the complete API documentation.

## Maven coordinates

Published versions use the following Maven Central coordinates. The version must match the Release exactly:

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

The BOM aligns `pixivdownload-sdk-info`, `pixivdownload-plugin-api`, and `pixivdownload-core-api`. Plugins must not depend on the App artifact, private host implementations, or private classes from official plugins.

## Versioning and compatibility

The SDK version is independent from the App version. It uses `x.y.z` plus structured `-alphaN`, `-betaN`, or `-rcN` prerelease suffixes. An App release alone does not produce a new SDK; a candidate is published only after the SDK identity changes and the same source commit passes the main repository quality gate.

`plugin.requires` continues to declare the SDK `major.minor` compatibility line. A host version used for development verification is a tested baseline, not a statement that the plugin works only with that App version.

## Javadocs

After each SDK Release, the Pages workflow verifies every historical Release again and deploys Javadocs to:

- version index: <https://sywyar.github.io/PixivDownloader-Plugin-SDK/>;
- stable entry: `/latest/`, which never points to an RC when no stable version exists;
- prerelease entry: `/preview/`;
- immutable version: `/javadoc/sdk-api-v<version>/`.

## Contribution boundaries

- API, BOM, templates, Javadoc content, and SDK packaging: contribute to the [PixivDownloader main repository](https://github.com/Sywyar/PixivDownloader).
- README files, Pages generation, download instructions, and security policy in this repository: follow [CONTRIBUTING.md](CONTRIBUTING.md).
- SDK Releases, tags, and release assets are created by the trusted publishing workflow in the main repository and must not be overwritten manually.

The complete plugin development standard lives in the [PixivDownloader documentation](https://sywyar.github.io/PixivDownloader/). The official Douyin plugin is a complete reference implementation, not a host dependency, third-party dependency, or private SDK contract.
