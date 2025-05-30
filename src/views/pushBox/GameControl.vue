<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useGameState } from './GameState'
import { levels, levelSets, setLevels } from './levels'
import { solveSokoban, type AlgorithmType } from '@/views/pushBox/SokobanSolver.ts'
import { message, Modal } from 'ant-design-vue'
const { state, initGame, saveState, undo, reset, saveStateToLocalStorage, toggleDualMode } =
  useGameState()
const selectedLevel = ref<number>(1)
const selectedLevelSet = ref<number>(1)
watch(
  () => state.value.currentLevel,
  function (value) {
    selectedLevel.value = value
  },
  {
    immediate: true,
  },
)
// 添加键盘事件监听
onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

// 移除键盘事件监听
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})

/**
 * 处理关卡集切换
 */
const handleLevelSetChange = () => {
  const levelSet = levelSets.find((ls) => ls.id === selectedLevelSet.value)
  successLevels.value = []
  if (levelSet) {
    setLevels(levelSet.maps.map((level) => level.map))
    selectedLevel.value = 0
    handleLevelChange()
    message.success(`已切换到关卡集: ${levelSet.name}，第1关`)
  }
}

/**
 * 处理关卡切换
 */
const handleLevelChange = () => {
  const level = levels.find((l) => l.id === selectedLevel.value)
  console.log(level)
  if (level) {
    state.value.currentLevel = level.id
    initGame(level)
    steps.value = []
    message.success(`已切换到关卡: ${level.name}`)
  }
}

/**
 * 处理双人模式切换
 */
const handleDualModeToggle = (checked: boolean) => {
  toggleDualMode()
  message.success(`${checked ? '开启' : '关闭'}双人模式`)
  if (checked) {
    steps.value = []
  }
}

/**
 * 处理键盘事件
 * @param e 键盘事件对象
 */
const handleKeyDown = (e: KeyboardEvent, showDialog: boolean = true) => {
  // 保存当前状态到历史记录
  if (e.key === 'z') {
    undo()
    return
  }

  // 箭头键或WASD键移动
  const isArrowKey = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)
  const isWASDKey = ['w', 'a', 's', 'd'].includes(e.key.toLowerCase())

  if (!isArrowKey && !isWASDKey && e.key !== 'z') return undo()

  // 如果是双人模式，处理WASD键移动第二个玩家
  if (state.value.isDualMode && isWASDKey) {
    saveState()
    switch (e.key.toLowerCase()) {
      case 'w':
        moveSecondPlayer(0, -1)
        break
      case 'a':
        moveSecondPlayer(-1, 0)
        break
      case 's':
        moveSecondPlayer(0, 1)
        break
      case 'd':
        moveSecondPlayer(1, 0)
        break
    }
  }
  // 处理箭头键移动第一个玩家
  else if (isArrowKey) {
    saveState()
    const [playerX1, playerY1] = findPlayerPosition(state.value.currentMap, [6, 7])
    switch (e.key) {
      case 'ArrowUp':
        movePlayer(0, -1)
        break
      case 'ArrowDown':
        movePlayer(0, 1)
        break
      case 'ArrowLeft':
        movePlayer(-1, 0)
        break
      case 'ArrowRight':
        movePlayer(1, 0)
        break
    }
    const [playerX2, playerY2] = findPlayerPosition(state.value.currentMap, [6, 7])
    if (playerX1 === playerX2 && playerY1 === playerY2) {
      state.value.history.pop()
    } else {
      state.value.stepNumber++
    }
    if (e.isTrusted) {
      stopAutoPlay()
      steps.value = []
    }
  }

  if (checkGameEnd()) {
    // 游戏结束
    message.success('恭喜你，游戏结束！')
    window.removeEventListener('keydown', handleKeyDown)
    if (showDialog) {
      Modal.confirm({
        title: '游戏结束',
        content: '恭喜你，游戏结束！是否继续下一关？',
        okText: '确定',
        cancelText: '重玩',
        centered: true,
        onOk() {
          state.value.currentLevel = (state.value.currentLevel + 1) % levels.length
          initGame(levels[state.value.currentLevel])
          steps.value = []
        },
        onCancel() {
          initGame(levels[state.value.currentLevel])
        },
        afterClose() {
          window.addEventListener('keydown', handleKeyDown)
        },
      })
    }
  } else {
    saveStateToLocalStorage()
  }
}

/**
 * 移动玩家
 * @param dx X轴移动方向
 * @param dy Y轴移动方向
 */
const movePlayer = (dx: number, dy: number) => {
  const map = state.value.currentMap

  // 1. 找到玩家当前位置
  const [playerX, playerY] = findPlayerPosition(map, [6, 7])
  if (playerX === -1 || playerY === -1) return

  // 2. 计算目标位置
  const targetX = playerX + dx
  const targetY = playerY + dy

  // 检查边界
  if (targetY < 0 || targetY >= map.length || targetX < 0 || targetX >= map[0].length) return

  const targetCell = map[targetY][targetX]

  // 3. 处理不同目标位置情况
  if (targetCell === 0 || targetCell === 1 || targetCell === 8 || targetCell === 9) {
    // 不可达区域、墙或第二个玩家位置，不能移动
    return
  } else if (targetCell === 2 || targetCell === 3) {
    // 可行走空间或目标位置，可以移动
    const isPlayerOnTarget = map[playerY][playerX] === 7
    map[playerY][playerX] = isPlayerOnTarget ? 3 : 2
    map[targetY][targetX] = targetCell === 3 ? 7 : 6
  } else if (targetCell === 4 || targetCell === 5) {
    // 箱子或处于目标位置的箱子，检查箱子是否可以推动
    const boxTargetX = targetX + dx
    const boxTargetY = targetY + dy

    // 检查箱子目标位置边界
    if (boxTargetY < 0 || boxTargetY >= map.length || boxTargetX < 0 || boxTargetX >= map[0].length)
      return

    const boxTargetCell = map[boxTargetY][boxTargetX]

    if (
      boxTargetCell === 0 ||
      boxTargetCell === 1 ||
      boxTargetCell === 4 ||
      boxTargetCell === 5 ||
      boxTargetCell === 8 ||
      boxTargetCell === 9
    ) {
      // 箱子目标位置不可达或有第二个玩家
      return
    }

    // 推动箱子
    const isPlayerOnTarget = map[playerY][playerX] === 7
    map[playerY][playerX] = isPlayerOnTarget ? 3 : 2
    map[targetY][targetX] = targetCell === 5 ? 7 : 6

    // 更新箱子位置
    if (boxTargetCell === 3) {
      // 箱子推到目标位置
      map[boxTargetY][boxTargetX] = 5
    } else {
      // 箱子推到可行走空间
      map[boxTargetY][boxTargetX] = 4
    }
  }
}

/**
 * 移动第二个玩家
 * @param dx X轴移动方向
 * @param dy Y轴移动方向
 */
const moveSecondPlayer = (dx: number, dy: number) => {
  const map = state.value.currentMap

  // 1. 找到第二个玩家当前位置
  const [playerX, playerY] = findPlayerPosition(map, [8, 9])
  if (playerX === -1 || playerY === -1) return

  // 2. 计算目标位置
  const targetX = playerX + dx
  const targetY = playerY + dy

  // 检查边界
  if (targetY < 0 || targetY >= map.length || targetX < 0 || targetX >= map[0].length) return

  const targetCell = map[targetY][targetX]

  // 3. 处理不同目标位置情况
  if (targetCell === 0 || targetCell === 1 || targetCell === 6 || targetCell === 7) {
    // 不可达区域、墙或第一个玩家位置，不能移动
    return
  } else if (targetCell === 2 || targetCell === 3) {
    // 可行走空间或目标位置，可以移动
    const isPlayerOnTarget = map[playerY][playerX] === 9
    map[playerY][playerX] = isPlayerOnTarget ? 3 : 2
    map[targetY][targetX] = targetCell === 3 ? 9 : 8
  } else if (targetCell === 4 || targetCell === 5) {
    // 箱子或处于目标位置的箱子，检查箱子是否可以推动
    const boxTargetX = targetX + dx
    const boxTargetY = targetY + dy

    // 检查箱子目标位置边界
    if (boxTargetY < 0 || boxTargetY >= map.length || boxTargetX < 0 || boxTargetX >= map[0].length)
      return

    const boxTargetCell = map[boxTargetY][boxTargetX]

    if (
      boxTargetCell === 0 ||
      boxTargetCell === 1 ||
      boxTargetCell === 4 ||
      boxTargetCell === 5 ||
      boxTargetCell === 6 ||
      boxTargetCell === 7
    ) {
      // 箱子目标位置不可达或有第一个玩家
      return
    }

    // 推动箱子
    const isPlayerOnTarget = map[playerY][playerX] === 9
    map[playerY][playerX] = isPlayerOnTarget ? 3 : 2
    map[targetY][targetX] = targetCell === 5 ? 9 : 8

    // 更新箱子位置
    if (boxTargetCell === 3) {
      // 箱子推到目标位置
      map[boxTargetY][boxTargetX] = 5
    } else {
      // 箱子推到可行走空间
      map[boxTargetY][boxTargetX] = 4
    }
  }
}

// 检查游戏是否结束
const checkGameEnd = () => {
  const map = state.value.currentMap
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[y].length; x++) {
      if (map[y][x] === 4) {
        // 如果有箱子不在目标位置，游戏未结束
        return false
      }
    }
  }
  return true
}
const loading = ref(false)
const steps = ref<string[]>([])
const isAutoPlaying = ref(false)
const autoPlayInterval = ref<number | null>(null)
let ctrl: AbortController = new AbortController()
// 计算解决方案步骤
const algorithms = ref<AlgorithmType[]>(['bfs'])
const algorithmOptions = [
  { value: 'bfs', label: 'BFS' },
  { value: 'dfs', label: 'DFS' },
  { value: 'a_star', label: 'A*' },
  // { value: 'bidirectional', label: 'bidirectional' },
  // { value: 'reverse', label: 'reverse' },
]

watch(algorithms, (val, oldVal) => {
  if (val.length === 0) {
    // 如果用户取消了最后一个，强制选择下一个可用算法
    const current = oldVal && oldVal[0]
    let idx = algorithmOptions.findIndex((opt) => opt.value === current)
    idx = (idx + 1) % algorithmOptions.length
    algorithms.value = [algorithmOptions[idx].value as AlgorithmType]
  }
})
const remainingTime = ref(0)
let remainingTimeTimer = -1
function computationalProcedure(timeout: number = 0, enablePathOptimization = true) {
  console.log('计算步骤')
  loading.value = true
  steps.value = []
  ctrl = new AbortController()
  remainingTime.value = timeout / 1000
  remainingTimeTimer = setInterval(() => {
    remainingTime.value--
    if (remainingTime.value <= 0) {
      clearInterval(remainingTimeTimer)
    }
  }, 1000)
  return solveSokoban(
    JSON.parse(JSON.stringify(state.value.currentMap)),
    algorithms.value,
    timeout,
    ctrl.signal,
    enablePathOptimization,
  )
    .then((result) => {
      console.log('解决方案:', result.join('->'))
      steps.value = result
      if (steps.value.length > 0) {
        message.success(`找到解决方案，共${steps.value.length}步`)
      } else {
        message.warning('未找到解决方案')
      }
    })

    .catch(({ message: msg }) => {
      if (msg === 'abort') {
        message.warning('计算已取消')
      } else if (msg === 'timeout') {
        message.warning('计算超时')
      } else {
        message.error('无解')
      }
      return Promise.reject(new Error('计算失败'))
    })
    .finally(() => {
      clearInterval(remainingTimeTimer)
      remainingTime.value = 0
      loading.value = false
    })
}
function handleComputationalProcedure() {
  computationalProcedure()
    .catch(() => {})
    .finally(() => {
      loading.value = false
    })
}
function cancelComputationalProcedure() {
  ctrl.abort()
}
// 按步骤自动行动
function autoPlay(showDialog: boolean = true) {
  return new Promise<void>((resolve) => {
    if (steps.value.length === 0) {
      message.warning('请先计算步骤')
      return
    }

    if (isAutoPlaying.value) {
      // 如果正在自动播放，则停止
      stopAutoPlay()
      return
    }

    isAutoPlaying.value = true
    let currentStep = 0
    function runNextStep() {
      autoPlayInterval.value = setTimeout(() => {
        if (currentStep >= steps.value.length) {
          stopAutoPlay()
          resolve()
          return
        }

        // 执行当前步骤
        const direction = steps.value[currentStep]
        switch (direction) {
          case '上':
            handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowUp' }), showDialog)
            break
          case '下':
            handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowDown' }), showDialog)
            break
          case '左':
            handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowLeft' }), showDialog)
            break
          case '右':
            handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowRight' }), showDialog)
            break
        }
        currentStep++
        runNextStep()
      }, 0)
    }
    runNextStep()
  })
}
const successLevels = ref<number[]>([])
function autoNext() {
  console.clear()
  computationalProcedure(60000 * 2, true)
    .then(async () => {
      successLevels.value.push(state.value.currentLevel + 1)
      await autoPlay(false)
    })
    .catch(() => {})
    .finally(() => {
      if (checkGameEnd()) {
        selectedLevel.value = selectedLevel.value + 1
        if (selectedLevel.value > levels.length - 1) return
        handleLevelChange()
        autoNext()
      }
    })
}
// 停止自动播放
function stopAutoPlay() {
  if (autoPlayInterval.value !== null) {
    clearTimeout(autoPlayInterval.value)
    autoPlayInterval.value = null
  }
  isAutoPlaying.value = false
}

// 组件卸载时清除定时器
onUnmounted(() => {
  stopAutoPlay()
})
/**
 * 查找指定玩家当前位置
 * @param map 地图数组
 * @param playerCodes 玩家对应的编码数组
 * @returns [x, y] 或 [-1, -1] 未找到
 */
function findPlayerPosition(map: number[][], playerCodes: number[]): [number, number] {
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[y].length; x++) {
      if (playerCodes.includes(map[y][x])) {
        return [x, y]
      }
    }
  }
  return [-1, -1]
}
</script>

<template>
  <div class="game-control">
    <div class="control-panel">
      <div class="level-selectors">
        <a-select
          v-model:value="selectedLevelSet"
          :options="levelSets.map((ls) => ({ value: ls.id, label: ls.name }))"
          style="width: 150px"
          @change="handleLevelSetChange"
        />
        <a-select
          v-model:value="selectedLevel"
          :options="levels.map((l) => ({ value: l.id, label: l.name }))"
          style="width: 150px"
          @change="handleLevelChange"
        />
        <a-select
          v-model:value="algorithms"
          mode="multiple"
          :options="algorithmOptions"
          style="width: 200px"
          placeholder="选择算法"
          :disabled="state.isDualMode"
          :max-tag-count="2"
          :max-tag-text-length="4"
          :allow-clear="false"
        />
        <!-- <a-button type="primary" @click="handleLevelChange">跳转</a-button> -->
      </div>
      <div class="game-controls">
        <a-button type="primary" @click="undo" :disabled="state.history.length === 0"
          >撤销</a-button
        >
        <a-button type="primary" danger @click="reset" :disabled="state.history.length === 0"
          >重置</a-button
        >
        <a-button
          type="primary"
          :disabled="state.isDualMode"
          @click="loading ? cancelComputationalProcedure() : handleComputationalProcedure()"
        >
          {{ loading ? `停止计算 ${remainingTime > 0 ? remainingTime : ''}` : '计算步骤' }}
        </a-button>
        <a-button
          @click="autoPlay"
          :disabled="state.isDualMode || !steps.length"
          :type="isAutoPlaying ? 'danger' : 'primary'"
        >
          {{ isAutoPlaying ? '停止行动' : '按步骤行动' }}
        </a-button>
        <a-button type="primary" @click="autoNext">启动</a-button>
        <div class="dual-mode-toggle">
          <span>双人模式:</span>
          <a-switch :checked="state.isDualMode" @change="handleDualModeToggle" />
        </div>
      </div>
    </div>
    <div v-if="state.isDualMode" class="control-info">
      <p>玩家1: 方向键控制 | 玩家2: WASD键控制</p>
    </div>
    <div v-if="successLevels.length" class="success-levels">
      {{ successLevels }}
    </div>
    <div class="steps-info" v-if="steps.length">
      <p>当前步骤: {{ steps.join('->') }}</p>
    </div>
  </div>
</template>

<style scoped>
.game-control {
  margin-bottom: 20px;
}
.control-panel {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 10px;
}
.level-selectors,
.game-controls {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}
.dual-mode-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
}
.control-info,
.steps-info {
  font-size: 14px;
  color: #666;
  margin-top: 5px;
}
.steps-info {
  max-height: 100px;
  overflow-y: auto;
  color: brown;
  max-width: 900px;
  margin: 0 auto;
}
</style>
