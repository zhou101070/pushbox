interface SolverMessage {
  type: 'solve'
  gameMap: number[][]
  algorithm: AlgorithmType
}

interface OptimizeMessage {
  type: 'optimize'
  gameMap: number[][]
  originalPath: string[]
}

interface SolverResponse {
  type: 'result'
  path: string[] | null
}

interface OptimizeResponse {
  type: 'optimized'
  originalPath: string[]
  optimizedPath: string[]
  improvement: number
}

interface ErrorResponse {
  type: 'error'
  message: string
  originalPath: string[]
}

export type AlgorithmType = 'bfs' | 'a_star' | 'dfs' | 'bidirectional'
export function solveSokoban(
  gameMap: number[][],
  algorithms: AlgorithmType[] = [],
  timeout: number = 5000,
  signal?: AbortSignal,
  enablePathOptimization: boolean = false,
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
    let rejectCount = 0
    workers.forEach((worker, idx) => {
      worker.onmessage = async (e: MessageEvent<SolverResponse>) => {
        const algorithm = algorithms[idx]
        const path = e.data.path || []
        if (path.length === 0) {
          console.log(`算法 ${algorithm} 未找到路径`)
          rejectCount++
          if (rejectCount >= algorithms.length) {
            reject(new Error('reject'))
          }
          return
        }
        if (!settled) {
          settled = true
          clearTimeout(timer)
          stopAll()

          console.log(`算法 ${algorithm} 找到路径，长度: ${path.length}`)

          // 对非BFS算法的结果进行路径优化，仅当启用路径优化时
          if (
            (enablePathOptimization || path.length > 400) &&
            algorithm !== 'bfs' &&
            path.length > 0
          ) {
            optimizePath(gameMap, path)
              .then((optimizedPath) => {
                console.log(
                  `路径优化完成，原长度: ${path.length}，优化后长度: ${optimizedPath.length}`,
                )
                resolve(optimizedPath)
              })
              .catch((error) => {
                console.warn('路径优化失败:', error)
                resolve(path) // 优化失败时使用原路径
              })
          } else {
            resolve(path)
          }
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

/**
 * 优化给定的路径
 * @param gameMap 游戏地图
 * @param originalPath 原始路径
 * @returns 优化后的路径
 */
export function optimizePath(gameMap: number[][], originalPath: string[]): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./SokobanWorker.ts', import.meta.url))

    worker.onmessage = (e: MessageEvent<OptimizeResponse | ErrorResponse>) => {
      worker.terminate()

      if (e.data.type === 'optimized') {
        const { optimizedPath } = e.data as OptimizeResponse

        resolve(optimizedPath)
      } else if (e.data.type === 'error') {
        const { message } = e.data as ErrorResponse
        console.warn(`路径优化错误: ${message}`)
        reject(new Error(message))
      } else {
        resolve(originalPath) // 未知响应类型，返回原路径
      }
    }

    worker.onerror = (error) => {
      worker.terminate()
      console.error('路径优化Worker错误:', error)
      reject(error)
    }

    const message: OptimizeMessage = {
      type: 'optimize',
      gameMap,
      originalPath,
    }

    worker.postMessage(message)
  })
}
