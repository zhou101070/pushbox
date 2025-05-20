// TypeScript 版本的 maze_solver，适配 solver_template.ts
import {
  SolverTemplate,
  Method,
  Heuristic,
  GetNeighbors,
  IsVisited,
  MarkVisited,
  IsEqual,
} from "./solver_template";

export class MazeSolver<NodeType, ReturnType> {
  method: Method;
  constructor(method: Method) {
    this.method = method;
  }

  solve(
    grid: any,
    start: NodeType,
    end: NodeType,
    getNeighbors: GetNeighbors<NodeType>,
    isVisited: IsVisited<NodeType>,
    markVisited: MarkVisited<NodeType>,
    isEqual: IsEqual<NodeType>,
    heuristic?: Heuristic<NodeType>
  ): ReturnType {
    const solver = new SolverTemplate<ReturnType, NodeType>(this.method);
    return solver.solve(
      start,
      end,
      getNeighbors,
      isVisited,
      markVisited,
      isEqual,
      heuristic
    );
  }
}
