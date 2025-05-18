<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { Select, Button, message, Modal } from 'ant-design-vue'
import { useGameState } from './GameState'
import { levels } from './levels'

const { state,initGame, saveState, undo, reset, saveStateToLocalStorage } = useGameState()
const selectedLevel = ref<number>(1)
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
 * 处理关卡切换
 */
const handleLevelChange = () => {
  const level = levels.find((l) => l.id === selectedLevel.value)
  console.log(level)
  if (level) {
    state.value.currentLevel = level.id
    initGame(level)
    console.log('initGame')

    message.success(`已切换到关卡: ${level.name}`)
  }
}

/**
 * 处理键盘事件
 * @param e 键盘事件对象
 */
const handleKeyDown = (e: KeyboardEvent) => {
  // 保存当前状态到历史记录

  if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return
  saveState()
  // 根据按键移动人物
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
  if (checkGameEnd()) {
    // 游戏结束
    message.success('恭喜你，游戏结束！')

    Modal.confirm({
      title: '游戏结束',
      content: '恭喜你，游戏结束！是否继续下一关？',
      okText: '确定',
      cancelText: '重玩',
      onOk() {
        state.value.currentLevel = (state.value.currentLevel + 1) % levels.length
        initGame(levels[state.value.currentLevel])
      },
      onCancel() {
        initGame(levels[state.value.currentLevel])
      },
    })
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
  let playerX = -1,
    playerY = -1
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

  // 2. 计算目标位置
  const targetX = playerX + dx
  const targetY = playerY + dy

  // 检查边界
  if (targetY < 0 || targetY >= map.length || targetX < 0 || targetX >= map[0].length) return

  const targetCell = map[targetY][targetX]

  // 3. 处理不同目标位置情况
  if (targetCell === 0 || targetCell === 1) {
    // 不可达区域或墙，不能移动
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

    if (boxTargetCell === 0 || boxTargetCell === 1 || boxTargetCell === 4 || boxTargetCell === 5) {
      // 箱子目标位置不可达
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
</script>

<template>
  <div class="game-control">
    <div class="control-panel">
      <Select
        v-model:value="selectedLevel"
        :options="levels.map((l) => ({ value: l.id, label: l.name }))"
        style="width: 200px"
      />
      <Button type="primary" @click="handleLevelChange">跳转</Button>
      <Button @click="undo" :disabled="state.history.length===0">撤销</Button>
      <Button @click="reset" :disabled="state.history.length===0">重置</Button>
    </div>
  </div>
</template>

<style scoped>
.game-control {
  margin-bottom: 20px;
}
.control-panel {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}
</style>
