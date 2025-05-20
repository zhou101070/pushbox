// TypeScript 版本的 point 类，适配迷宫与推箱子算法
export class Point {
  x: number;
  y: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
  equals(other: Point): boolean {
    return this.x === other.x && this.y === other.y;
  }
  add(other: Point): Point {
    return new Point(this.x + other.x, this.y + other.y);
  }
}
