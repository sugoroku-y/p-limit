/** @type {'yoctoQ' | 'Queue' | 'Queue1' | 'Queue2' | 'Queue3' | 'Queue4' | 'Queue5'} */
const moduleName = process.argv[2];
const count = Number(process.argv[3]);

(async () => {
    /** @type {() => import('../../src/Queue').Queue} */
    const Queue =
        moduleName === 'yoctoQ'
            ? await (async () => {
                  const { default: Queue } = await import('yocto-queue');
                  return () => new Queue();
              })()
            : moduleName === 'Queue'
              ? require('../../lib/Queue').Queue
              : require(`./${moduleName}`);
    const queue = Queue();
    const start = performance.now();
    for (let c = count; c; --c) {
        queue.enqueue({ c });
    }
    while (queue.dequeue());
    console.log(performance.now() - start);
})();
