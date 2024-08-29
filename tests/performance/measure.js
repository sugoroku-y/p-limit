// eslint-disable-next-line jsdoc/valid-types -- -
/** @type {'yoctoQ' | 'Queue' | `Queue${1|2|3|4|5}`} */
const moduleName = process.argv[2];
const count = Number(process.argv[3]);

(async () => {
    /** @type {() => import('../../src/Queue').Queue} */
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- -
    const Queue =
        moduleName === 'yoctoQ'
            ? await (async () => {
                  const { default: Queue } = await import('yocto-queue');
                  return () => new Queue();
              })()
            : moduleName === 'Queue'
              ? // eslint-disable-next-line @typescript-eslint/no-var-requires -- -
                require('../../lib/Queue').Queue
              : require(`./${moduleName}`);
    const queue = Queue();
    const start = performance.now();
    for (let c = count; c; --c) {
        queue.enqueue({ c });
    }
    while (queue.dequeue());
    console.log(performance.now() - start);
})();
