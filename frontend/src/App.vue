<template>
  <div id="app">
    <router-view />
    <FloatingTimer />
  </div>
</template>

<script>
import { onMounted } from 'vue'
import FloatingTimer from './components/FloatingTimer.vue'
import { useTimerStore } from './stores/timer'

export default {
  name: 'App',
  components: {
    FloatingTimer
  },
  setup() {
    onMounted(() => {
      const timerStore = useTimerStore()
      timerStore.checkActiveSession()
    })
  }
}
</script>

<style>
#app {
  min-height: 100vh;
}
</style>
