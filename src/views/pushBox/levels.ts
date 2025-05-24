import {
  maps,
  maps10,
  maps12,
  maps13,
  maps14,
  maps15,
  maps16,
  maps2,
  maps3,
  maps4,
  maps5,
  maps6,
  maps7,
  maps8,
  maps9,
  type Maps,
} from './maps'
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
    name: 'Gradus ad Olympo',
    maps: formatMaps(maps2),
  },
  {
    name: 'Magic Sokoban',
    maps: formatMaps(maps3),
  },
  {
    name: 'Homz Challenge',
    maps: formatMaps(maps4),
  },
  {
    name: 'XXZhongJi600',
    maps: formatMaps(maps16),
  },
  {
    name: '挑战关卡1',
    maps: formatMaps(maps),
  },
  {
    name: 's1',
    maps: formatMaps(maps5),
  },
  {
    name: 's2',
    maps: formatMaps(maps12),
  },
  {
    name: 'm1',
    maps: formatMaps(maps9),
  },
  {
    name: 'm2',
    maps: formatMaps(maps6),
  },
  {
    name: 'm3',
    maps: formatMaps(maps10),
  },
  {
    name: 'm4',
    maps: formatMaps(maps13),
  },
  {
    name: 'zika_1',
    maps: formatMaps(maps7),
  },
  {
    name: 'zika_2',
    maps: formatMaps(maps14),
  },
  {
    name: '696',
    maps: formatMaps(maps15),
  },
  {
    name: 'taptap',
    maps: formatMaps(maps8),
  },
].map((set, index) => {
  return {
    ...set,
    id: index + 1,
  }
})
export let levels: Level[] = levelSets[0].maps

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
    })
    .filter((row) => row.length > 0) // 过滤空行
}
