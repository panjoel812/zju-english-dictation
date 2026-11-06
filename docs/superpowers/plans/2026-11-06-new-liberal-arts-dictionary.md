# 新文科大英全书词库接入 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 CSV 中的 8 个 Unit 接入本地词库，并增加灰色“上传词库 / 敬请期待”占位入口。

**Architecture:** 使用脚本将 CSV 转为 8 个现有格式的静态 JSON；在 `dictionary.ts` 注册 8 个资源并在 Gallery 分类中展示。上传入口是无文件选择行为的按钮，点击打开现有 InfoPanel。

**Tech Stack:** React 18、TypeScript、Vite、Jotai、现有 Tailwind UI、Node 脚本、JSON 词库资源。

**Spec:** `docs/superpowers/specs/2026-11-06-new-liberal-arts-dictionary-design.md`

## Global Constraints

- 只在本地工作区修改，不发布线上版本。
- CSV 770 条记录按 Unit 1–8 去重后生成静态 JSON。
- 保留 67 条短语为完整词条，不拆分。
- 上传按钮为灰色占位，点击显示“敬请期待”，不打开文件选择器。
- 不改变现有练习记录的 dictionary ID。

## Review Focus

- CSV UTF-8 BOM、引号和中文分隔符必须正确解析；由导入脚本校验。
- 同一 Unit 内重复英文词条必须合并；由词库校验脚本校验。
- 词条数量和资源 metadata 必须一致；由词库校验脚本校验。
- 灰色按钮不得隐藏在移动端或变成可用上传控件；由 Playwright 回归校验。
- 既有词库和小测流程不能回归；由现有检查脚本和构建校验。

### Task 1: Generate and validate dictionary data

**Files:**

- Create: `public/dicts/zju-liberal-arts-unit-1.json` … `zju-liberal-arts-unit-8.json`
- Create: `scripts/import-liberal-arts.mjs`
- Test: `scripts/import-liberal-arts.test.mjs`

- [ ] Write the CSV parser and validation test first; assert 8 units, 770 rows, unique normalized names, and expected per-unit counts.
- [ ] Run the test and observe the missing generated resources failure.
- [ ] Implement the importer with UTF-8 BOM handling, CSV quote handling, whitespace normalization, and `name`/`trans` conversion.
- [ ] Generate the eight JSON files and run the test again.

### Task 2: Register the dictionaries and category

**Files:**

- Modify: `src/resources/dictionary.ts`
- Modify: `src/pages/Gallery-N/index.tsx`

- [ ] Add eight resource metadata entries with exact IDs, names, descriptions, category, tags, language and lengths.
- [ ] Include the IDs in the preferred order after the existing Zhejiang University English resources.
- [ ] Add a “新文科大英全书” category predicate covering the eight IDs.
- [ ] Run `npx tsc --noEmit` and the dictionary importer test.

### Task 3: Add the local upload placeholder

**Files:**

- Create: `src/pages/Gallery-N/UploadDictionaryPlaceholder.tsx`
- Modify: `src/pages/Gallery-N/index.tsx`
- Test: `scripts/check-liberal-arts.mjs`

- [ ] Add a disabled-looking gray button labeled “上传词库”，with an accessible label and no `<input type=file>`.
- [ ] On click open an InfoPanel titled “上传词库” with the message “敬请期待”。
- [ ] Place it beside the category/unit controls so it remains visible on desktop and mobile.
- [ ] Add browser assertions for the button style, panel text and absence of file chooser behavior.

### Task 4: Verify and package the local result

**Files:**

- Modify: `scripts/check-quiz.mjs` only if selector text needs to remain stable.

- [ ] Run the importer test, TypeScript, ESLint, Prettier check, `git diff --check`, build, and browser regression scripts.
- [ ] Check that only local files changed and no deployment or version update occurred.
- [ ] Draft the lively introduction tweet with the two requested acknowledgements and the CC98 URL.
