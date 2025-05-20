<script setup lang="ts">
import { useGameState } from './GameState'
import GameCanvas from './GameCanvas.vue'
import GameControl from './GameControl.vue'
const { loadStateFromLocalStorage } = useGameState()
// 初始化第一关
loadStateFromLocalStorage()

</script>

<template>
  <div class="push-box-container">
    <GameControl />
    <GameCanvas />
  </div>
</template>

<style scoped>
.push-box-container {
  height: 100vh;
  margin: 0 auto;
  padding: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
}
</style>
