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

  isDeadlock(pos: Position): boolean {
    const str = this.posToString(pos)
    return !this.targets.has(str) && this.deadlockPositions.has(str)
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
          if (!this.isDeadlock(boxNewPos)) {
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

  isGoal(state: State): boolean {
    return (
      state.boxes.size === this.targets.size && [...state.boxes].every((b) => this.targets.has(b))
    )
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
    const visited = new Set<string>([initialState.getHash()])
    const queue: State[] = [initialState]

    while (queue.length) {
      const state = queue.shift()!
      if (this.isGoal(state)) return this.getPath(state)

      for (const next of this.getNextStates(state)) {
        const hash = next.getHash()
        if (!visited.has(hash)) {
          visited.add(hash)
          queue.push(next)
        }
      }
    }

    return null
  }

  solveAStar(): string[] | null {
    if (!this.playerPos) return null
    const initialState = new State(this.playerPos, new Set(this.boxes))
    const visited = new Set<string>()
    const heap = new MinHeap<State>()

    const targetList = Array.from(this.targets).map((s) => this.stringToPos(s))
    const heuristic = (state: State) => {
      let sum = 0
      for (const bStr of state.boxes) {
        const [x, y] = this.stringToPos(bStr)
        let min = Infinity
        for (const [tx, ty] of targetList) {
          const dist = Math.abs(x - tx) + Math.abs(y - ty)
          if (dist < min) min = dist
        }
        sum += min
      }
      return sum
    }

    heap.push([heuristic(initialState), initialState])
    visited.add(initialState.getHash())

    while (heap.size > 0) {
      const [, state] = heap.pop()!
      if (this.isGoal(state)) return this.getPath(state)

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
  type: 'solve'
  gameMap: number[][]
  algorithm: 'bfs' | 'a_star'
}

// Worker entry point
self.onmessage = function (e: MessageEvent<SolverMessage>) {
  const { type, gameMap, algorithm } = e.data
  if (type === 'solve') {
    const solver = new SokobanSolver(gameMap)
    const path = algorithm === 'bfs' ? solver.solveBfs() : solver.solveAStar()
    self.postMessage({ type: 'result', path })
  }
}
