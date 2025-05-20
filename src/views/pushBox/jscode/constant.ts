// TypeScript 版本的常量定义和辅助类型
export enum Method {
  BFS = "bfs",
  DFS = "dfs",
  ASTAR = "a_star",
}

export const fourDirection = [
  { x: 0, y: 1 },
  { x: 1, y: 0 },
  { x: 0, y: -1 },
  { x: -1, y: 0 },
];

export const BLANK = 0;
