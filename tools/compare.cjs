const { diffLinesUnified } = require('jest-diff');
const { promises: fs } = require('fs');
const [, , f1, f2] = process.argv;
(async () => {
    const [a, b] = await Promise.all(
        [f1, f2].map((f) => fs.readFile(f, 'utf8')),
    );
    if (a === b) {
        process.exit(0);
    }
    process.stdout.write(
        diffLinesUnified(a.split('\n'), b.split('\n'), {
            aAnnotation: f1,
            bAnnotation: f2,
            expand: false,
            contextLines: 3,
        }),
    );
})();
