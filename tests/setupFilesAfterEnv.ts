declare const collectCoverage: boolean;
declare const preCommit: boolean;

test.performance ??= collectCoverage || preCommit ? test.skip : test;
test.skip.concurrent ??= test.skip;
