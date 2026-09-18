# 大学英语默写器

一个面向浙江大学大学英语 III、IV 课程的本地英语单词默写工具。

本项目由 [RealKai42/qwerty-learner](https://github.com/RealKai42/qwerty-learner) 改编而来。感谢原项目提供的打字练习框架；本项目在其基础上重新整理词库、界面和练习流程，主要服务浙江大学英语课程学习。项目继续遵守原仓库采用的 GPL-3.0 许可证，详见 [LICENSE](./LICENSE)。

## 功能

- 默认进入浙江大学英语 III 的第一章。
- 支持浙江大学英语 III、英语 IV 和 Book 1 Unit 1-4 词库。
- 保留四六级、雅思和托福词库。
- 默认隐藏中文释义，完成当前单词后可以查看释义。
- 支持英文单词默写、发音、章节切换和跳过当前单词。
- 使用浏览器本地存储记录练习进度、答题记录和错题。
- 支持错题复习和学习数据统计。

## 本地运行

环境要求：Node.js 18 或更高版本。

```bash
npm install
npm run dev -- --host 127.0.0.1 --port 5174
```

打开 <http://localhost:5174/> 即可使用。

macOS 用户可以双击项目根目录中的 [`start-qwerty-learner.command`](./start-qwerty-learner.command)，脚本会检查本地服务并自动打开浏览器。

## 构建

```bash
npm run build
```

构建结果输出到 `build/` 目录。项目使用相对资源路径，适合本地静态预览或部署到静态托管服务。

## 词库

本项目内置的浙江大学英语词库位于 [`public/dicts`](./public/dicts)：

- `zju-english-3-unit-*-reading-*.json`：大学英语 III 单元词汇；
- `zju-english-4-unit-*.json`：由“大英四单词表”整理的大学英语 IV 词汇；
- `zju-english-book1-u1-4.json`：由 `book1 u1-4.txt` 整理的 Book 1 Unit 1-4 词汇。

词条采用项目现有 JSON 格式保存。带有中文释义的词条会在答题后显示释义；没有可靠释义的数据不会被臆造。

## 开发检查

```bash
npm run build
npx eslint src
git diff --check
```

## 许可证与来源

本项目是对 [RealKai42/qwerty-learner](https://github.com/RealKai42/qwerty-learner) 的个人学习用途改编版本。原项目版权、许可证和第三方资源说明请查看 [LICENSE](./LICENSE) 及源项目仓库。
