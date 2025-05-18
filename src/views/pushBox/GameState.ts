import { ref } from 'vue'
import { levels, type Level } from './levels.ts'

/**
 * 游戏地图单元格类型:
 * 0 - 不可达区域
 * 1 - 墙
 * 2 - 可行走空间
 * 3 - 目标位置
 * 4 - 箱子
 * 5 - 处于目标位置的箱子
 * 6 - 人物
 * 7 - 人物与目标重合
 */
type CellValue = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7
type GameMap = CellValue[][]

interface GameState {
  currentMap: GameMap
  initialMap: GameMap
  history: GameMap[]
  currentLevel: number
}
const state = ref<GameState>({
  currentMap: [],
  initialMap: [],
  history: [],
  currentLevel: 0,
})
/**
 * 游戏状态管理
 */
export function useGameState() {
  /**
   * 初始化游戏状态
   * @param level 关卡数据
   */
  const initGame = (level: Level) => {
    console.log('initGame')
    state.value.currentMap = JSON.parse(JSON.stringify(level.map))
    state.value.initialMap = JSON.parse(JSON.stringify(level.map))
    state.value.history = []
    state.value.currentLevel = level.id
  }

  /**
   * 保存当前状态到历史记录
   */
  const saveState = () => {
    state.value.history.push(JSON.parse(JSON.stringify(state.value.currentMap)))
  }

  /**
   * 撤销上一步操作
   */
  const undo = () => {
    if (state.value.history.length > 0) {
      state.value.currentMap = state.value.history.pop() as GameMap
    }
  }

  /**
   * 重置游戏状态
   */
  const reset = () => {
    state.value.currentMap = JSON.parse(JSON.stringify(state.value.initialMap))
    state.value.history = []
  }

  const saveStateToLocalStorage = () => {
    localStorage.setItem('gameState', JSON.stringify(state.value))
  }

  const loadStateFromLocalStorage = () => {
    const savedState = localStorage.getItem('gameState')
    if (savedState) {
      const parsedState = JSON.parse(savedState)
      state.value.currentMap = parsedState.currentMap
      state.value.initialMap = parsedState.initialMap
      state.value.history = parsedState.history
      state.value.currentLevel = parsedState.currentLevel
    } else {
      initGame(levels[state.value.currentLevel])
    }
  }

  return {
    state,
    initGame,
    saveState,
    undo,
    reset,
    saveStateToLocalStorage,
    loadStateFromLocalStorage,
  }
}
