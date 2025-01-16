<template>
  <div class="stroke-order">
    <div class="header">
      <h2>汉字笔顺</h2>
      <p class="subtitle">输入汉字，即刻查看笔顺动画</p>
    </div>
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
        :class="{ 'has-value': character }"
      >
      <div class="input-hint">{{ character ? '按下播放按钮开始动画' : '请输入一个汉字' }}</div>
    </div>
    
    <div class="display-section">
      <div class="writers-container">
        <svg ref="hanziWriterTarget" class="character-display" :width="300" :height="300">
          <defs>
            <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#f0f0f0" stroke-width="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)"/>
          <line x1="0" y1="150" x2="300" y2="150" stroke="#f0f0f0" />
          <line x1="150" y1="0" x2="150" y2="300" stroke="#f0f0f0" />
        </svg>
      </div>
      
      <div class="stroke-progress">
        <div class="stroke-steps" ref="strokeStepsTarget"></div>
      </div>
      
      <div class="controls">
        <button 
          @click="animate" 
          :disabled="isAnimating || !character"
          class="play-button"
        >
          <span class="button-icon">▶</span>
          {{ isAnimating ? '播放中...' : '播放动画' }}
        </button>
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
    svg.style.width = '60px'
    svg.style.height = '60px'
    svg.style.border = '1px solid #EEE'
    svg.style.marginRight = '3px'
    svg.style.borderRadius = '6px'
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    
    // 使用 HanziWriter 的缩放转换
    const transformData = HanziWriter.getScalingTransform(60, 60)
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
      radicalColor: '#4CAF50',
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
  gap: 30px;
  max-width: 600px;
  margin: 0 auto;
}

.header {
  text-align: center;
}

.header h2 {
  font-size: 2rem;
  color: #333;
  margin-bottom: 8px;
}

.subtitle {
  color: #666;
  font-size: 1rem;
}

.input-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.character-input {
  font-size: 32px;
  padding: 12px;
  width: 80px;
  height: 80px;
  text-align: center;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  transition: all 0.3s ease;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.character-input:focus {
  border-color: #4CAF50;
  box-shadow: 0 2px 12px rgba(76,175,80,0.2);
  outline: none;
}

.input-hint {
  color: #666;
  font-size: 0.9rem;
}

.character-display {
  border: 1px solid #eee;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 4px 16px rgba(0,0,0,0.05);
  transition: all 0.3s ease;
}
.stroke-step-label {
  font-size: 14px;
  color: #999;
}
.play-button {
  margin: 0 auto;
  padding: 12px 24px;
  font-size: 1.1rem;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
  min-width: 140px;
  justify-content: center;
}

.play-button:hover:not(:disabled) {
  background: #45a049;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(76,175,80,0.2);
}

.play-button:disabled {
  background: #cccccc;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.button-icon {
  font-size: 0.9em;
}

.stroke-steps {
  display: flex;
  padding: 15px;
  gap: 15px;
  justify-content: center;
  flex-wrap: wrap;
  /* background: #f9f9f9; */
  border-radius: 12px;
}

@media (max-width: 600px) {
  .stroke-order {
    padding: 15px;
  }
  
  .character-input {
    font-size: 28px;
    width: 70px;
    height: 70px;
  }
}
</style> 