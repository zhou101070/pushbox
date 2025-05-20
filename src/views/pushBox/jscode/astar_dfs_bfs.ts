// TypeScript 版本的A*、DFS、BFS算法接口示例，基于solver_template和mazesolver
import { Method } from "./constant";
import { Point } from "./point";
import { MazeSolver } from "./mazesolver";

// 迷宫/推箱子地图类型假设为二维数组，0为可通行
export type Grid = number[][];

// 判断点是否在地图内
function isInside(grid: Grid, p: Point): boolean {
  return p.x >= 0 && p.x < grid.length && p.y >= 0 && p.y < grid[0].length;
}

// 获取合法邻居
function getNeighborsFactory(grid: Grid) {
  return (n: Point, callback: (neighbor: Point) => void) => {
    const directions = [
      new Point(0, 1),
      new Point(1, 0),
      new Point(0, -1),
      new Point(-1, 0),
    ];
    for (const dir of directions) {
      const np = n.add(dir);
      if (isInside(grid, np) && grid[np.x][np.y] === 0) {
        callback(np);
      }
    }
  };
}

// 判断是否访问过
function isVisitedFactory(visited: boolean[][]) {
  return (n: Point) => visited[n.x][n.y];
}

// 标记访问
function markVisitedFactory(visited: boolean[][]) {
  return (n: Point) => {
    visited[n.x][n.y] = true;
  };
}

// 判断点是否相等
function isEqual(a: Point, b: Point) {
  return a.equals(b);
}

// 启发式函数（曼哈顿距离）
function heuristic(a: Point, b: Point) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

// 通用求解器
export function solveSokoban(
  grid: Grid,
  start: Point,
  end: Point,
  method: Method
): Point[] | boolean {
  const visited = Array.from({ length: grid.length }, () =>
    Array(grid[0].length).fill(false)
  );
  const mazeSolver = new MazeSolver<Point, Point[] | boolean>(method);
  return mazeSolver.solve(
    grid,
    start,
    end,
    getNeighborsFactory(grid),
    isVisitedFactory(visited),
    markVisitedFactory(visited),
    isEqual,
    method === Method.ASTAR ? heuristic : undefined
  );
}

// 用法示例：
// const path = solveSokoban(map, new Point(0,0), new Point(3,3), Method.ASTAR);
