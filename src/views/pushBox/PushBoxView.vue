<script setup lang="ts">
import { useGameState } from './GameState'
import { levels } from './levels'
import GameCanvas from './GameCanvas.vue'
import GameControl from './GameControl.vue'

const { initGame, state } = useGameState()
// 初始化第一关
initGame(levels[state.value.currentLevel])
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
