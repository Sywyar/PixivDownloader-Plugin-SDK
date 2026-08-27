import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function workflow(name) {
    return fs.readFileSync(path.join(ROOT, '.github', 'workflows', name), 'utf8');
}

test('CI 与 Pages 只以同一不可变主仓库提交调用集中式 workflow', () => {
    const ci = workflow('ci.yml');
    const pages = workflow('pages.yml');
    const ciRef = /sdk-repository-ci\.yml@([0-9a-f]{40})/u.exec(ci)?.[1];
    const pagesRef = /sdk-pages\.yml@([0-9a-f]{40})/u.exec(pages)?.[1];

    assert.ok(ciRef);
    assert.equal(pagesRef, ciRef);
    assert.match(ci, /push:\s*\n\s*branches: \[master\][\s\S]*pull_request:\s*\n\s*branches: \[master\][\s\S]*workflow_dispatch:/u);
    assert.match(pages, /release:\s*\n\s*types: \[published\][\s\S]*workflow_dispatch:/u);
    assert.doesNotMatch(`${ci}\n${pages}`, /@master|secrets:|CROSS_REPO_RELEASE_TOKEN|github\.token/u);
});

test('只有 SDK 仓库 Pages 部署 job 持有最小写权限', () => {
    const ci = workflow('ci.yml');
    const pages = workflow('pages.yml');

    assert.doesNotMatch(ci, /pages: write|id-token: write|deploy-pages/u);
    assert.match(pages, /deploy:\s*\n\s*needs: build[\s\S]*pages: write[\s\S]*id-token: write/u);
    assert.match(pages, /actions\/deploy-pages@cd2ce8fcbc39b97be8ca5fce6e763baed58fa128/u);
    assert.equal((pages.match(/deploy-pages@/gu) ?? []).length, 1);
});
