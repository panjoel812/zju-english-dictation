# 浙大新工科英语词库

来源：[同学提供的 DeepSeek 分享](https://chat.deepseek.com/share/2arol6lo0hnnmmkm5p)，于 2026-10-16 通过 Chrome 读取其中的八份原始 TXT 附件。导入使用附件正文中的英文词条与中文释义，不使用 AI 回复替代原文，也不包含聊天截图或个人聊天信息。

原附件没有明确标注 Unit 编号。本项目经提供者确认，按分享中的上传顺序编号为 Unit 1–8；这不是根据教材封面或目录重新确认的官方编号。

## 单元与模块

每个单元包含三个独立词库：

- Viewing：Viewing through the lens
- Reading 1：Exploring the frontier – Reading 1
- Reading 2：Exploring the frontier – Reading 2

| 单元   | Viewing | Reading 1 | Reading 2 | 合计 |
| ------ | ------: | --------: | --------: | ---: |
| Unit 1 |      13 |        43 |        36 |   92 |
| Unit 2 |      12 |        55 |        46 |  113 |
| Unit 3 |      17 |        45 |        43 |  105 |
| Unit 4 |      12 |        39 |        39 |   90 |
| Unit 5 |      12 |        39 |        38 |   89 |
| Unit 6 |      15 |        37 |        39 |   91 |
| Unit 7 |      11 |        42 |        37 |   90 |
| Unit 8 |      14 |        31 |        30 |   75 |
| 总计   |     106 |       331 |       308 |  745 |

词库页单列「浙大新工科英语」，位于原浙大英语词库之后、四六级之前。每份词库继续使用原有章节切分和学习记录功能。默认词库仍是英语 III Unit 1 Reading 1。

## 导入规则

- 导入各模块的全部 `New words` 词条，包括多词术语；不包含另外列出的 `Phrases and expressions`、`Proper names`。
- 保留原文顺序和各条中文释义，跨单元出现的相同单词不合并，避免丢失课程归属及不同含义。
- 删除 `★`、`▲` 标记、英文解释和词性标签，不将它们变成输入内容。
- 将词条括号中的缩写、全称或英式拼写移到「词条补充」释义。例如输入 `artificial intelligence`，答后同时看到 `AI`；输入 `CV`，答后看到 `curriculum vitae`。
- `communiqué` 使用英文中也通用的无重音形式 `communique` 作为输入目标，保留「原文拼写：communiqué」，避免普通英文键盘输入重音字符时受限。
- 原文音标含有 PDF 字体转换乱码，故不填写 `usphone` / `ukphone`。发音仍使用现有在线发音功能；专业术语的发音可用性取决于发音服务。
- 中文释义来自提供的词表，未经教材逐页复核；如发现原文错误，欢迎在 Issue 中指出具体单元、模块和词条。

## 文件与校验

- 数据：`public/dicts/zju-english-engineering-unit-*-*.json`
- 资源索引：`src/resources/zju-engineering.json`
- 导入程序：`scripts/import-engineering.mjs`
- 回归检查：`npm run test:engineering`

导入程序接受一个 JSON 数组，数组中八个字符串分别是通过浏览器读取的八份原始附件正文，按上传顺序排列：

```bash
node scripts/import-engineering.mjs /path/to/source-array.json
npm run test:engineering
```

写入前会检查三个模块的边界、中文释义、模块内重复词条及逐模块数量；若源资料发生变化，会先报错，避免静默生成不完整词库。原始附件的英文长释义不随仓库重复发布；词表及第三方资料的权利归各自权利人所有。
