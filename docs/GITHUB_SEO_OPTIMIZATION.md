# GitHub SEO 优化指南 | GitHub SEO Optimization Guide

> 本文档汇总了 deepcode-cli 项目的 SEO 优化策略和实施清单。

---

## ✅ 已完成的优化

### 1. Package.json 优化
- ✅ 更新了 `description` — 包含核心关键词：AI coding assistant, DeepSeek, terminal, web search, bug fixing
- ✅ 添加了 `keywords` 数组 — 16个相关标签
- ✅ 修复了 `repository.url` — 指向正确的仓库地址

### 2. README.md 优化（中文）
- ✅ 标题优化 — 添加 "AI Coding Assistant for Terminal" 副标题
- ✅ 添加 npm 下载量徽章
- ✅ 添加 TypeScript 徽章
- ✅ 优化开头描述 — 强调"开源替代方案"
- ✅ 添加相关标签板块（Related Topics）
- ✅ 优化竞品对比表格 — 添加 Cursor 对比
- ✅ 添加语言切换链接

### 3. README_en.md 优化（英文）
- ✅ 完全重写 — 基于中文 README 的完整版本
- ✅ 添加多语言切换链接
- ✅ 完整的 Feature 描述和对比表格
- ✅ 添加相关标签板块

---

## 📋 需要在 GitHub 网页上手动设置的优化

### 1. 设置 GitHub Topics（最重要！）

进入仓库页面 → 点击右侧 "About" 旁边的 ⚙️ → 添加 Topics：

**必须添加的核心标签（按优先级）：**
```
ai
cli
coding-assistant
deepseek
terminal
developer-tools
code-generation
typescript
nodejs
open-source
bug-fixing
web-search
vibe-coding
```

**可选添加的补充标签：**
```
productivity
automation
macos
vscode-extension
agent-framework
llm
generative-ai
```

### 2. 设置 Social Preview

进入 Settings → Social preview → Upload an image

**推荐尺寸：** 1280×640px
**推荐内容：**
- 项目名称 + Logo
- 核心卖点（如 "AI Coding Assistant for Terminal"）
- 关键特性图标

### 3. 优化 About 描述

点击右侧 About 旁边的 ⚙️，设置：
```
Description: AI coding assistant for DeepSeek in terminal. Web search, bug fixing, agent skills. Open-source alternative to Claude Code.

Website: https://deepcode.vegamo.cn
```

### 4. 启用 Discussions

Settings → General → Discussions → ✅ 勾选

用途：
- 用户问答
- 功能讨论
- 增加用户粘性
- SEO 友好（用户生成内容）

### 5. 设置 Issue Templates

已建议创建 `.github/ISSUE_TEMPLATE/` 目录下的模板文件。

---

## 🎯 SEO 关键词策略

### 主要目标关键词

| 关键词 | 搜索意图 | 优化位置 |
|--------|---------|---------|
| AI coding assistant | 高，寻找AI编程工具 | 标题、描述、正文 |
| terminal AI tool | 中，命令行用户 | 标题、正文 |
| DeepSeek CLI | 高，DeepSeek用户 | 标题、正文、Topics |
| Claude Code alternative | 中，寻找替代方案 | 描述、对比表格 |
| vibe coding | 新兴趋势 | 正文、Topics |
| AI code generator | 高，代码生成需求 | 正文 |
| open source coding assistant | 中，开源偏好 | 描述、正文 |

### 长尾关键词

- "open source alternative to Claude Code"
- "terminal AI coding tool with web search"
- "DeepSeek API client with internet access"
- "self-hosted AI coding assistant"
- "free AI code debugger terminal"

---

## 📈 内容优化建议

### 1. 定期更新 Release Notes

每个版本发布时，Release Notes 应该包含：
- 清晰的标题（包含版本号和核心改进）
- 详细的功能变更列表
- 迁移指南（如需要）
- 相关关键词的自然融入

### 2. 维护 Wiki 文档

考虑创建 Wiki 页面：
- 详细配置指南
- 自定义 Skills 教程
- 常见问题扩展版
- 性能优化指南

### 3. 活跃 Discussions

- 定期发起讨论话题
- 回答用户问题
- 分享使用技巧

---

## 🔗 外链建设策略

### 1. 社交媒体

- Twitter/X：分享新功能和更新
- Reddit：在 r/programming, r/coding 等社区分享
- Hacker News：发布 Show HN
- Dev.to：撰写技术文章

### 2. 技术博客

撰写文章并在以下平台发布：
- "如何用 DeepCode CLI 提升编码效率"
- "DeepSeek + DeepCode CLI 完整指南"
- "Claude Code 的开源替代方案对比"

### 3. 相关项目提及

- 在 Awesome 系列列表中提交 PR
- 在 DeepSeek 官方社区推荐
- VSCode 扩展市场交叉推广

---

## 📊 效果追踪指标

### 需要监控的指标

1. **GitHub 指标**
   - ⭐ Star 数量增长
   - 👁️ Watch 数量
   - 🍴 Fork 数量
   - 📊 Traffic（访问来源分析）

2. **npm 指标**
   - 周下载量
   - 版本下载分布

3. **搜索表现**
   - GitHub 搜索排名（搜索 "AI coding assistant" 等词）
   - Google 搜索结果位置

4. **社区指标**
   - Issues 数量和解决速度
   - Discussions 活跃度
   - PR 贡献者数量

---

## 🔄 持续优化计划

### 每月检查清单

- [ ] 检查 Topics 是否完整
- [ ] 分析 GitHub Insights → Traffic 数据
- [ ] 更新 README 中的下载/Star 徽章
- [ ] 回复所有 open issues
- [ ] 发布至少 1 次内容更新（博客/社交媒体）

### 每季度检查清单

- [ ] 评估关键词排名变化
- [ ] 更新竞品对比信息
- [ ] 检查并更新外部链接
- [ ] 收集用户反馈优化文档

---

## 📚 参考资源

- [GitHub Docs: About repositories](https://docs.github.com/en/repositories)
- [GitHub SEO Best Practices](https://github.blog/2023-05-09-how-to-write-a-great-repository-readme/)
- [Awesome README Templates](https://github.com/matiassingers/awesome-readme)

---

*最后更新：2026-05-08*
