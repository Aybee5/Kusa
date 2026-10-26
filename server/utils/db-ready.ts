const tasks: Promise<unknown>[] = []

/** Start-up work (migrations, storage) that API requests wait for. */
export function addStartupTask(p: Promise<unknown>) {
  tasks.push(p)
}
export function dbReady() {
  return Promise.all(tasks)
}
