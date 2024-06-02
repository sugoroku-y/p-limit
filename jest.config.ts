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
    collectCoverage: !!process.env['npm_config_coverage'],
} satisfies Config;
