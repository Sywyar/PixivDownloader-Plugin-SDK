#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const RELEASE_PATTERN = /^sdk-api-v(?<version>(?<major>0|[1-9]\d*)\.(?<minor>0|[1-9]\d*)\.(?<patch>0|[1-9]\d*)(?:-(?<channel>alpha|beta|rc)\.?(?<sequence>[1-9]\d*))?)$/u;
const CHANNEL_ORDER = new Map([['alpha', 0], ['beta', 1], ['rc', 2]]);
const SOURCE_REPOSITORY = 'https://github.com/Sywyar/PixivDownloader';
const MAVEN_GROUP = 'io.github.sywyar.pixivdownloader';
export const SDK_JAVA_VERSION = 17;
const MAVEN_ARTIFACTS = [
    'pixivdownload-sdk-info',
    'pixivdownload-plugin-api',
    'pixivdownload-core-api',
    'pixivdownload-sdk-bom',
];

function fail(message) {
    throw new Error(message);
}

export function parseReleaseId(releaseId) {
    const match = RELEASE_PATTERN.exec(releaseId);
    if (!match) fail(`invalid SDK Release ID: ${releaseId}`);
    return {
        releaseId,
        version: match.groups.version,
        major: Number(match.groups.major),
        minor: Number(match.groups.minor),
        patch: Number(match.groups.patch),
        prereleaseChannel: match.groups.channel ?? null,
        prereleaseSequence: match.groups.sequence ? Number(match.groups.sequence) : null,
        prerelease: Boolean(match.groups.channel),
    };
}

function compareVersions(left, right) {
    for (const key of ['major', 'minor', 'patch']) {
        if (left[key] !== right[key]) return left[key] - right[key];
    }
    if (left.prerelease !== right.prerelease) return left.prerelease ? -1 : 1;
    if (!left.prerelease) return 0;
    const channel = CHANNEL_ORDER.get(left.prereleaseChannel) - CHANNEL_ORDER.get(right.prereleaseChannel);
    return channel || left.prereleaseSequence - right.prereleaseSequence;
}

function sha256(file) {
    return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function parseChecksums(text, releaseId) {
    const checksums = new Map();
    for (const line of text.split(/\r?\n/u).filter(Boolean)) {
        const match = /^([0-9a-f]{64})  ([^/\\\s]+)$/u.exec(line);
        if (!match || checksums.has(match[2])) fail(`${releaseId} contains an invalid SHA256SUMS entry`);
        checksums.set(match[2], match[1]);
    }
    return checksums;
}

function assertExactSet(actual, expected, label) {
    if (actual.size !== expected.size || [...expected].some(value => !actual.has(value))) {
        fail(`${label} does not contain the exact expected files`);
    }
}

function requirePlainFile(file, label) {
    const stat = fs.lstatSync(file, { throwIfNoEntry: false });
    if (!stat?.isFile() || stat.isSymbolicLink()) fail(`missing plain file: ${label}`);
}

function validateMetadata(metadata, identity, checksums) {
    for (const [key, expected] of [
        ['sdkVersion', identity.version],
        ['releaseId', identity.releaseId],
        ['major', identity.major],
        ['minor', identity.minor],
        ['patch', identity.patch],
        ['prereleaseChannel', identity.prereleaseChannel],
        ['prereleaseSequence', identity.prereleaseSequence],
        ['prerelease', identity.prerelease],
    ]) {
        if (metadata[key] !== expected) fail(`${identity.releaseId} metadata has invalid ${key}`);
    }
    if (![1, 2, 4].includes(metadata.schemaVersion) || metadata.sourceRepository !== SOURCE_REPOSITORY
            || !/^[0-9a-f]{40}$/u.test(metadata.sourceCommitSha) || metadata.javaVersion !== SDK_JAVA_VERSION) {
        fail(`${identity.releaseId} metadata has an invalid provenance header`);
    }
    const expectedCoordinates = metadata.schemaVersion === 4 ? [...MAVEN_ARTIFACTS, 'pixivdownload-sdk'] : MAVEN_ARTIFACTS;
    if (!Array.isArray(metadata.mavenCoordinates) || metadata.mavenCoordinates.length !== expectedCoordinates.length) {
        fail(`${identity.releaseId} metadata has invalid Maven coordinates`);
    }
    const coordinates = new Set();
    for (const coordinate of metadata.mavenCoordinates) {
        const expectedPackaging = coordinate.artifactId === 'pixivdownload-sdk-bom' ? 'pom' : 'jar';
        if (coordinate.groupId !== MAVEN_GROUP || coordinate.version !== identity.version
                || !expectedCoordinates.includes(coordinate.artifactId)
                || coordinate.packaging !== expectedPackaging) {
            fail(`${identity.releaseId} metadata contains an invalid Maven coordinate`);
        }
        coordinates.add(coordinate.artifactId);
    }
    if (coordinates.size !== expectedCoordinates.length) fail(`${identity.releaseId} repeats a Maven coordinate`);

    const sdkZip = `PixivDownloader-Plugin-SDK-${identity.version}.zip`;
    const javadocsZip = `PixivDownloader-Plugin-SDK-Javadocs-${identity.version}.zip`;
    const expectedArtifacts = metadata.schemaVersion === 1 ? [sdkZip, javadocsZip] : [sdkZip];
    const downloadedFiles = [...expectedArtifacts];
    if (metadata.schemaVersion === 4) {
        const runtime = metadata.developmentRuntime;
        const platforms = ['windows-x64', 'windows-arm64', 'linux-x64', 'linux-arm64', 'macos-arm64'];
        if (!runtime || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(runtime.hostVersion)
                || !/^[0-9a-f]{40}$/u.test(runtime.hostSourceCommitSha)
                || !Array.isArray(runtime.platforms) || runtime.platforms.length === 0
                || new Set(runtime.platforms).size !== runtime.platforms.length
                || runtime.platforms.some(platform => !platforms.includes(platform))) {
            fail(`${identity.releaseId} has an invalid fixed runtime identity`);
        }
        for (const [artifact, filename, maxBytes] of [
            [runtime.archive, `PixivDownload-${runtime.hostVersion}-full-offline.zip`, 512 * 1024 * 1024],
            [runtime.host, `PixivDownload-${runtime.hostVersion}.jar`, 512 * 1024 * 1024],
            [runtime.pluginsManifest, 'plugins-manifest.json', 1024 * 1024],
        ]) {
            if (!artifact || artifact.file !== filename || !Number.isSafeInteger(artifact.size)
                    || artifact.size <= 0 || artifact.size > maxBytes || !/^[0-9a-f]{64}$/u.test(artifact.sha256)) {
                fail(`${identity.releaseId} has invalid fixed runtime artifacts`);
            }
        }
        if (runtime.downloadUrl !== `https://github.com/Sywyar/PixivDownloader-Plugin-SDK/releases/download/${identity.releaseId}/${runtime.archive.file}`) {
            fail(`${identity.releaseId} has an invalid fixed runtime URL`);
        }
        const declared = Array.isArray(metadata.artifacts)
            ? metadata.artifacts.find(item => item.file === runtime.archive.file) : null;
        if (!declared || declared.size !== runtime.archive.size || declared.sha256 !== runtime.archive.sha256) {
            fail(`${identity.releaseId} runtime and release artifact identity disagree`);
        }
        expectedArtifacts.push(runtime.archive.file);
    }
    if (!Array.isArray(metadata.artifacts) || metadata.artifacts.length !== expectedArtifacts.length) {
        fail(`${identity.releaseId} metadata has invalid SDK artifacts`);
    }
    const artifacts = new Map(metadata.artifacts.map(artifact => [artifact.file, artifact.sha256]));
    assertExactSet(new Set(artifacts.keys()), new Set(expectedArtifacts), `${identity.releaseId} metadata`);
    for (const file of expectedArtifacts) {
        if (!/^[0-9a-f]{64}$/u.test(artifacts.get(file)) || artifacts.get(file) !== checksums.get(file)) {
            fail(`${identity.releaseId} metadata and SHA256SUMS disagree for ${file}`);
        }
        if (metadata.schemaVersion === 4) {
            const size = metadata.artifacts.find(item => item.file === file).size;
            if (!Number.isSafeInteger(size) || size <= 0 || size > 512 * 1024 * 1024) {
                fail(`${identity.releaseId} has invalid artifact size: ${file}`);
            }
        }
    }
    return {
        files: expectedArtifacts,
        downloadedFiles,
        archive: metadata.schemaVersion === 1 ? javadocsZip : sdkZip,
        javadocsRoot: metadata.schemaVersion === 1 ? '' : 'docs/javadocs/',
    };
}

function validateArchiveEntries(archive, releaseId, javadocsRoot) {
    const entries = execFileSync('jar', ['--list', '--file', archive], { encoding: 'utf8' })
            .split(/\r?\n/u).filter(Boolean);
    const unique = new Set();
    for (const entry of entries) {
        const parts = entry.split('/');
        if (entry.includes('\\') || path.posix.isAbsolute(entry) || /^[A-Za-z]:/u.test(entry)
                || parts.includes('..') || unique.has(entry)) {
            fail(`${releaseId} SDK archive contains an unsafe entry: ${entry}`);
        }
        unique.add(entry);
    }
    const index = `${javadocsRoot}index.html`;
    if (!unique.has(index)) fail(`${releaseId} SDK archive has no ${index}`);
}

function readRelease(releasesRoot, directory) {
    const identity = parseReleaseId(directory);
    const root = path.join(releasesRoot, directory);
    const entries = fs.readdirSync(root, { withFileTypes: true });
    if (entries.some(entry => !entry.isFile())) fail(`${directory} contains a non-file Release asset`);
    for (const name of ['sdk-release.json', 'SHA256SUMS']) {
        requirePlainFile(path.join(root, name), `${directory}/${name}`);
        if (fs.statSync(path.join(root, name)).size > 1024 * 1024) fail(`${directory} metadata exceeds the byte limit`);
    }
    const checksums = parseChecksums(fs.readFileSync(path.join(root, 'SHA256SUMS'), 'utf8'), directory);
    const metadata = JSON.parse(fs.readFileSync(path.join(root, 'sdk-release.json'), 'utf8'));
    const artifacts = validateMetadata(metadata, identity, checksums);
    const expectedNames = new Set([...artifacts.downloadedFiles, 'sdk-release.json', 'SHA256SUMS']);
    assertExactSet(new Set(entries.map(entry => entry.name)), expectedNames, directory);
    for (const name of expectedNames) requirePlainFile(path.join(root, name), `${directory}/${name}`);

    const expectedChecksums = new Set([...artifacts.files, 'sdk-release.json']);
    assertExactSet(new Set(checksums.keys()), expectedChecksums, `${directory} SHA256SUMS`);
    for (const [name, expected] of checksums) {
        // 只有固定宿主 ZIP 不在站点输入中，其字节与签名由发布流程验证。
        if (!expectedNames.has(name)) continue;
        if (metadata.schemaVersion === 4 && name !== 'sdk-release.json'
                && fs.statSync(path.join(root, name)).size !== metadata.artifacts.find(item => item.file === name).size) {
            fail(`${directory} artifact size mismatch: ${name}`);
        }
        if (sha256(path.join(root, name)) !== expected) fail(`${directory} checksum mismatch: ${name}`);
    }

    const archive = path.join(root, artifacts.archive);
    validateArchiveEntries(archive, directory, artifacts.javadocsRoot);
    return { ...identity, sourceCommitSha: metadata.sourceCommitSha, archive,
        javadocsRoot: artifacts.javadocsRoot };
}

function escapeHtml(value) {
    return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function redirectPage(target, label) {
    const escaped = escapeHtml(target);
    return `<!doctype html><html lang="en"><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=${escaped}"><title>${escapeHtml(label)}</title><link rel="canonical" href="${escaped}"><p><a href="${escaped}">${escapeHtml(label)}</a></p></html>\n`;
}

function indexPage(releases, latest, preview) {
    const links = releases.map(release => `<li><a href="javadoc/${encodeURIComponent(release.releaseId)}/">${escapeHtml(release.version)}</a> <code>${escapeHtml(release.sourceCommitSha.slice(0, 12))}</code>${release.prerelease ? ' <span>preview</span>' : ''}</li>`).join('\n');
    const shortcuts = [
        latest ? '<a href="latest/">Latest stable / 最新稳定版</a>' : '<span>Latest stable / 最新稳定版：尚未发布 / not published</span>',
        preview ? '<a href="preview/">Latest preview / 最新预发布版</a>' : '<span>Latest preview / 最新预发布版：尚未发布 / not published</span>',
    ].join(' · ');
    return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PixivDownloader Plugin SDK Javadocs</title><style>body{font:16px/1.6 system-ui,sans-serif;max-width:880px;margin:3rem auto;padding:0 1rem;color:#1f2937}a{color:#2563eb}code,span{color:#6b7280}li{margin:.45rem 0}</style></head>
<body><h1>PixivDownloader Plugin SDK Javadocs</h1><p>每个路径对应不可变 SDK Release；each path maps to an immutable SDK Release.</p><p>${shortcuts}</p><h2>Versions / 版本</h2><ul>${links || '<li>No SDK Release / 尚无 SDK Release</li>'}</ul><p><a href="https://github.com/Sywyar/PixivDownloader-Plugin-SDK/releases">Release downloads / 下载</a> · <a href="https://github.com/Sywyar/PixivDownloader">Source / 源码</a></p></body></html>\n`;
}

function safeOutputPath(releasesRoot, output) {
    const resolved = path.resolve(output);
    if (resolved === path.parse(resolved).root || resolved === releasesRoot
            || releasesRoot.startsWith(`${resolved}${path.sep}`)
            || resolved.startsWith(`${releasesRoot}${path.sep}`)) {
        fail(`unsafe Pages output path: ${resolved}`);
    }
    return resolved;
}

export function buildPages({ releasesDir, output }) {
    const releasesRoot = path.resolve(releasesDir);
    if (!fs.statSync(releasesRoot, { throwIfNoEntry: false })?.isDirectory()) {
        fail(`Release input directory does not exist: ${releasesRoot}`);
    }
    const destination = safeOutputPath(releasesRoot, output);
    const directories = fs.readdirSync(releasesRoot, { withFileTypes: true });
    if (directories.some(entry => !entry.isDirectory())) fail('Release input root may contain only directories');
    const releases = directories.map(entry => readRelease(releasesRoot, entry.name))
            .sort((left, right) => compareVersions(right, left));

    fs.rmSync(destination, { recursive: true, force: true });
    fs.mkdirSync(path.join(destination, 'javadoc'), { recursive: true });
    const extraction = path.join(destination, '.sdk-extract');
    for (const release of releases) {
        const target = path.join(destination, 'javadoc', release.releaseId);
        fs.rmSync(extraction, { recursive: true, force: true });
        fs.mkdirSync(extraction);
        execFileSync('jar', ['--extract', '--file', release.archive,
            ...(release.javadocsRoot ? [release.javadocsRoot] : [])], { cwd: extraction, stdio: 'inherit' });
        const source = path.join(extraction, ...release.javadocsRoot.split('/').filter(Boolean));
        requirePlainFile(path.join(source, 'index.html'), `${release.releaseId}/index.html`);
        fs.cpSync(source, target, { recursive: true });
        requirePlainFile(path.join(target, 'index.html'), `${release.releaseId}/index.html`);
    }
    fs.rmSync(extraction, { recursive: true, force: true });

    const latest = releases.find(release => !release.prerelease) ?? null;
    const preview = releases.find(release => release.prerelease) ?? null;
    fs.writeFileSync(path.join(destination, 'index.html'), indexPage(releases, latest, preview), 'utf8');
    fs.writeFileSync(path.join(destination, 'releases.json'), `${JSON.stringify({
        schemaVersion: 1,
        latest: latest?.releaseId ?? null,
        preview: preview?.releaseId ?? null,
        releases: releases.map(({ archive, javadocsRoot, ...release }) => release),
    }, null, 2)}\n`, 'utf8');
    for (const [name, release] of [['latest', latest], ['preview', preview]]) {
        if (!release) continue;
        const directory = path.join(destination, name);
        fs.mkdirSync(directory);
        fs.writeFileSync(path.join(directory, 'index.html'),
                redirectPage(`../javadoc/${encodeURIComponent(release.releaseId)}/`, release.version), 'utf8');
    }
    return { releases, latest, preview };
}

function parseArguments(argv) {
    const options = { releasesDir: '', output: '' };
    for (let index = 0; index < argv.length; index += 2) {
        const key = { '--releases-dir': 'releasesDir', '--output': 'output' }[argv[index]];
        if (!key || !argv[index + 1]) fail('usage: build-pages.mjs --releases-dir <directory> --output <directory>');
        options[key] = argv[index + 1];
    }
    if (!options.releasesDir || !options.output) fail('both --releases-dir and --output are required');
    return options;
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
    try {
        const result = buildPages(parseArguments(process.argv.slice(2)));
        process.stdout.write(`Built Pages for ${result.releases.length} SDK Release(s)\n`);
    } catch (error) {
        process.stderr.write(`${error.message}\n`);
        process.exitCode = 1;
    }
}
