import { maps, maps2, maps3, maps4, maps5, maps6, maps7, type Maps } from './maps'
import './SokobanSolver.ts'
export interface Level {
  id: number
  name: string
  map: number[][]
}
export interface LevelSet {
  id: number
  name: string
  maps: Level[]
}
export const levelSets: LevelSet[] = [
  {
    id: 1,
    name: 'Gradus ad Olympo',
    maps: formatMaps(maps2),
  },
  {
    id: 2,
    name: 'Magic Sokoban',
    maps: formatMaps(maps3),
  },
  {
    id: 3,
    name: 'Homz Challenge',
    maps: formatMaps(maps4),
  },
  {
    id: 4,
    name: '挑战关卡1',
    maps: formatMaps(maps),
  },
  {
    id: 5,
    name: 's1',
    maps: formatMaps(maps5),
  },
  {
    id: 6,
    name: 'm2',
    maps: formatMaps(maps6),
  },
  {
    id: 7,
    name: 'zika_1',
    maps: formatMaps(maps7),
  },
]
export let levels: Level[] = formatMaps(maps4)

export function formatMaps(maps: Maps) {
  return maps.map((map, index) => {
    return {
      id: index,
      name: `第${index + 1}关`,
      map: map,
    }
  })
}
export function setLevels(maps: Maps) {
  levels = formatMaps(maps)
}

// 使用之前的转换函数
export function convertSokobanLevel(levelStr: string) {
  return levelStr
    .split('|') // 根据竖杠分割行
    .map((row) => {
      return Array.from(row) // 将每行转为字符数组
        .map((c) => {
          switch (c) {
            case '#':
              return 1 // 墙
            case ' ':
            case '-':
              return 2 // 可行走区域
            case '@':
              return 6 // 人物
            case '.':
              return 3 // 目标位置
            case '$':
              return 4 // 箱子
            case '*':
              return 5 // 箱子在目标上
            case '+':
              return 7 // 人物在目标上
            case '_':
              return 0
            default:
              return 0 // 其他字符处理为不可达
          }
        })
        .filter((cell) => cell !== 0) // 可选：自动移除不可达区域
    })
    .filter((row) => row.length > 0) // 过滤空行
}
