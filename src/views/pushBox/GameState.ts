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
 * 8 - 第二个人物
 * 9 - 第二个人物与目标重合
 */
type CellValue = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
type GameMap = CellValue[][]

interface GameState {
  currentMap: GameMap
  initialMap: GameMap
  history: GameMap[]
  currentLevel: number
  isDualMode: boolean
}
const state = ref<GameState>({
  currentMap: [],
  initialMap: [],
  history: [],
  currentLevel: 0,
  isDualMode: false,
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
    state.value.currentMap = JSON.parse(JSON.stringify(level.map))
    state.value.initialMap = JSON.parse(JSON.stringify(level.map))
    state.value.history = []
    state.value.currentLevel = level.id
    
    if (state.value.isDualMode) {
      addSecondPlayer()
    }
  }

  /**
   * 添加第二个玩家
   */
  const addSecondPlayer = () => {
    const map = state.value.currentMap
    
    // 找到第一个玩家位置
    let playerX = -1, playerY = -1
    for (let y = 0; y < map.length; y++) {
      for (let x = 0; x < map[y].length; x++) {
        if (map[y][x] === 6 || map[y][x] === 7) {
          playerX = x
          playerY = y
          break
        }
      }
      if (playerX !== -1) break
    }
    
    if (playerX === -1 || playerY === -1) return
    
    // 检查玩家周围四个方向，找到第一个可放置位置
    const directions = [
      { dx: 0, dy: -1 }, // 上
      { dx: 1, dy: 0 },  // 右
      { dx: 0, dy: 1 },  // 下
      { dx: -1, dy: 0 }, // 左
    ]
    
    for (const { dx, dy } of directions) {
      const newX = playerX + dx
      const newY = playerY + dy
      
      // 检查边界
      if (newY < 0 || newY >= map.length || newX < 0 || newX >= map[0].length) continue
      
      const cell = map[newY][newX]
      
      // 如果是可行走空间或目标位置，放置第二个玩家
      if (cell === 2) {
        map[newY][newX] = 8
        break
      } else if (cell === 3) {
        map[newY][newX] = 9
        break
      }
    }
    
    // 更新初始地图状态
    state.value.initialMap = JSON.parse(JSON.stringify(map))
  }

  /**
   * 切换双人模式
   */
  const toggleDualMode = () => {
    state.value.isDualMode = !state.value.isDualMode
    const currentLevel = levels[state.value.currentLevel]
    initGame(currentLevel)
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
      console.log(JSON.parse(JSON.stringify(state.value.currentMap)))
      state.value.currentMap = state.value.history.pop() as GameMap
      console.log(JSON.parse(JSON.stringify(state.value.currentMap)))
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
    initGame(levels[state.value.currentLevel])
    // const savedState = localStorage.getItem('gameState')
    // if (savedState) {
    //   const parsedState = JSON.parse(savedState)
    //   state.value.currentMap = parsedState.currentMap
    //   state.value.initialMap = parsedState.initialMap
    //   state.value.history = parsedState.history
    //   state.value.currentLevel = parsedState.currentLevel
    // } else {
    //   initGame(levels[state.value.currentLevel])
    // }
  }

  return {
    state,
    initGame,
    saveState,
    undo,
    reset,
    saveStateToLocalStorage,
    loadStateFromLocalStorage,
    toggleDualMode,
  }
}

