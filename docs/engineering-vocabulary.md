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
- 去除输入目标中的 `★`、`▲` 标记、英文解释和词性标签；词性保留在对应中文释义前，不参与英文输入。
- 词头上的词性适用于后续释义；原文另列词性时，从该义项开始切换。例如 `academic` 的两条释义分别保留 `n.`、`adj.`，`mold` 的名词与动词释义分别标注。`a.`、`ad.` 统一显示为 `adj.`、`adv.`，`v.`、`vt.`、`vi.` 保持原样。原文明确写出的 `number`、`suffix` 也原样保留，不从使用说明或中文内容推断标签。
- 将词条括号中的缩写、全称或英式拼写移到「词条补充」释义。例如输入 `artificial intelligence`，答后同时看到 `AI`；输入 `CV`，答后看到 `curriculum vitae`。
- `communiqué` 使用英文中也通用的无重音形式 `communique` 作为输入目标，保留「原文拼写：communiqué」，避免普通英文键盘输入重音字符时受限。
- 原文音标含有 PDF 字体转换乱码，故不填写 `usphone` / `ukphone`。发音仍使用现有在线发音功能；专业术语的发音可用性取决于发音服务。
- 中文释义来自提供的词表，未经教材逐页复核；如发现原文错误，欢迎在 Issue 中指出具体单元、模块和词条。

## 文件与校验

- 数据：`public/dicts/zju-english-engineering-unit-*-*.json`
- 资源索引：`src/resources/zju-engineering.json`
- 导入程序：`scripts/import-engineering.mjs`
- 新工科解析检查：`npm run test:engineering`
- 词性匹配与全部词库不变量检查：`node --test scripts/import-engineering.test.mjs scripts/restore-zju-pos.test.mjs`

导入程序接受一个 JSON 数组，数组中八个字符串分别是通过浏览器读取的八份原始附件正文，按上传顺序排列：

```bash
node scripts/import-engineering.mjs /path/to/source-array.json
npm run test:engineering
```

写入前会检查三个模块的边界、中文释义、模块内重复词条及逐模块数量；若源资料发生变化，会先报错，避免静默生成不完整词库。原始附件的英文长释义不随仓库重复发布；词表及第三方资料的权利归各自权利人所有。

## 2026-10-18 词性恢复

此次恢复只在既有中文释义前添加来源明确的标签。49 份浙大词库共 2,290 个词条的名称、顺序、数量、释义正文、释义顺序及补充说明全部保持不变；测试用恢复前数据的 SHA-256 摘要校验去除新增前缀后的完整内容。

| 词库        | 总词条 | 有中文释义的词条 | 已标注词条 | 已标注释义 |
| ----------- | -----: | ---------------: | ---------: | ---------: |
| 新工科英语  |    745 |              745 |        745 |        860 |
| 英语 III    |    580 |              580 |        182 |        182 |
| 英语 IV     |    720 |              716 |         21 |         21 |
| Book 1 U1–4 |    245 |                0 |          0 |          0 |
| 合计        |  2,290 |            2,041 |        948 |      1,063 |

新工科的 745 个词条全部从原始八份附件恢复。其中 `trillion`、`quadrillion` 保留 `number`，`-centric` 保留 `suffix`；其余 742 个词条保留缩写形式的词性。另有 22 条「词条补充」或「原文拼写」说明，不加词性。

### III、IV 的来源与限制

- 本地 `../单词.pdf` 有 553 行带词性的词条。按表格行和词条/释义列读取，并去除重叠字形；其中 174 个 III 词条可与当前释义直接匹配。
- 本地 `../单词2.xlsx` 提供 III 的中文释义及单元，但没有词性列；`../综合教程章末单词.txt`、`../视听说教程页边单词 .txt` 只有英文词条。旧版词库的中文字段为空，不能用作补写依据。
- `../大英四单词表.pdf` 没有词性标签。使用新工科原文中同词同义的明确标签，为 III 再补 8 个词条，为 IV 补 21 个词条；不使用外部词典或生成的词性。
- `scripts/restore-zju-pos.mjs` 要求英文词条完全相同；忽略中文标点的全角/半角差别和空白，并拆分逗号、分号、顿号连接的并列释义。当前释义的每一部分都必须在来源中有唯一且相同的词性，才添加前缀。部分匹配、多词性冲突和仅凭英文词条的匹配均跳过。
- III 剩余 398 个词条、IV 剩余 699 个词条未标注。来源缺少标签、措辞不能逐项对应或有歧义时保持原样。IV 原有 4 个无译文词条及 Book 1 全部 245 个无译文词条仍不补写。

补充匹配程序接受本地提取的记录数组，格式为 `[{ "name": "cord", "trans": ["n. 绳子；电线", "vt. 用线连接"] }]`。来源可以合并 PDF 的明确标签和解析后的新工科词条；完整原文和临时提取记录不随仓库发布。

```bash
node scripts/restore-zju-pos.mjs /path/to/source-records.json public/dicts/zju-english-{3,4}-*.json
node --test scripts/import-engineering.test.mjs scripts/restore-zju-pos.test.mjs
```

本次修改的词库文件为：

- `public/dicts/zju-english-engineering-unit-{1..8}-{viewing,reading-1,reading-2}.json`，共 24 份。
- `public/dicts/zju-english-3-unit-{1..8}-reading-{1,2}.json`，共 16 份。
- `public/dicts/zju-english-4-unit-{2..7}.json`，共 6 份。

英语 IV Unit 1、Unit 8 和 Book 1 的文件未改动；资源索引和课程注册信息未改动。
