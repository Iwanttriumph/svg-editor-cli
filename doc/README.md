# SVG 编辑器 CLI：架构与开发记录

仓库目标：https://github.com/Iwanttriumph/svg-editor-cli

## 初始架构方案

- `src/domain`：图形类层次、组合树、文档不变量，不依赖终端或文件系统。
- `src/application`：Command、历史、编辑会话和 IO 接口，依赖领域模型。
- `src/cli`：词法解析、命令注册和 REPL，通过应用服务操作模型。
- `src/infrastructure`：XML 编解码和文件存储，实现应用层接口。
- `src/main.ts`：组装依赖。

Command 封装每条编辑；Composite 统一叶子和容器；封装快照承担 Memento 职责。
命令注册与图形工厂是仅有的名称分派点，后续插件阶段待重构。

## 过程记录

1. 阅读作业，确认当前只有要求文档；用户选择完整实现并使用 Iwanttriumph 下公开 GitHub 仓库。
2. 检查到本机 Git 凭据账号与 GitHub 连接器账号不同，明确使用本机账号，避免推到错误账户。
3. 先建立严格 TypeScript 工程、分层方案和验证脚本；后续各阶段追加实际验证和修订。
4. 图形模型完成后加入首批测试。实际安装的 TypeScript 7 默认未自动引入 Node 类型，首次编译发现 `node:test` 类型缺失；显式配置 `types: ["node"]` 后重新验证。

## 当前状态

工程骨架阶段；尚未完成实现或测试，最终交付前会据实更新本文。
