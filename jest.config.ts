import type { Config } from 'jest';

export default {
    projects: [
        // 通常のjestでのテスト
        {
            displayName: 'test',
            transform: {
                '\\.ts$': [
                    'ts-jest',
                    {
                        tsconfig: 'tests/tsconfig.json',
                    },
                ],
            },
            collectCoverageFrom: ['src/**/*.ts'],
            coveragePathIgnorePatterns: ['/tests/'],
            globals: {
                // test.performanceをスキップするかどうか
                skipPerformance: !!process.env['npm_config_pre_commit'],
            },
            // coverage計測のときはtest.performanceをスキップする
            globalSetup: './tests/globalSetup.ts',
            // test.performanceのセットアップ
            setupFilesAfterEnv: ['./tests/setupTestPerformance.ts'],
        },
        ...(process.env['npm_config_lint']
            ? // npm test --lintで実行すると以下も追加でテストする
              [
                  // eslintでのチェック
                  {
                      displayName: 'eslint',
                      runner: 'eslint',
                      testMatch: ['**/*.ts', '**/*.js', '**/*.mjs', '**/*.cjs'],
                  },
                  // prettierで整形して差異がないかチェック
                  { preset: '@sugoroku-y/jest-runner-prettier' },
              ]
            : []),
    ],
    // npm test --coverageでもcoverage計測できるようにする
    ...('npm_config_coverage' in process.env && {
        collectCoverage: process.env['npm_config_coverage'] === 'true',
    }),
    ...(process.env['npm_config_pre_commit'] && {
        // コミット前のテストではログを出力しない
        silent: true,
        // コミット前のテストではキャッシュを使用しない
        cache: false,
    }),
} satisfies Config;
