# GitHub Copilot Instructions

本项目是一个 VS Code 插件，主要功能是当用户打开文件时自动折叠代码块。

插件会根据文件中的符号自适应决定折叠哪些部分，尽可能让主要结构在一屏幕内可见。

技术栈：TypeScript, pnpm, Jest, esbuild。

## 主要项目文件

- `src/core.ts`: 主要处理逻辑，符号获取和折叠执行
- `src/editor-engine.ts`: 部分 VS Code 方法封装，例如符号解析和折叠范围执行
- `src/extension.ts`: VS Code 扩展入口点，初始化插件并注册命令
- `src/folding-algorithm.ts`: 核心折叠算法实现，负责计算需要折叠的代码块
- `src/task.ts`: 异步任务管理，追踪当前文件和处理过的文件

## 测试验证

执行 `pnpm check` 可验证代码风格、编译和测试。

测试文件位于 `tests/` 目录：

- `tests/folding-algorithm.test.ts`: 算法单元测试

## 修改指南

- 使用英文输出

<!-- END: GitHub Copilot Instructions -->