import type { AlgorithmType } from './SokobanSolver'

// 方向: 上、右、下、左
const DIRECTIONS: [number, number][] = [
  [-1, 0],
  [0, 1],
  [1, 0],
  [0, -1],
]
const DIRECTION_NAMES: string[] = ['上', '右', '下', '左']

type Position = [number, number]

class State {
  playerPos: Position
  boxes: Set<string>
  parent: State | null
  direction: string | null
  steps: number
  private _hash: string | null

  constructor(
    playerPos: Position,
    boxes: Set<string>,
    parent: State | null = null,
    direction: string | null = null,
    steps: number = 0,
  ) {
    this.playerPos = playerPos
    this.boxes = boxes
    this.parent = parent
    this.direction = direction
    this.steps = steps
    this._hash = null
  }

  getHash(): string {
    if (!this._hash) {
      const boxesSorted = Array.from(this.boxes).sort()
      this._hash = `${this.playerPos[0]},${this.playerPos[1]}|${boxesSorted.join(';')}`
    }
    return this._hash
  }

  equals(other: State): boolean {
    return this.getHash() === other.getHash()
  }
}

class MinHeap<T> {
  private data: [number, T][] = []

  push(item: [number, T]) {
    this.data.push(item)
    this.bubbleUp()
  }

  pop(): [number, T] | undefined {
    if (this.data.length === 0) return undefined
    const top = this.data[0]
    const end = this.data.pop()!
    if (this.data.length > 0) {
      this.data[0] = end
      this.bubbleDown()
    }
    return top
  }

  get size() {
    return this.data.length
  }

  private bubbleUp() {
    let index = this.data.length - 1
    const item = this.data[index]
    while (index > 0) {
      const parentIdx = Math.floor((index - 1) / 2)
      if (this.data[parentIdx][0] <= item[0]) break
      this.data[index] = this.data[parentIdx]
      index = parentIdx
    }
    this.data[index] = item
  }

  private bubbleDown() {
    let index = 0
    const length = this.data.length
    const item = this.data[0]
    while (true) {
      const leftIdx = 2 * index + 1
      const rightIdx = 2 * index + 2
      let swapIdx = -1

      if (leftIdx < length && this.data[leftIdx][0] < item[0]) {
        swapIdx = leftIdx
      }

      if (
        rightIdx < length &&
        this.data[rightIdx][0] < (swapIdx === -1 ? item[0] : this.data[leftIdx][0])
      ) {
        swapIdx = rightIdx
      }

      if (swapIdx === -1) break
      this.data[index] = this.data[swapIdx]
      index = swapIdx
    }
    this.data[index] = item
  }
}

class SokobanSolver {
  gameMap: number[][]
  height: number
  width: number
  playerPos: Position | null = null
  boxes = new Set<string>()
  targets = new Set<string>()
  walls = new Set<string>()
  deadlockPositions = new Set<string>()

  constructor(gameMap: number[][]) {
    this.gameMap = gameMap
    this.height = gameMap.length
    this.width = this.height > 0 ? gameMap[0].length : 0
    this.parseMap()
    this.computeDeadlocks()
  }

  private posToString(pos: Position): string {
    return `${pos[0]},${pos[1]}`
  }

  private stringToPos(str: string): Position {
    const [i, j] = str.split(',').map(Number)
    return [i, j]
  }

  parseMap() {
    for (let i = 0; i < this.height; i++) {
      for (let j = 0; j < this.width; j++) {
        const cell = this.gameMap[i][j]
        const posStr = this.posToString([i, j])

        if (cell === 1) this.walls.add(posStr)
        else if (cell === 3) this.targets.add(posStr)
        else if (cell === 4) this.boxes.add(posStr)
        else if (cell === 5) {
          this.boxes.add(posStr)
          this.targets.add(posStr)
        } else if (cell === 6) this.playerPos = [i, j]
        else if (cell === 7) {
          this.playerPos = [i, j]
          this.targets.add(posStr)
        }
      }
    }
  }

  computeDeadlocks() {
    for (let i = 0; i < this.height; i++) {
      for (let j = 0; j < this.width; j++) {
        const posStr = this.posToString([i, j])
        if (this.walls.has(posStr) || this.targets.has(posStr)) continue

        let wallCount = 0
        for (const [di, dj] of DIRECTIONS) {
          const ni = i + di,
            nj = j + dj
          if (this.walls.has(this.posToString([ni, nj]))) wallCount++
        }

        if (wallCount >= 2) {
          for (let k = 0; k < 4; k++) {
            const p1 = this.posToString([i + DIRECTIONS[k][0], j + DIRECTIONS[k][1]])
            const p2 = this.posToString([
              i + DIRECTIONS[(k + 1) % 4][0],
              j + DIRECTIONS[(k + 1) % 4][1],
            ])
            if (this.walls.has(p1) && this.walls.has(p2)) {
              this.deadlockPositions.add(posStr)
              break
            }
          }
        }
      }
    }
  }

  isValidMove(pos: Position): boolean {
    const [i, j] = pos
    return (
      i >= 0 &&
      i < this.height &&
      j >= 0 &&
      j < this.width &&
      !this.walls.has(this.posToString(pos))
    )
  }

  isDeadlock(pos: Position, boxes?: Set<string>): boolean {
    const str = this.posToString(pos)

    // 基本死锁检测：位置是预计算的死锁位置
    if (!this.targets.has(str) && this.deadlockPositions.has(str)) {
      return true
    }

    // 如果提供了箱子集合，进行更高级的死锁检测
    if (boxes && !this.targets.has(str)) {
      // 双箱子死锁检测：检查两个箱子是否形成了无法移动的局面
      if (this.isDoubleBoxDeadlock(pos, boxes)) {
        return true
      }
    }

    return false
  }

  // 检测两个箱子是否形成了死锁
  private isDoubleBoxDeadlock(pos: Position, boxes: Set<string>): boolean {
    const [i, j] = pos

    // 检查水平方向的双箱子死锁
    // 如果两个箱子水平相邻，且上方或下方都是墙或其他箱子
    for (const di of [-1, 1]) {
      // 检查上下方向
      if (boxes.has(this.posToString([i, j + 1]))) {
        // 右侧有箱子
        const topBlocked1 =
          !this.isValidMove([i + di, j]) || boxes.has(this.posToString([i + di, j]))
        const topBlocked2 =
          !this.isValidMove([i + di, j + 1]) || boxes.has(this.posToString([i + di, j + 1]))
        if (topBlocked1 && topBlocked2) {
          return true
        }
      }
    }

    // 检查垂直方向的双箱子死锁
    // 如果两个箱子垂直相邻，且左方或右方都是墙或其他箱子
    for (const dj of [-1, 1]) {
      // 检查左右方向
      if (boxes.has(this.posToString([i + 1, j]))) {
        // 下方有箱子
        const sideBlocked1 =
          !this.isValidMove([i, j + dj]) || boxes.has(this.posToString([i, j + dj]))
        const sideBlocked2 =
          !this.isValidMove([i + 1, j + dj]) || boxes.has(this.posToString([i + 1, j + dj]))
        if (sideBlocked1 && sideBlocked2) {
          return true
        }
      }
    }

    return false
  }

  getNextStates(state: State): State[] {
    const result: State[] = []
    const [i, j] = state.playerPos

    for (let d = 0; d < 4; d++) {
      const [di, dj] = DIRECTIONS[d]
      const ni = i + di,
        nj = j + dj
      const newPos: Position = [ni, nj]
      const newPosStr = this.posToString(newPos)

      if (!this.isValidMove(newPos)) continue

      if (state.boxes.has(newPosStr)) {
        const bi = ni + di,
          bj = nj + dj
        const boxNewPos: Position = [bi, bj]
        const boxNewStr = this.posToString(boxNewPos)
        if (this.isValidMove(boxNewPos) && !state.boxes.has(boxNewStr)) {
          const newBoxes = new Set(state.boxes)
          newBoxes.delete(newPosStr)
          newBoxes.add(boxNewStr)
          // 使用增强的死锁检测，传递当前箱子集合
          if (!this.isDeadlock(boxNewPos, newBoxes)) {
            result.push(new State(newPos, newBoxes, state, DIRECTION_NAMES[d], state.steps + 1))
          }
        }
      } else {
        result.push(
          new State(newPos, new Set(state.boxes), state, DIRECTION_NAMES[d], state.steps + 1),
        )
      }
    }

    return result
  }

  // 缓存目标位置列表
  private _targetPositionList: Position[] | null = null

  // 获取目标位置列表（带缓存）
  private getTargetPositionList(): Position[] {
    if (!this._targetPositionList) {
      this._targetPositionList = Array.from(this.targets).map((s) => this.stringToPos(s))
    }
    return this._targetPositionList
  }

  isGoal(state: State): boolean {
    // 快速检查：箱子数量必须等于目标数量
    if (state.boxes.size !== this.targets.size) return false

    // 使用Set操作检查所有箱子是否都在目标位置上
    // 避免使用数组转换和every方法，减少遍历操作
    for (const boxPos of state.boxes) {
      if (!this.targets.has(boxPos)) {
        return false
      }
    }
    return true
  }

  getPath(state: State): string[] {
    const path: string[] = []
    let cur: State | null = state
    while (cur?.parent) {
      if (cur.direction) path.push(cur.direction)
      cur = cur.parent
    }
    return path.reverse()
  }

  solveBfs(): string[] | null {
    if (!this.playerPos) return null
    const initialState = new State(this.playerPos, new Set(this.boxes))

    // 使用Map代替Set来存储已访问状态，可以更快地查找
    const visited = new Map<string, boolean>()
    visited.set(initialState.getHash(), true)

    // 使用数组实现队列，但预分配一定容量以减少扩容操作
    let queue: State[] = new Array(10000)
    let front = 0
    let rear = 0
    queue[rear++] = initialState

    // 预先计算一些常用值以避免重复计算
    const targetSize = this.targets.size

    while (front < rear) {
      const state = queue[front++]

      // 快速目标检查
      if (state.boxes.size === targetSize && this.isGoal(state)) {
        return this.getPath(state)
      }

      // 获取下一步可能的状态
      const nextStates = this.getNextStates(state)

      // 优先探索更有希望的状态
      // 简单启发式：按照箱子到目标的总距离排序
      if (nextStates.length > 1) {
        nextStates.sort((a, b) => {
          // 简单启发式函数：计算所有箱子到最近目标的曼哈顿距离之和
          const scoreA = this.getSimpleHeuristic(a)
          const scoreB = this.getSimpleHeuristic(b)
          return scoreA - scoreB
        })
      }

      for (const next of nextStates) {
        const hash = next.getHash()
        if (!visited.has(hash)) {
          visited.set(hash, true)
          queue[rear++] = next

          // 如果队列即将溢出，动态扩容
          if (rear >= queue.length) {
            const newQueue = new Array(queue.length * 2)
            for (let i = front; i < rear; i++) {
              newQueue[i - front] = queue[i]
            }
            rear -= front
            front = 0
            queue = newQueue
          }
        }
      }
    }

    return null
  }

  // 简单启发式函数：计算所有箱子到最近目标的曼哈顿距离之和
  private getSimpleHeuristic(state: State): number {
    let sum = 0
    // 使用缓存的目标位置列表，避免重复转换
    const targetList = this.getTargetPositionList()

    for (const boxStr of state.boxes) {
      if (this.targets.has(boxStr)) continue // 已经在目标位置的箱子跳过

      const [x, y] = this.stringToPos(boxStr)
      let minDist = Infinity

      for (const [tx, ty] of targetList) {
        const dist = Math.abs(x - tx) + Math.abs(y - ty)
        if (dist < minDist) minDist = dist
      }

      sum += minDist
    }

    return sum
  }

  solveAStar(): string[] | null {
    if (!this.playerPos) return null
    const initialState = new State(this.playerPos, new Set(this.boxes))
    const visited = new Set<string>()
    const heap = new MinHeap<State>()

    const targetList = Array.from(this.targets).map((s) => this.stringToPos(s))

    // 计算两点间的实际路径距离（考虑墙壁阻挡）
    // 使用缓存存储已计算过的路径距离
    const distanceCache = new Map<string, number>()
    const calculatePathDistance = (start: Position, end: Position): number => {
      // 如果起点和终点相同，直接返回0
      if (start[0] === end[0] && start[1] === end[1]) return 0

      // 生成缓存键（正向）
      const cacheKey = `${start[0]},${start[1]}-${end[0]},${end[1]}`

      // 检查缓存中是否已有结果
      if (distanceCache.has(cacheKey)) {
        return distanceCache.get(cacheKey)!
      }

      // 生成缓存键（反向）- 因为A到B的距离等于B到A的距离
      const reverseCacheKey = `${end[0]},${end[1]}-${start[0]},${start[1]}`
      if (distanceCache.has(reverseCacheKey)) {
        return distanceCache.get(reverseCacheKey)!
      }

      // 快速检查：如果起点或终点是墙，直接返回曼哈顿距离
      if (!this.isValidMove(end) || !this.isValidMove(start)) {
        const manhattanDist = Math.abs(start[0] - end[0]) + Math.abs(start[1] - end[1])
        distanceCache.set(cacheKey, manhattanDist)
        // 同时缓存反向路径
        distanceCache.set(reverseCacheKey, manhattanDist)
        return manhattanDist
      }

      // 快速检查：如果曼哈顿距离为1，且没有墙阻挡，直接返回1
      const manhattanDist = Math.abs(start[0] - end[0]) + Math.abs(start[1] - end[1])
      if (manhattanDist === 1) {
        distanceCache.set(cacheKey, 1)
        distanceCache.set(reverseCacheKey, 1)
        return 1
      }

      // 使用BFS计算实际路径距离
      const queue: [Position, number][] = [[start, 0]]
      const visited = new Set<string>([this.posToString(start)])

      while (queue.length > 0) {
        const [pos, dist] = queue.shift()!

        // 如果到达终点，缓存结果并返回距离
        if (pos[0] === end[0] && pos[1] === end[1]) {
          distanceCache.set(cacheKey, dist)
          // 同时缓存反向路径
          distanceCache.set(reverseCacheKey, dist)
          return dist
        }

        // 尝试四个方向，优先选择朝向目标的方向
        const directions = [...DIRECTIONS]
        // 根据终点位置对方向进行排序，优先探索朝向终点的方向
        directions.sort((a, b) => {
          const distA = Math.abs(pos[0] + a[0] - end[0]) + Math.abs(pos[1] + a[1] - end[1])
          const distB = Math.abs(pos[0] + b[0] - end[0]) + Math.abs(pos[1] + b[1] - end[1])
          return distA - distB
        })

        for (const [di, dj] of directions) {
          const newPos: Position = [pos[0] + di, pos[1] + dj]
          const newPosStr = this.posToString(newPos)

          // 如果新位置有效且未访问过
          if (this.isValidMove(newPos) && !visited.has(newPosStr)) {
            visited.add(newPosStr)
            queue.push([newPos, dist + 1])
          }
        }
      }

      // 如果无法到达，返回曼哈顿距离作为估计
      distanceCache.set(cacheKey, manhattanDist)
      // 同时缓存反向路径
      distanceCache.set(reverseCacheKey, manhattanDist)
      return manhattanDist
    }

    // 计算玩家到最近箱子的距离
    const playerToNearestBox = (playerPos: Position, boxes: Set<string>): number => {
      if (boxes.size === 0) return 0

      let minDist = Infinity
      for (const boxStr of boxes) {
        const boxPos = this.stringToPos(boxStr)
        // 先计算曼哈顿距离，如果为1，可以直接返回
        const manhattanDist =
          Math.abs(playerPos[0] - boxPos[0]) + Math.abs(playerPos[1] - boxPos[1])
        if (manhattanDist === 1 && this.isValidMove(boxPos)) {
          return 1 // 如果玩家紧邻箱子，且可以移动到该位置，距离就是1
        }
        const dist = calculatePathDistance(playerPos, boxPos)
        minDist = Math.min(minDist, dist)
        // 如果找到距离为1的箱子，不需要继续搜索
        if (minDist === 1) break
      }
      return minDist
    }

    // 缓存状态的启发式值
    const heuristicCache = new Map<string, number>()

    // 改进的启发式函数
    const heuristic = (state: State) => {
      // 检查缓存
      const stateHash = state.getHash()
      if (heuristicCache.has(stateHash)) {
        return heuristicCache.get(stateHash)!
      }

      let sum = 0
      const boxPositions = Array.from(state.boxes).map((s) => this.stringToPos(s))

      // 如果箱子数量等于目标数量，可以使用更高效的匹配算法
      if (boxPositions.length === targetList.length) {
        // 创建距离矩阵
        const distMatrix: number[][] = []

        // 计算每个箱子到每个目标的距离
        for (const boxPos of boxPositions) {
          const distances: number[] = []
          for (const targetPos of targetList) {
            // 如果箱子已经在目标位置上，距离为0
            if (boxPos[0] === targetPos[0] && boxPos[1] === targetPos[1]) {
              distances.push(0)
            } else {
              distances.push(calculatePathDistance(boxPos, targetPos))
            }
          }
          distMatrix.push(distances)
        }

        // 使用贪心算法进行匹配
        const targetPositions = targetList.slice()
        for (const boxPos of boxPositions) {
          let minDist = Infinity
          let bestTargetIndex = -1

          // 找到距离当前箱子最近的目标
          for (let i = 0; i < targetPositions.length; i++) {
            const targetPos = targetPositions[i]
            const dist = calculatePathDistance(boxPos, targetPos)
            if (dist < minDist) {
              minDist = dist
              bestTargetIndex = i
            }
          }

          // 累加距离并移除已匹配的目标
          if (bestTargetIndex !== -1) {
            sum += minDist
            targetPositions.splice(bestTargetIndex, 1)
          }
        }
      } else {
        // 原始的贪心匹配算法
        const targetPositions = targetList.slice()
        for (const boxPos of boxPositions) {
          let minDist = Infinity
          let bestTargetIndex = -1

          // 找到距离当前箱子最近的目标
          for (let i = 0; i < targetPositions.length; i++) {
            const targetPos = targetPositions[i]
            // 如果箱子已经在目标位置上，距离为0
            if (boxPos[0] === targetPos[0] && boxPos[1] === targetPos[1]) {
              minDist = 0
              bestTargetIndex = i
              break // 已找到最佳匹配，不需要继续搜索
            }
            const dist = calculatePathDistance(boxPos, targetPos)
            if (dist < minDist) {
              minDist = dist
              bestTargetIndex = i
            }
          }

          // 累加距离并移除已匹配的目标
          if (bestTargetIndex !== -1) {
            sum += minDist
            targetPositions.splice(bestTargetIndex, 1)
          }
        }
      }

      // 加上玩家到最近未完成箱子的距离
      // 找出未到达目标的箱子
      const unfinishedBoxes = new Set<string>()
      for (const boxStr of state.boxes) {
        if (!this.targets.has(boxStr)) {
          unfinishedBoxes.add(boxStr)
        }
      }

      // 如果还有未完成的箱子，考虑玩家到最近未完成箱子的距离
      if (unfinishedBoxes.size > 0) {
        sum += playerToNearestBox(state.playerPos, unfinishedBoxes)
      }

      // 缓存结果
      heuristicCache.set(stateHash, sum)

      return sum
    }

    heap.push([heuristic(initialState), initialState])
    visited.add(initialState.getHash())

    while (heap.size > 0) {
      const [, state] = heap.pop()!
      if (this.isGoal(state)) return this.getPath(state)
      // if (heap.size % 1000 === 0) {
      //   console.log(`Heap size: ${heap.size}`)
      // }
      for (const next of this.getNextStates(state)) {
        const hash = next.getHash()
        if (!visited.has(hash)) {
          visited.add(hash)
          heap.push([heuristic(next), next])
        }
      }
    }

    return null
  }

  solveDfs(): string[] | null {
    if (!this.playerPos) return null
    const initialState = new State(this.playerPos, new Set(this.boxes))
    const visited = new Set<string>([initialState.getHash()])
    const stack: State[] = [initialState]
    const maxDepth = 1000 // 防止无限递归

    while (stack.length) {
      const state = stack.pop()!
      if (this.isGoal(state)) return this.getPath(state)

      // 深度限制，防止搜索过深
      if (state.steps >= maxDepth) continue

      // 获取下一步可能的状态，按照启发式函数排序，优先探索更有希望的路径
      const nextStates = this.getNextStates(state)

      // 对下一步状态进行简单排序，优先探索箱子离目标更近的状态
      const targetList = Array.from(this.targets).map((s) => this.stringToPos(s))
      nextStates.sort((a, b) => {
        let scoreA = 0,
          scoreB = 0
        for (const bStr of a.boxes) {
          const [x, y] = this.stringToPos(bStr)
          let min = Infinity
          for (const [tx, ty] of targetList) {
            const dist = Math.abs(x - tx) + Math.abs(y - ty)
            if (dist < min) min = dist
          }
          scoreA += min
        }
        for (const bStr of b.boxes) {
          const [x, y] = this.stringToPos(bStr)
          let min = Infinity
          for (const [tx, ty] of targetList) {
            const dist = Math.abs(x - tx) + Math.abs(y - ty)
            if (dist < min) min = dist
          }
          scoreB += min
        }
        return scoreA - scoreB
      })

      // 逆序添加到栈中，这样最优的状态会被最先弹出
      for (let i = nextStates.length - 1; i >= 0; i--) {
        const next = nextStates[i]
        const hash = next.getHash()
        if (!visited.has(hash)) {
          visited.add(hash)
          stack.push(next)
        }
      }
    }

    return null
  }

  /**
   * 路径优化算法：给定一个通关路径，优化为最短路径
   * @param originalPath 原始路径（方向字符串数组）
   * @returns 优化后的最短路径，如果优化失败则返回原路径
   */
  optimizePath(originalPath: string[]): string[] {
    if (!this.playerPos || originalPath.length === 0) return originalPath

    // 验证原路径是否有效
    if (!this.validatePath(originalPath)) {
      console.warn('原路径无效，返回原路径')
      return originalPath
    }

    // 使用滑动窗口算法优化路径
    let optimizedPath = [...originalPath]
    let improved = true
    let iterations = 0
    const maxIterations = 10 // 防止无限循环

    while (improved && iterations < maxIterations) {
      improved = false
      iterations++

      // 尝试不同大小的窗口进行优化
      for (let windowSize = Math.min(20, optimizedPath.length); windowSize >= 3; windowSize--) {
        for (let start = 0; start <= optimizedPath.length - windowSize; start++) {
          const newPath = this.optimizeSegment(optimizedPath, start, start + windowSize)
          if (newPath.length < optimizedPath.length) {
            optimizedPath = newPath
            improved = true
            break
          }
        }
        if (improved) break
      }
    }

    // 最后进行一次全局优化
    const globalOptimized = this.globalOptimize(optimizedPath)
    return globalOptimized.length < optimizedPath.length ? globalOptimized : optimizedPath
  }

  /**
   * 验证路径是否有效
   */
  private validatePath(path: string[]): boolean {
    if (!this.playerPos) return false

    let currentPlayerPos = [...this.playerPos] as Position
    const currentBoxes = new Set(this.boxes)

    for (const direction of path) {
      const dirIndex = DIRECTION_NAMES.indexOf(direction)
      if (dirIndex === -1) return false

      const [di, dj] = DIRECTIONS[dirIndex]
      const newPos: Position = [currentPlayerPos[0] + di, currentPlayerPos[1] + dj]
      const newPosStr = this.posToString(newPos)

      if (!this.isValidMove(newPos)) return false

      if (currentBoxes.has(newPosStr)) {
        const boxNewPos: Position = [newPos[0] + di, newPos[1] + dj]
        const boxNewStr = this.posToString(boxNewPos)
        if (!this.isValidMove(boxNewPos) || currentBoxes.has(boxNewStr)) {
          return false
        }
        currentBoxes.delete(newPosStr)
        currentBoxes.add(boxNewStr)
      }

      currentPlayerPos = newPos
    }

    return true
  }

  /**
   * 优化路径中的一个片段
   */
  private optimizeSegment(path: string[], start: number, end: number): string[] {
    const beforeSegment = path.slice(0, start)
    const segment = path.slice(start, end)
    const afterSegment = path.slice(end)

    // 获取片段开始时的游戏状态
    const startState = this.getStateAtStep(beforeSegment)
    if (!startState) return path

    // 获取片段结束时的游戏状态
    const endState = this.getStateAtStep(path.slice(0, end))
    if (!endState) return path

    // 使用A*算法寻找从开始状态到结束状态的最短路径
    const optimizedSegment = this.findShortestPath(startState, endState)
    if (optimizedSegment && optimizedSegment.length < segment.length) {
      return [...beforeSegment, ...optimizedSegment, ...afterSegment]
    }

    return path
  }

  /**
   * 全局路径优化
   */
  private globalOptimize(path: string[]): string[] {
    if (!this.playerPos) return path

    const initialState = new State(this.playerPos, new Set(this.boxes))
    const finalState = this.getStateAtStep(path)
    if (!finalState) return path

    const optimizedPath = this.findShortestPath(initialState, finalState)
    return optimizedPath || path
  }

  /**
   * 根据路径获取指定步数后的游戏状态
   */
  private getStateAtStep(path: string[]): State | null {
    if (!this.playerPos) return null

    let currentPlayerPos = [...this.playerPos] as Position
    const currentBoxes = new Set(this.boxes)

    for (const direction of path) {
      const dirIndex = DIRECTION_NAMES.indexOf(direction)
      if (dirIndex === -1) return null

      const [di, dj] = DIRECTIONS[dirIndex]
      const newPos: Position = [currentPlayerPos[0] + di, currentPlayerPos[1] + dj]
      const newPosStr = this.posToString(newPos)

      if (!this.isValidMove(newPos)) return null

      if (currentBoxes.has(newPosStr)) {
        const boxNewPos: Position = [newPos[0] + di, newPos[1] + dj]
        const boxNewStr = this.posToString(boxNewPos)
        if (!this.isValidMove(boxNewPos) || currentBoxes.has(boxNewStr)) {
          return null
        }
        currentBoxes.delete(newPosStr)
        currentBoxes.add(boxNewStr)
      }

      currentPlayerPos = newPos
    }

    return new State(currentPlayerPos, currentBoxes)
  }

  /**
   * 使用A*算法寻找两个状态之间的最短路径
   */
  private findShortestPath(startState: State, targetState: State): string[] | null {
    const visited = new Set<string>()
    const heap = new MinHeap<State>()
    const targetHash = targetState.getHash()

    // 启发式函数：曼哈顿距离
    const heuristic = (state: State) => {
      const [px, py] = state.playerPos
      const [tx, ty] = targetState.playerPos
      const playerDist = Math.abs(px - tx) + Math.abs(py - ty)

      // 箱子位置差异
      let boxDist = 0
      const stateBoxes = Array.from(state.boxes)
      const targetBoxes = Array.from(targetState.boxes)

      if (stateBoxes.length === targetBoxes.length) {
        stateBoxes.sort()
        targetBoxes.sort()
        for (let i = 0; i < stateBoxes.length; i++) {
          const [sx, sy] = this.stringToPos(stateBoxes[i])
          const [tx, ty] = this.stringToPos(targetBoxes[i])
          boxDist += Math.abs(sx - tx) + Math.abs(sy - ty)
        }
      }

      return playerDist + boxDist
    }

    heap.push([heuristic(startState), startState])
    visited.add(startState.getHash())

    let searchSteps = 0
    const maxSearchSteps = 5000 // 限制搜索步数

    while (heap.size > 0 && searchSteps < maxSearchSteps) {
      searchSteps++
      const [, state] = heap.pop()!

      if (state.getHash() === targetHash) {
        return this.getPath(state)
      }

      for (const next of this.getNextStates(state)) {
        const hash = next.getHash()
        if (!visited.has(hash)) {
          visited.add(hash)
          heap.push([next.steps + heuristic(next), next])
        }
      }
    }

    return null
  }
}

// Web Worker 接口
interface SolverMessage {
  type: 'solve' | 'optimize'
  gameMap: number[][]
  algorithm?: AlgorithmType
  originalPath?: string[]
}

interface OptimizeMessage {
  type: 'optimize'
  gameMap: number[][]
  originalPath: string[]
}

// Worker entry point
self.onmessage = function (e: MessageEvent<SolverMessage | OptimizeMessage>) {
  const { type, gameMap } = e.data

  if (type === 'solve') {
    const { algorithm } = e.data as SolverMessage
    const solver = new SokobanSolver(gameMap)
    let path: string[] | null = null

    if (algorithm === 'bfs') {
      path = solver.solveBfs()
    } else if (algorithm === 'dfs') {
      path = solver.solveDfs()
    } else {
      path = solver.solveAStar()
    }

    self.postMessage({ type: 'result', path })
  } else if (type === 'optimize') {
    const { originalPath } = e.data as OptimizeMessage
    const solver = new SokobanSolver(gameMap)

    try {
      const optimizedPath = solver.optimizePath(originalPath)
      self.postMessage({
        type: 'optimized',
        originalPath,
        optimizedPath,
        improvement: originalPath.length - optimizedPath.length,
      })
    } catch (error) {
      self.postMessage({
        type: 'error',
        message: `路径优化失败: ${error instanceof Error ? error.message : '未知错误'}`,
        originalPath,
      })
    }
  }
}
