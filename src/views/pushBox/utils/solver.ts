// solver.ts

type Point = [number, number]
type Grid = number[][]

function serialize(p: Point): string {
  return `${p[0]}_${p[1]}`
}

export async function pushBoxesSolver(grid: Grid): Promise<string[] | []> {
  const n = grid.length
  const m = grid[0].length

  const walls = new Set<string>()
  const targets = new Set<string>()
  const boxes = new Set<string>()
  let person: Point | null = null

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      const val = grid[i][j]
      const key = serialize([i, j])

      if (val === 0 || val === 1) walls.add(key)
      if ([3, 5, 7].includes(val)) targets.add(key)
      if ([4, 5].includes(val)) boxes.add(key)
      if ([6, 7].includes(val)) person = [i, j]
    }
  }

  if (!person) return []

  function isDeadlock(pos: Point): boolean {
    const [x, y] = pos
    const key = serialize(pos)
    if (targets.has(key)) return false

    const wallOrOut = (nx: number, ny: number) =>
      nx < 0 || ny < 0 || nx >= n || ny >= m || walls.has(serialize([nx, ny]))

    return (
      (wallOrOut(x - 1, y) && wallOrOut(x, y - 1)) ||
      (wallOrOut(x - 1, y) && wallOrOut(x, y + 1)) ||
      (wallOrOut(x + 1, y) && wallOrOut(x, y - 1)) ||
      (wallOrOut(x + 1, y) && wallOrOut(x, y + 1))
    )
  }

  // const initState = [boxes, person]
  const visited = new Set<string>()
  const queue: [Set<string>, Point, string[]][] = [[boxes, person, []]]

  const worker = new Worker(new URL('./pathWorker.ts', import.meta.url), { type: 'module' })

  while (queue.length) {
    const [currBoxes, currPerson, path] = queue.shift()!
    const currBoxArr = Array.from(currBoxes).map((p) => p.split('_').map(Number) as Point)

    for (const [bx, by] of currBoxArr) {
      for (const [dx, dy, move] of [
        [-1, 0, '上'],
        [1, 0, '下'],
        [0, -1, '左'],
        [0, 1, '右'],
      ] as [number, number, string][]) {
        const px: Point = [bx - dx, by - dy]
        const fx: Point = [bx + dx, by + dy]

        const pxKey = serialize(px)
        const fxKey = serialize(fx)

        if (
          fx[0] < 0 ||
          fx[1] < 0 ||
          fx[0] >= n ||
          fx[1] >= m ||
          walls.has(fxKey) ||
          currBoxes.has(fxKey)
        )
          continue
        if (
          px[0] < 0 ||
          px[1] < 0 ||
          px[0] >= n ||
          px[1] >= m ||
          walls.has(pxKey) ||
          currBoxes.has(pxKey)
        )
          continue

        // 使用 Worker 查路径
        const pathToReach = await new Promise<string[] | null>((resolve) => {
          const handler = (e: MessageEvent) => {
            resolve(e.data)
            worker.removeEventListener('message', handler)
          }
          worker.addEventListener('message', handler)

          worker.postMessage({
            start: currPerson,
            goal: px,
            walls,
            boxes: currBoxes,
            n,
            m,
          })
        })

        if (!pathToReach) continue

        const newBoxes = new Set(currBoxes)
        newBoxes.delete(serialize([bx, by]))
        newBoxes.add(fxKey)

        if (isDeadlock(fx)) continue

        const stateKey = JSON.stringify([...newBoxes]) + serialize([bx, by])
        if (visited.has(stateKey)) continue
        visited.add(stateKey)

        const newPath = [...path, ...pathToReach, move]
        if ([...newBoxes].every((pos) => targets.has(pos))) {
          worker.terminate()
          return newPath
        }

        queue.push([newBoxes, [bx, by], newPath])
      }
    }
  }

  worker.terminate()
  return []
}
