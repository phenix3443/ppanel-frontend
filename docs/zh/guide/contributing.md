# 贡献者

感谢所有为 PPanel 项目做出贡献的开发者！

## 项目贡献者

PPanel 是一个开源项目，我们欢迎并感谢所有形式的贡献，包括但不限于：

- 💻 代码贡献
- 📝 文档改进
- 🐛 Bug 报告
- 💡 功能建议
- 🌍 翻译工作
- ⭐ Star 和推广

## 核心贡献者

<script setup>
import { ref, onMounted } from 'vue'

const backendContributors = ref([])
const frontendContributors = ref([])
const backendLoading = ref(true)
const frontendLoading = ref(true)

onMounted(async () => {
  // 获取后端相关仓库的贡献者
  try {
    const repos = ['server', 'ppanel', 'ppanel-node', 'subscription-template']
    const contributorsMap = new Map()

    for (const repo of repos) {
      const response = await fetch(`https://api.github.com/repos/perfect-panel/${repo}/contributors`)
      if (response.ok) {
        const contributors = await response.json()
        contributors.forEach(contributor => {
          if (!contributorsMap.has(contributor.login)) {
            contributorsMap.set(contributor.login, {
              login: contributor.login,
              avatar_url: contributor.avatar_url,
              html_url: contributor.html_url,
              contributions: contributor.contributions
            })
          } else {
            const existing = contributorsMap.get(contributor.login)
            existing.contributions += contributor.contributions
          }
        })
      }
    }

    backendContributors.value = Array.from(contributorsMap.values())
      .sort((a, b) => b.contributions - a.contributions)
  } catch (error) {
    console.error('Failed to fetch backend contributors:', error)
  } finally {
    backendLoading.value = false
  }

  // 获取前端相关仓库的贡献者
  try {
    const repos = ['frontend', 'backend']
    const contributorsMap = new Map()

    for (const repo of repos) {
      const response = await fetch(`https://api.github.com/repos/perfect-panel/${repo}/contributors`)
      if (response.ok) {
        const contributors = await response.json()
        contributors.forEach(contributor => {
          if (!contributorsMap.has(contributor.login)) {
            contributorsMap.set(contributor.login, {
              login: contributor.login,
              avatar_url: contributor.avatar_url,
              html_url: contributor.html_url,
              contributions: contributor.contributions
            })
          } else {
            const existing = contributorsMap.get(contributor.login)
            existing.contributions += contributor.contributions
          }
        })
      }
    }

    frontendContributors.value = Array.from(contributorsMap.values())
      .sort((a, b) => b.contributions - a.contributions)
  } catch (error) {
    console.error('Failed to fetch frontend contributors:', error)
  } finally {
    frontendLoading.value = false
  }
})
</script>

### 后端仓库贡献者

<div v-if="backendLoading" class="contributors-loading">
  <div class="loading-spinner"></div>
  <p>正在加载贡献者信息...</p>
</div>

<div v-else-if="backendContributors.length === 0" class="contributors-empty">
  <p>暂无贡献者数据</p>
</div>

<div v-else>
  <div class="contributors-grid">
    <a
      v-for="contributor in backendContributors"
      :key="contributor.login"
      :href="contributor.html_url"
      target="_blank"
      rel="noopener noreferrer"
      class="contributor-card"
    >
      <img
        :src="contributor.avatar_url"
        :alt="contributor.login"
        class="contributor-avatar"
        loading="lazy"
      />
      <div class="contributor-info">
        <div class="contributor-name" :title="contributor.login">{{ contributor.login }}</div>
        <div class="contributor-contributions">
          <svg class="contribution-icon" viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
            <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"></path>
          </svg>
          {{ contributor.contributions }} 次贡献
        </div>
      </div>
    </a>
  </div>
</div>

### 前端仓库贡献者

<div v-if="frontendLoading" class="contributors-loading">
  <div class="loading-spinner"></div>
  <p>正在加载贡献者信息...</p>
</div>

<div v-else-if="frontendContributors.length === 0" class="contributors-empty">
  <p>暂无贡献者数据</p>
</div>

<div v-else>
  <div class="contributors-grid">
    <a
      v-for="contributor in frontendContributors"
      :key="contributor.login"
      :href="contributor.html_url"
      target="_blank"
      rel="noopener noreferrer"
      class="contributor-card"
    >
      <img
        :src="contributor.avatar_url"
        :alt="contributor.login"
        class="contributor-avatar"
        loading="lazy"
      />
      <div class="contributor-info">
        <div class="contributor-name" :title="contributor.login">{{ contributor.login }}</div>
        <div class="contributor-contributions">
          <svg class="contribution-icon" viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
            <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"></path>
          </svg>
          {{ contributor.contributions }} 次贡献
        </div>
      </div>
    </a>
  </div>
</div>

<style scoped>
.contributors-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: var(--vp-c-text-2);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--vp-c-divider);
  border-top-color: var(--vp-c-brand);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.contributors-empty {
  text-align: center;
  padding: 2rem;
  color: var(--vp-c-text-3);
  font-style: italic;
}

.contributors-stats {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.stat-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 1rem;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  color: var(--vp-c-text-2);
}

.contributors-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1rem;
  margin: 1.5rem 0;
}

.contributor-card {
  display: flex;
  align-items: center;
  padding: 1rem;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  text-decoration: none;
  color: var(--vp-c-text-1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.contributor-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--vp-c-brand), var(--vp-c-brand-light));
  transform: scaleX(0);
  transition: transform 0.3s ease;
}

.contributor-card:hover {
  border-color: var(--vp-c-brand-light);
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.contributor-card:hover::before {
  transform: scaleX(1);
}

.contributor-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  margin-right: 1rem;
  border: 2px solid var(--vp-c-divider);
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.contributor-card:hover .contributor-avatar {
  border-color: var(--vp-c-brand);
  transform: scale(1.05);
}

.contributor-info {
  flex: 1;
  min-width: 0;
}

.contributor-name {
  font-weight: 600;
  font-size: 15px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 0.25rem;
  color: var(--vp-c-text-1);
}

.contributor-contributions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.contribution-icon {
  opacity: 0.6;
}

@media (max-width: 768px) {
  .contributors-grid {
    grid-template-columns: 1fr;
  }

  .contributors-stats {
    flex-direction: column;
  }

  .stat-badge {
    width: 100%;
    justify-content: center;
  }
}

@media (prefers-color-scheme: dark) {
  .contributor-card:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  }
}
</style>

### 报告问题

如果你发现了 Bug 或有功能建议：

1. 在 [GitHub Issues](https://github.com/perfect-panel/frontend/issues) 中搜索是否已有类似问题
2. 如果没有，创建一个新的 Issue
3. 提供详细的信息：
   - 问题描述
   - 复现步骤
   - 预期行为
   - 实际行为
   - 环境信息（浏览器、操作系统等）
   - 截图或错误日志（如果适用）

### 文档贡献

文档同样重要！你可以：

- 修正错别字和语法错误
- 改进现有文档的清晰度
- 添加缺失的文档
- 翻译文档到其他语言
- 添加使用示例和教程

文档源文件位于 `/docs` 目录中。

### 翻译贡献

我们欢迎将 PPanel 翻译成更多语言：

1. 检查 `/docs` 目录下是否已有目标语言的文件夹
2. 如果没有，创建新的语言文件夹（如 `/docs/ja` 为日语）
3. 复制英文或中文版本作为基础
4. 翻译内容
5. 在 `.vitepress/config.mts` 中添加新语言配置
6. 提交 Pull Request

## 社区

加入我们的社区，与其他开发者交流：

- **GitHub Discussions**: [讨论区](https://github.com/perfect-panel/frontend/discussions)
- **GitHub Issues**: [问题追踪](https://github.com/perfect-panel/frontend/issues)
- **Telegram**: [加入群组](https://t.me/PPanelChat)

## 行为准则

我们致力于为所有人提供一个友好、安全和受欢迎的环境。请阅读并遵守我们的 [行为准则](https://github.com/perfect-panel/frontend/blob/main/CODE_OF_CONDUCT.md)。

## 致谢

特别感谢所有为 PPanel 项目做出贡献的开发者、测试者、文档编写者和社区成员。是你们让 PPanel 变得更好！

## 许可证

通过贡献代码，你同意你的贡献将按照项目的 [GNU License](https://github.com/perfect-panel/frontend/blob/main/LICENSE) 许可证发布。
