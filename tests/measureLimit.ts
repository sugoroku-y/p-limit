import { spawn } from 'child_process';

export function measureLimit(script: string) {
    return new Promise<number>((resolve, reject) => {
        let count: number | undefined;
        let errorLog: string = '';
        const start = performance.now();
        const e = spawn('node', ['-e', `(async()=>{${script}})()`], {
            shell: true,
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
            errorLog += String(b);
        });
        e.on('exit', () => {
            if (!/allocation ?fail|out ?of ?memory/i.test(errorLog)) {
                // メモリが足りなくなったエラー以外のエラーログだけ表示
                console.error(errorLog);
            }
            const elapse = performance.now() - start;
            if (count === undefined) {
                reject(new Error(`No output: ${script}`));
                return;
            }
            resolve(count);
            const minutes = Math.floor(elapse / 60000);
            const seconds = (elapse % 60000) / 10000;
            console.log(
                minutes !== 0
                    ? `${minutes}m${seconds.toFixed(3).replace('.', 's').padStart(6, '0')}`
                    : `${seconds.toFixed(3).replace('.', 's')}`,
                script.match(/^.+/m)?.[0] ?? script,
            );
        }).on('error', (e) => reject(e));
    });
}
