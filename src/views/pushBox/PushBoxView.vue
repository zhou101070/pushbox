<script setup lang="ts">
import { useGameState } from './GameState'
import GameCanvas from './GameCanvas.vue'
import GameControl from './GameControl.vue'
const { loadStateFromLocalStorage, state } = useGameState()
// 初始化第一关
loadStateFromLocalStorage()
</script>

<template>
  <div class="push-box-container">
    <div class="step-counter">步数：{{ state.stepNumber }}</div>
    <GameControl />
    <GameCanvas />
  </div>
</template>

<style scoped>
.push-box-container {
  min-height: 100vh;
  margin: 0 auto;
  padding: 20px;
  display: flex;
  overflow-y: auto;
  justify-content: center;
  align-items: center;
  flex-direction: column;
}
.step-counter {
  font-size: 1.3rem;
  font-weight: bold;
  color: #1976d2;
  background: #e3f2fd;
  border-radius: 8px;
  padding: 8px 20px;
  margin-bottom: 18px;
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.08);
  letter-spacing: 1px;
}
</style>
