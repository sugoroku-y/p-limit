const { spawnSync } = require('child_process');
const node_path = require('path');

const projectDir = node_path.dirname(module.path);
const result = spawnSync('npm', ['update'], {
    encoding: 'utf8',
    stdio: 'inherit',
    shell: true,
    cwd: projectDir,
});
if (result.status !== 0) {
    if (result.error) {
        console.error(result.error);
    }
    process.exit(result.status);
}

/** @type {{dependencies: Record<string, string>; devDependencies: Record<string, string>}} */
const packageJson = require('../package.json');
/** @type {{packages: Record<string, {version: string}>}} */
const packageLockJson = require('../package-lock.json');

const { dependencies, devDependencies } = packageJson;
const { packages } = packageLockJson;

console.log(`\n${node_path.join(projectDir, 'package.json')}:`);
let count = 0;
for (const [name, versionSpec] of [
    ...(dependencies ? Object.entries(dependencies) : []),
    ...(devDependencies ? Object.entries(devDependencies) : []),
]) {
    if (versionSpec.startsWith('github:')) {
        continue;
    }
    const version = packages[`node_modules/${name}`].version;
    if (versionSpec.replace(/^\^/, '') === version) {
        continue;
    }

    console.log(`  ${name}: ${versionSpec} -> ${version}`);
    ++count;
}

if (!count) {
    console.log('  All packages are up to date.');
}
