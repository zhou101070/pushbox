// TypeScript 版本的通用搜索算法模板，支持 BFS、DFS、A*
// 仅实现核心算法逻辑，具体节点类型和启发式函数需由调用方实现

export enum Method {
  BFS = "bfs",
  DFS = "dfs",
  ASTAR = "a_star",
}

export type Heuristic<Node> = (a: Node, b: Node) => number;
export type GetNeighbors<Node> = (
  n: Node,
  callback: (neighbor: Node) => void
) => void;
export type IsVisited<Node> = (n: Node) => boolean;
export type MarkVisited<Node> = (n: Node) => void;
export type IsEqual<Node> = (a: Node, b: Node) => boolean;

export class SolverTemplate<ResultType, NodeType> {
  method: Method;
  constructor(method: Method) {
    this.method = method;
  }

  solve(
    start: NodeType,
    goal: NodeType,
    getNeighbors: GetNeighbors<NodeType>,
    isVisited: IsVisited<NodeType>,
    markVisited: MarkVisited<NodeType>,
    isEqual: IsEqual<NodeType>,
    heuristic?: Heuristic<NodeType>
  ): ResultType {
    if (isEqual(start, goal)) {
      if (Array.isArray([] as unknown as ResultType)) {
        return [start] as unknown as ResultType;
      } else {
        return true as unknown as ResultType;
      }
    }
    let container: any;
    let parent: Map<NodeType, NodeType> = new Map();
    if (this.method === Method.ASTAR) {
      // 优先队列，存储 [f_score, node]
      container = [] as Array<{ score: number; node: NodeType }>;
      container.push({ score: heuristic!(start, goal), node: start });
    } else if (this.method === Method.BFS) {
      container = [start];
    } else if (this.method === Method.DFS) {
      container = [start];
    }
    markVisited(start);
    while (container.length > 0) {
      let current: NodeType;
      if (this.method === Method.BFS) {
        current = container.shift();
      } else if (this.method === Method.DFS) {
        current = container.pop();
      } else {
        // A*
        container.sort((a, b) => a.score - b.score);
        current = container.shift().node;
      }
      let found = false;
      getNeighbors(current, (neighbor) => {
        if (!isVisited(neighbor)) {
          markVisited(neighbor);
          parent.set(neighbor, current);
          if (this.method === Method.ASTAR) {
            const fScore = heuristic!(neighbor, goal);
            container.push({ score: fScore, node: neighbor });
          } else {
            container.push(neighbor);
          }
          if (isEqual(neighbor, goal)) {
            found = true;
            goal = neighbor;
          }
        }
      });
      if (found) {
        if (Array.isArray([] as unknown as ResultType)) {
          return this.getPath(start, goal, parent) as unknown as ResultType;
        } else {
          return true as unknown as ResultType;
        }
      }
    }
    // 默认返回
    if (Array.isArray([] as unknown as ResultType)) {
      return [] as unknown as ResultType;
    } else {
      return false as unknown as ResultType;
    }
  }

  private getPath(
    start: NodeType,
    goal: NodeType,
    parent: Map<NodeType, NodeType>
  ): NodeType[] {
    const path: NodeType[] = [];
    let current: NodeType | undefined = goal;
    while (current && current !== start) {
      path.push(current);
      current = parent.get(current);
    }
    path.push(start);
    path.reverse();
    return path;
  }
}
