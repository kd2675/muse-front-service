/** Keeps writes in order; a failed write does not block a later retry. */
export function createSerialQueue() {
  let tail: Promise<unknown> = Promise.resolve();
  return function enqueue<T>(write: () => Promise<T>): Promise<T> {
    const task = tail.then(write);
    tail = task.catch(() => undefined);
    return task;
  };
}
