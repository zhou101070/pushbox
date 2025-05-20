interface SolverMessage {
  type: 'solve'
  gameMap: number[][]
  algorithm: 'bfs' | 'a_star'
}

interface SolverResponse {
  type: 'result'
  path: string[] | null
}

export function solveSokoban(gameMap: number[][], timeout: number = 5000): Promise<string[]> {
  return new Promise((resolve, reject) => {
    // 使用单独的Worker文件
    const worker = new Worker(new URL('./SokobanWorker.ts', import.meta.url))

    const timer = setTimeout(() => {
      worker.terminate()
      reject()
    }, timeout)

    worker.onmessage = (e: MessageEvent<SolverResponse>) => {
      clearTimeout(timer)
      worker.terminate()
      resolve(e.data.path || [])
    }

    worker.postMessage({
      type: 'solve',
      gameMap,
      algorithm: 'a_star',
    } as SolverMessage)
  })
}
