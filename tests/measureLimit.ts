import { spawn } from 'child_process';

export function measureLimit(script: string) {
    return new Promise<number>((resolve, reject) => {
        let count: number | undefined;
        const start = performance.now();
        const e = spawn('node', ['-e', `(async()=>{${script}})()`], {
            env: { NODE_DISABLE_COLORS: '1' },
        });
        e.stdout.on('data', (b) => {
            const buffer = String(b);
            for (const [num] of buffer.matchAll(/^.+$/gm)) {
                const candidate = Number(num.trim());
                if (Number.isNaN(candidate)) {
                    reject(
                        new Error(`Unsupported output: ${buffer}: ${script}`),
                    );
                    return;
                }
                count = candidate;
            }
        });
        e.stderr.on('data', (b) => {
            console.error(String(b));
        });
        e.on('exit', () => {
            const elapse = performance.now() - start;
            if (count === undefined) {
                reject(new Error(`No output: ${script}`));
                return;
            }
            resolve(count);
            console.log(elapse, script);
        }).on('error', (e) => reject(e));
    });
}
