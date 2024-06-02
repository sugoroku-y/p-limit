const cp = require('child_process');

const result = cp.spawnSync('git', ['status', '-s'], { encoding: 'utf8' });
if (result.error) {
    console.error(result.error);
    process.exit(1);
}
if (result.stderr) {
    console.error(result.stderr);
    process.exit(1);
}
if (result.stdout) {
    console.log(result.stdout);
    console.error('Git working directory not clean.');
    process.exit(1);
}

process.exit(0);
