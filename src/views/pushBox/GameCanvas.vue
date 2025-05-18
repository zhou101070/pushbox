<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useGameState } from './GameState'
import cargo from './gameImages/cargo.png'
import cargo_on_target from './gameImages/cargo_on_target.png'
import empty from './gameImages/empty.png'
import floor from './gameImages/floor.png'
import keeper from './gameImages/keeper.png'
import keeper_on_target from './gameImages/keeper_on_target.png'
import target from './gameImages/target.png'
import wall from './gameImages/wall.png'

const { state } = useGameState()
const canvasRef = ref<HTMLCanvasElement | null>(null)
const loadedImages = ref<Record<number, HTMLImageElement>>({})

// 预加载图片
const preloadImages = async () => {
  const promises = Object.entries(config.images).map(([key, src]) => {
    return new Promise<void>((resolve) => {
      const img = new Image()
      img.src = src
      img.onload = () => {
        loadedImages.value[parseInt(key)] = img
        resolve()
      }
    })
  })
  await Promise.all(promises)
}

// 配置项
const config = {
  cellSize: 50, // 每个格子的大小
  images: {
    0: empty, // 不可达区域图片路径
    1: wall, // 墙图片路径
    2: floor, // 可行走空间图片路径
    3: target, // 目标位置图片路径
    4: cargo, // 箱子图片路径
    5: cargo_on_target, // 处于目标位置的箱子图片路径
    6: keeper, // 人物图片路径
    7: keeper_on_target, // 人物与目标重合的图片路径
  },
}

/**
 * 渲染游戏地图
 */
const renderMap = () => {
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // 确保图片已加载
  if (Object.keys(loadedImages.value).length !== Object.keys(config.images).length) {
    return
  }

  // 清空画布
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // 设置画布大小
  const rows = state.value.currentMap.length
  const cols = rows > 0 ? state.value.currentMap[0].length : 0
  canvas.width = cols * config.cellSize
  canvas.height = rows * config.cellSize

  // 渲染每个格子
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cellValue = state.value.currentMap[y][x]
      const img = loadedImages.value[cellValue]
      ctx.drawImage(img, x * config.cellSize, y * config.cellSize, config.cellSize, config.cellSize)
    }
  }
}

// 监听地图变化重新渲染
watch(() => state.value.currentMap, renderMap, { deep: true })

onMounted(async () => {
  await preloadImages()
  renderMap()
})
</script>

<template>
  <canvas ref="canvasRef"></canvas>
</template>

<style scoped>
canvas {
  border: 1px solid #ddd;
  margin: 0 auto;
  display: block;
}
</style>
