import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { buildPages, parseReleaseId } from '../build-pages.mjs';

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
        javaVersion: 17,
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
        createRelease(releases, 'sdk-api-v1.0.0-rc2');
        createRelease(releases, 'sdk-api-v1.0.0', 1);
        const result = buildPages({ releasesDir: releases, output });
        assert.equal(result.latest.releaseId, 'sdk-api-v1.0.0');
        assert.equal(result.preview.releaseId, 'sdk-api-v1.0.0-rc2');
        assert.match(fs.readFileSync(path.join(output, 'latest', 'index.html'), 'utf8'), /sdk-api-v1\.0\.0\//u);
        assert.match(fs.readFileSync(path.join(output, 'preview', 'index.html'), 'utf8'), /sdk-api-v1\.0\.0-rc2\//u);
        assert.match(fs.readFileSync(path.join(output, 'javadoc', 'sdk-api-v1.0.0', 'index.html'), 'utf8'), /1\.0\.0/u);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

test('构建器拒绝摘要不一致的历史发行附件', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pixiv-sdk-pages-tamper-'));
    try {
        const releases = path.join(root, 'releases');
        fs.mkdirSync(releases);
        const directory = createRelease(releases, 'sdk-api-v2.0.0-rc1');
        fs.appendFileSync(path.join(directory, 'PixivDownloader-Plugin-SDK-2.0.0-rc1.zip'), 'tampered', 'utf8');
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
        createRelease(releases, 'sdk-api-v1.0.0-rc1');
        const result = buildPages({ releasesDir: releases, output });
        assert.equal(result.latest, null);
        assert.equal(result.preview.releaseId, 'sdk-api-v1.0.0-rc1');
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
        createRelease(releases, 'sdk-api-v1.0.0-rc3', 2, false);
        assert.throws(() => buildPages({ releasesDir: releases, output: path.join(root, 'site') }),
                /has no docs\/javadocs\/index\.html/u);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

test('发行 ID 只接受结构化 SDK 版本', () => {
    assert.throws(() => parseReleaseId('sdk-api-v1.0.0-r1'), /invalid SDK Release ID/u);
    assert.equal(parseReleaseId('sdk-api-v3.2.1-beta4').prereleaseSequence, 4);
});
