import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { buildPages, parseReleaseId, SDK_JAVA_VERSION } from '../build-pages.mjs';

// schema 行为与实际发行号无关；每次用生成的版本验证，避免冻结当前 SDK 或宿主版本。
const TEST_VERSION = Array.from({ length: 3 }, () => crypto.randomInt(1, 100)).join('.');
const releaseId = (sequence = 0, channel = 'rc') => `sdk-api-v${TEST_VERSION}${sequence ? `-${channel}${sequence}` : ''}`;

function sha256(file) {
    return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function createRelease(root, releaseId, schemaVersion = 2, includeJavadocs = true) {
    const identity = parseReleaseId(releaseId);
    const directory = path.join(root, releaseId);
    const docs = path.join(root, `${releaseId}-docs`);
    const workspace = path.join(root, `${releaseId}-sdk`);
    fs.mkdirSync(directory);
    fs.mkdirSync(docs);
    fs.mkdirSync(path.join(workspace, 'docs', 'javadocs'), { recursive: true });
    fs.writeFileSync(path.join(docs, 'index.html'), `<h1>${identity.version}</h1>`, 'utf8');
    fs.writeFileSync(path.join(workspace, 'README.md'), `SDK ${identity.version}\n`, 'utf8');
    if (includeJavadocs) {
        fs.copyFileSync(path.join(docs, 'index.html'), path.join(workspace, 'docs', 'javadocs', 'index.html'));
    }
    const sdkZip = `PixivDownloader-Plugin-SDK-${identity.version}.zip`;
    const javadocsZip = `PixivDownloader-Plugin-SDK-Javadocs-${identity.version}.zip`;
    const sdkEntries = ['README.md'];
    if (includeJavadocs) sdkEntries.push('docs/javadocs/index.html');
    execFileSync('jar', ['--create', '--file', path.join(directory, sdkZip), '--no-manifest', ...sdkEntries], {
        cwd: workspace,
    });
    if (schemaVersion === 1) {
        execFileSync('jar', ['--create', '--file', path.join(directory, javadocsZip), '--no-manifest', 'index.html'], {
            cwd: docs,
        });
    }
    const artifactFiles = schemaVersion === 1 ? [sdkZip, javadocsZip] : [sdkZip];
    const artifacts = artifactFiles.map(file => ({ file, sha256: sha256(path.join(directory, file)) }));
    if (schemaVersion === 4) {
        for (const artifact of artifacts) artifact.size = fs.statSync(path.join(directory, artifact.file)).size;
    }
    const metadata = {
        schemaVersion,
        sdkVersion: identity.version,
        major: identity.major,
        minor: identity.minor,
        patch: identity.patch,
        prereleaseChannel: identity.prereleaseChannel,
        prereleaseSequence: identity.prereleaseSequence,
        prerelease: identity.prerelease,
        releaseId: identity.releaseId,
        sourceRepository: 'https://github.com/Sywyar/PixivDownloader',
        sourceCommitSha: 'a'.repeat(40),
        minimumVerifiedHostRelease: null,
        verifiedHostSourceSha: null,
        javaVersion: SDK_JAVA_VERSION,
        mavenCoordinates: [
            ['pixivdownload-sdk-info', 'jar'],
            ['pixivdownload-plugin-api', 'jar'],
            ['pixivdownload-core-api', 'jar'],
            ['pixivdownload-sdk-bom', 'pom'],
        ].map(([artifactId, packaging]) => ({
            groupId: 'io.github.sywyar.pixivdownloader', artifactId, version: identity.version, packaging,
        })),
        artifacts,
    };
    if (schemaVersion === 4) {
        metadata.mavenCoordinates.push({ groupId: 'io.github.sywyar.pixivdownloader', artifactId: 'pixivdownload-sdk',
            version: identity.version, packaging: 'jar' });
        metadata.developmentRuntime = {
            hostVersion: TEST_VERSION, hostSourceCommitSha: 'a'.repeat(40), platforms: ['windows-x64', 'linux-x64'],
            downloadUrl: `https://github.com/Sywyar/PixivDownloader-Plugin-SDK/releases/download/${releaseId}/PixivDownload-${TEST_VERSION}-full-offline.zip`,
            archive: { file: `PixivDownload-${TEST_VERSION}-full-offline.zip`, size: 150000000, sha256: 'b'.repeat(64) },
            host: { file: `PixivDownload-${TEST_VERSION}.jar`, size: 50000000, sha256: 'c'.repeat(64) },
            pluginsManifest: { file: 'plugins-manifest.json', size: 4096, sha256: 'd'.repeat(64) },
        };
        artifacts.push(metadata.developmentRuntime.archive);
    }
    const metadataFile = path.join(directory, 'sdk-release.json');
    fs.writeFileSync(metadataFile, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
    fs.writeFileSync(path.join(directory, 'SHA256SUMS'), `${[
        ...artifacts,
        { file: 'sdk-release.json', sha256: sha256(metadataFile) },
    ].map(item => `${item.sha256}  ${item.file}`).join('\n')}\n`, 'utf8');
    fs.rmSync(docs, { recursive: true });
    fs.rmSync(workspace, { recursive: true });
    return directory;
}

test('构建器校验全部发行附件并区分稳定版与预发布版入口', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pixiv-sdk-pages-'));
    try {
        const releases = path.join(root, 'releases');
        const output = path.join(root, 'site');
        fs.mkdirSync(releases);
        createRelease(releases, releaseId(1));
        createRelease(releases, releaseId(), 1);
        const result = buildPages({ releasesDir: releases, output });
        assert.equal(result.latest.releaseId, releaseId());
        assert.equal(result.preview.releaseId, releaseId(1));
        assert.ok(fs.readFileSync(path.join(output, 'latest', 'index.html'), 'utf8').includes(`${releaseId()}/`));
        assert.ok(fs.readFileSync(path.join(output, 'preview', 'index.html'), 'utf8').includes(`${releaseId(1)}/`));
        assert.ok(fs.readFileSync(path.join(output, 'javadoc', releaseId(), 'index.html'), 'utf8').includes(TEST_VERSION));
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

test('构建器拒绝摘要不一致的历史发行附件', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pixiv-sdk-pages-tamper-'));
    try {
        const releases = path.join(root, 'releases');
        fs.mkdirSync(releases);
        const directory = createRelease(releases, releaseId(1));
        fs.appendFileSync(path.join(directory, `PixivDownloader-Plugin-SDK-${parseReleaseId(releaseId(1)).version}.zip`), 'tampered', 'utf8');
        assert.throws(() => buildPages({ releasesDir: releases, output: path.join(root, 'site') }),
                /checksum mismatch/u);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

test('没有稳定版时不生成 latest 入口且输出不能覆盖发行输入', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pixiv-sdk-pages-preview-'));
    try {
        const releases = path.join(root, 'releases');
        const output = path.join(root, 'site');
        fs.mkdirSync(releases);
        createRelease(releases, releaseId(1));
        const result = buildPages({ releasesDir: releases, output });
        assert.equal(result.latest, null);
        assert.equal(result.preview.releaseId, releaseId(1));
        assert.equal(fs.existsSync(path.join(output, 'latest')), false);
        assert.throws(() => buildPages({ releasesDir: releases, output: path.join(releases, 'site') }),
                /unsafe Pages output path/u);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

test('整合 SDK 缺少内置 Javadoc 时拒绝构建 Pages', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pixiv-sdk-pages-missing-docs-'));
    try {
        const releases = path.join(root, 'releases');
        fs.mkdirSync(releases);
        createRelease(releases, releaseId(1), 2, false);
        assert.throws(() => buildPages({ releasesDir: releases, output: path.join(root, 'site') }),
                /has no docs\/javadocs\/index\.html/u);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

test('发行 ID 只接受结构化 SDK 版本', () => {
    const sequence = crypto.randomInt(1, 100);
    assert.throws(() => parseReleaseId(releaseId(sequence, 'r')), /invalid SDK Release ID/u);
    assert.equal(parseReleaseId(releaseId(sequence, 'beta')).prereleaseSequence, sequence);
});

test('当前与历史 schema 共存，宿主 ZIP 不参与 Pages 下载和解压', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pixiv-sdk-pages-runtime-'));
    try {
        const releases = path.join(root, 'releases');
        fs.mkdirSync(releases);
        const schemas = [1, 2, 4];
        const directories = schemas.map((schema, index) => createRelease(releases, releaseId(index + 1), schema));
        const directory = directories.at(-1);
        const build = () => buildPages({ releasesDir: releases, output: path.join(root, 'site') });
        const result = build();
        assert.equal(result.releases.length, schemas.length);
        assert.equal(result.preview.releaseId, releaseId(schemas.length));
        assert.equal(fs.existsSync(path.join(directory, `PixivDownload-${TEST_VERSION}-full-offline.zip`)), false);
        const file = path.join(directory, 'sdk-release.json');
        const metadata = JSON.parse(fs.readFileSync(file, 'utf8'));
        metadata.developmentRuntime.archive.sha256 = 'e'.repeat(64);
        fs.writeFileSync(file, JSON.stringify(metadata), 'utf8');
        assert.throws(build, /identity disagree/u);
        metadata.artifacts.find(item => item.file.endsWith('-full-offline.zip')).sha256 = 'e'.repeat(64);
        fs.writeFileSync(file, JSON.stringify(metadata), 'utf8');
        assert.throws(build, /SHA256SUMS disagree/u);
        metadata.developmentRuntime.downloadUrl = 'https://github.com/Sywyar/PixivDownloader/releases/download/nightly/runtime.zip';
        fs.writeFileSync(file, JSON.stringify(metadata), 'utf8');
        assert.throws(build, /runtime URL/u);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
