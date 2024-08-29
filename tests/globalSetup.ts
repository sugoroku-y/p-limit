import type { Config } from 'jest';

export default function globalSetup(
    globalConfig: Config,
    projectConfig: Exclude<Exclude<Config['projects'], undefined>[0], string>,
) {
    if (
        globalConfig.collectCoverage &&
        projectConfig.globals &&
        'skipPerformance' in projectConfig.globals
    ) {
        // Coverageを計測する場合はtest.performanceをスキップする
        projectConfig.globals['skipPerformance'] = true;
    }
}
