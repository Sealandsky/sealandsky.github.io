<template>
  <div class="stroke-order">
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <div>加载中...</div>
    </div>
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
    <div class="input-section">
      <input 
        v-model="character" 
        @input="handleInput"
        maxlength="1" 
        placeholder="请输入汉字"
        class="character-input"
      >
    </div>
    
    <div class="display-section">
      <div class="stroke-info" v-if="currentStrokeName">
        当前笔画：{{ currentStrokeName }}
      </div>
      
      <div class="writers-container">
        <svg ref="hanziWriterTarget" class="character-display" :width="300" :height="300">
          <!-- 添加网格背景 -->
          <defs>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#DDD" stroke-width="1"/>
            </pattern>
          </defs>
          <!-- 背景矩形 -->
          <rect width="100%" height="100%" fill="url(#grid)"/>
          <!-- 对角线 -->
          <line x1="0" y1="0" x2="300" y2="300" stroke="#DDD" />
          <line x1="300" y1="0" x2="0" y2="300" stroke="#DDD" />
          <!-- 中心线 -->
          <line x1="150" y1="0" x2="150" y2="300" stroke="#DDD" />
          <line x1="0" y1="150" x2="300" y2="150" stroke="#DDD" />
        </svg>
      </div>
      
      <div class="stroke-progress">
        <div class="stroke-steps" ref="strokeStepsTarget">
          <!-- 笔画进展将在这里动态渲染 -->
        </div>
      </div>
      
      <div class="controls">
        <button @click="animate" :disabled="isAnimating">播放动画</button>
        <div class="speed-control">
          <label>速度：</label>
          <select v-model="speed" @change="updateSpeed">
            <option value="0.5">慢速</option>
            <option value="1">中速</option>
            <option value="2">快速</option>
          </select>
        </div>
        <div class="grid-control">
          <label>
            <input type="checkbox" v-model="showGrid" @change="toggleGrid">
            显示网格
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const character = ref('')
const hanziWriterTarget = ref(null)
const rawCharacterTarget = ref(null)
const currentStrokeName = ref('')
const isAnimating = ref(false)
const speed = ref('1')
const strokePaths = ref([])
const characterCache = new Map()
const showGrid = ref(true)
let writer = null
const strokeStepsTarget = ref(null)
const loading = ref(false)
const error = ref('')

const strokeNames = {
  横: 'horizontal',
  竖: 'vertical',
  撇: 'slash',
  点: 'dot',
  捺: 'press',
  提: 'raise',
  钩: 'hook',
  折: 'bend'
}

const renderFanningStrokes = (strokes) => {
  if (!strokeStepsTarget.value) return
  
  // 清空现有内容
  strokeStepsTarget.value.innerHTML = ''
  
  // 为每个笔画进度创建 SVG
  for (let i = 0; i < strokes.length; i++) {
    const strokesPortion = strokes.slice(0, i + 1)
    
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.style.width = '75px'
    svg.style.height = '75px'
    svg.style.border = '1px solid #EEE'
    svg.style.marginRight = '3px'
    
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    
    // 使用 HanziWriter 的缩放转换
    const transformData = HanziWriter.getScalingTransform(75, 75)
    group.setAttributeNS(null, 'transform', transformData.transform)
    svg.appendChild(group)
    
    // 渲染每个笔画
    strokesPortion.forEach(strokePath => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      path.setAttributeNS(null, 'd', strokePath)
      path.style.fill = '#555'
      group.appendChild(path)
    })
    
    // 添加点击事件
    svg.onclick = () => {
      if (writer) {
        writer.reset()
        for (let j = 0; j <= i; j++) {
          writer.showStroke(j)
        }
      }
    }
    
    const container = document.createElement('div')
    container.className = 'stroke-step-container'
    
    container.appendChild(svg)
    
    const label = document.createElement('div')
    label.className = 'stroke-step-label'
    label.textContent = `第 ${i + 1} 笔`
    container.appendChild(label)
    
    strokeStepsTarget.value.appendChild(container)
  }
}

const loadCharacterData = async (char) => {
  loading.value = true
  error.value = ''
  try {
    if (characterCache.has(char)) {
      strokePaths.value = characterCache.get(char)
      renderFanningStrokes(strokePaths.value)
      return
    }

    const response = await fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/${encodeURIComponent(char)}.json`)
    if (!response.ok) throw new Error('暂不支持该汉字')
    const data = await response.json()
    strokePaths.value = data.strokes
    characterCache.set(char, data.strokes)
    renderFanningStrokes(data.strokes)
  } catch (err) {
    error.value = err.message || '加载失败，请稍后重试'
    strokePaths.value = []
  } finally {
    loading.value = false
  }
}

const checkHanziWriter = () => {
  if (typeof HanziWriter === 'undefined') {
    console.error('HanziWriter is not loaded')
    return false
  }
  return true
}

const initWriter = (char) => {
  if (!checkHanziWriter()) return null

  if (writer) {
    writer.setCharacter(char)
    return writer
  } else {
    const newWriter = HanziWriter.create(hanziWriterTarget.value, char, {
      width: 300,
      height: 300,
      padding: 5,
      showOutline: true,
      strokeAnimationSpeed: Number(speed.value),
      delayBetweenStrokes: 1000,
      strokeColor: '#000',
      outlineColor: '#ddd',
      radicalColor: '#337ab7',
      charColor: 'transparent',
      showCharacter: true,
      showOutline: false,
      strokeHighlightSpeed: 0,
      drawingWidth: 2,
      strokeWidth: 2,
      onLoadCharDataError: (error) => {
        console.error('Failed to load character data:', error)
      },
      onLoadCharDataSuccess: () => {
        console.log('Character data loaded successfully')
        newWriter.showCharacter()
      }
    })

    return newWriter
  }
}

const handleInput = async () => {
  if (character.value) {
    writer = initWriter(character.value)
    await loadCharacterData(character.value)
  }
}

const animate = async () => {
  if (!writer) return
  isAnimating.value = true
  try {
    await writer.animateCharacter()
  } finally {
    isAnimating.value = false
  }
}

const updateSpeed = () => {
  if (writer && typeof writer.setOptions === 'function') {
    writer.setOptions({ strokeAnimationSpeed: Number(speed.value) })
  }
}

const toggleGrid = () => {
  const grid = document.getElementById('grid')
  const gridLines = hanziWriterTarget.value.querySelectorAll('line')
  if (grid && gridLines) {
    const visibility = showGrid.value ? 'visible' : 'hidden'
    grid.style.visibility = visibility
    gridLines.forEach(line => line.style.visibility = visibility)
  }
}

onMounted(() => {
  if (character.value) {
    writer = initWriter(character.value)
  }
})

onUnmounted(() => {
  if (writer && typeof writer.destroy === 'function') {
    writer.destroy()
  }
})
</script>

<style scoped>
.stroke-order {
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.character-input {
  font-size: 24px;
  padding: 8px;
  width: 60px;
  text-align: center;
  border: 2px solid #ddd;
  border-radius: 4px;
}

.writers-container {
  display: flex;
  gap: 20px;
  justify-content: center;
  width: 100%;
}

.character-display {
  width: 300px;
  height: 300px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

.loading-message {
  color: #666;
  font-size: 14px;
}

svg {
  max-width: 100%;
  max-height: 100%;
  position: absolute;
}

.controls {
  margin-top: 10px;
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
}

.stroke-info {
  margin-bottom: 10px;
  font-size: 16px;
  color: #666;
  min-height: 24px;
}

button {
  padding: 8px 16px;
  cursor: pointer;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  transition: background-color 0.3s;
}

button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

button:hover:not(:disabled) {
  background-color: #45a049;
}

.speed-control {
  display: flex;
  align-items: center;
  gap: 5px;
}

select {
  padding: 4px;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.stroke-progress {
  margin-top: 20px;
  width: 100%;
  overflow-x: auto;
}

.stroke-steps {
  display: flex;
  padding: 10px;
  min-height: 77px;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 10px;
}

.stroke-steps svg {
  background: white;
  border-radius: 4px;
  transition: transform 0.2s;
}

.stroke-steps svg:hover {
  transform: scale(1.1);
  cursor: pointer;
}

.grid-control {
  display: flex;
  align-items: center;
  gap: 5px;
}

.grid-control label {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
}

.grid-control input[type="checkbox"] {
  cursor: pointer;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message {
  color: #ff4444;
  padding: 10px;
  margin: 10px 0;
  border: 1px solid #ffdddd;
  border-radius: 4px;
  background-color: #ffeeee;
}
</style> 