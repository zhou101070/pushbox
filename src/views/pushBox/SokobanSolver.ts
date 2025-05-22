interface SolverMessage {
  type: 'solve'
  gameMap: number[][]
  algorithm: 'bfs' | 'a_star'
}

interface SolverResponse {
  type: 'result'
  path: string[] | null
}

export type AlgorithmType = 'bfs' | 'a_star'
export function solveSokoban(
  gameMap: number[][],
  algorithms: AlgorithmType[] = [],
  timeout: number = 5000,
  signal?: AbortSignal,
): Promise<string[]> {
  if (!algorithms || algorithms.length === 0) {
    return Promise.resolve([])
  }
  return new Promise((resolve, reject) => {
    const workers = algorithms.map(() => new Worker(new URL('./SokobanWorker.ts', import.meta.url)))
    let settled = false
    const stopAll = () => {
      workers.forEach((w) => w.terminate())
    }
    if (signal instanceof AbortSignal) {
      signal.addEventListener('abort', () => {
        stopAll()
        reject(new Error('abort'))
      })
    }
    let timer = -1
    if (timeout) {
      timer = setTimeout(() => {
        stopAll()
        reject(new Error('timeout'))
      }, timeout)
    }

    workers.forEach((worker, idx) => {
      worker.onmessage = (e: MessageEvent<SolverResponse>) => {
        if (!settled) {
          settled = true
          clearTimeout(timer)
          stopAll()
          resolve(e.data.path || [])
          console.log(`算法 ${algorithms[idx]} 找到路径`)
        }
      }
      const message: SolverMessage = {
        type: 'solve',
        gameMap,
        algorithm: algorithms[idx],
      }
      worker.postMessage(message)
    })
  })
}
