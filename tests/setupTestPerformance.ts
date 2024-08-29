declare const skipPerformance: boolean;

test.performance ??= skipPerformance ? test.skip : test;
test.skip.concurrent ??= test.skip;
