// pathWorker.ts

type Point = [number, number]
type Task = {
  start: Point
  goal: Point
  walls: Set<string>
  boxes: Set<string>
  n: number
  m: number
}

onmessage = function (e) {
  const { start, goal, walls, boxes, n, m }: Task = e.data

  function serialize(p: Point) {
    return `${p[0]}_${p[1]}`
  }

  const visited = new Set<string>()
  const queue: [number, number, string[]][] = [[start[0], start[1], []]]
  const directions: [number, number, string][] = [
    [-1, 0, '上'],
    [1, 0, '下'],
    [0, -1, '左'],
    [0, 1, '右'],
  ]

  while (queue.length) {
    const [x, y, path] = queue.shift()!
    const key = serialize([x, y])
    if (key === serialize(goal)) {
      postMessage(path)
      return
    }
    if (visited.has(key)) continue
    visited.add(key)

    for (const [dx, dy, move] of directions) {
      const nx = x + dx
      const ny = y + dy
      const nextKey = serialize([nx, ny])

      if (nx < 0 || ny < 0 || nx >= n || ny >= m) continue
      if (walls.has(nextKey) || boxes.has(nextKey)) continue

      queue.push([nx, ny, [...path, move]])
    }
  }

  postMessage(null) // 不可达
}
