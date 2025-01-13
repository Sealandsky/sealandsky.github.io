<template>
  <div class="app">
    <h1>汉字笔顺演示</h1>
    <StrokeOrder />
  </div>
</template>

<script setup>
import StrokeOrder from './components/StrokeOrder.vue'
</script>

<style>
.app {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  text-align: center;
}

h1 {
  color: #333;
  margin-bottom: 30px;
}
</style> 