#!/usr/bin/env python3
"""Import the supplied six-language archive without rewriting source vocabulary."""
import argparse
import json
import re
from collections import defaultdict
from pathlib import Path
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
LANGUAGES = {'de': '德语', 'es': '西班牙语', 'fr': '法语', 'ja': '日语', 'ko': '韩语', 'ru': '俄语'}
EXPECTED = {'de': 3277, 'es': 656, 'fr': 433, 'ja': 2112, 'ko': 1060, 'ru': 376}


def prepare(archive):
    resources, outputs = [], {}
    with ZipFile(archive) as source:
        for lang, title in LANGUAGES.items():
            manifest = json.loads(source.read(f'data/{lang}/manifest.json'))
            rows = json.loads(source.read(f'data/{lang}/vocabulary.json'))
            assert len(rows) == EXPECTED[lang], f'Unexpected {lang} vocabulary count'
            ids, groups = set(), defaultdict(list)
            for row in rows:
                assert row['id'] not in ids, f'Duplicate source ID: {row["id"]}'
                ids.add(row['id'])
                assert isinstance(row['word'], str) and row['word'].strip()
                assert isinstance(row['meaning'], str) and row['meaning'].strip()
                assert re.fullmatch(r'B\d+', row['level']) and isinstance(row['unit'], int)
                tags = row['tags']
                meaning = row['meaning']
                prefix = ' / '.join(tags)
                if prefix and not meaning.startswith(prefix):
                    meaning = f'{prefix} {meaning}'
                word = {
                    'name': row['word'], 'trans': [meaning], 'usphone': '', 'ukphone': '',
                    'sourceId': row['id'], 'sourceSheet': row['sourceSheet'],
                    'sourceMeaning': row['meaning'], 'sourceTags': tags, 'sourceNotes': row['notes'],
                }
                phonetic = re.fullmatch(r'音标:\s*(.+)', row['notes'])
                if phonetic:
                    word['phonetic'] = phonetic[1]
                # Accept either reading or written form only for explicit Japanese pairs.
                pair = re.fullmatch(r'([ぁ-ゖァ-ヺー・\s]+)（([^（）]+)）', row['word']) if lang == 'ja' else None
                if pair:
                    word['acceptedAnswers'] = list(dict.fromkeys(pair.groups()))
                    word['speech'] = pair[1]
                groups[(row['level'], row['unit'])].append(word)
            for (book, unit), words in sorted(groups.items()):
                identifier = f'zju-{lang}-{book.lower()}-unit-{unit}'
                resources.append({
                    'id': identifier, 'name': f'{title} {book} · Unit {unit}',
                    'description': f'{title}课程词汇 · {book} · 第 {unit} 单元',
                    'category': f'{title} {book}', 'courseBook': f'{title} {book}',
                    'tags': ['小语种课程', book], 'url': f'/dicts/{identifier}.json',
                    'length': len(words), 'language': lang, 'languageCategory': lang,
                    'speechLang': manifest['speechLang'], 'specialKeys': manifest['specialKeys'],
                    'inputHint': manifest.get('keyboard', {}).get('hint', '请切换至俄语输入法输入。' if lang == 'ru' else '可使用系统输入法输入；重音字母需保留。'),
                })
                outputs[ROOT / 'public' / 'dicts' / f'{identifier}.json'] = words
    outputs[ROOT / 'src' / 'resources' / 'minorLanguages.json'] = resources
    return outputs


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive', type=Path)
    parser.add_argument('--check', action='store_true', help='Verify imported data matches every original record')
    args = parser.parse_args()
    outputs = prepare(args.archive)
    for path, data in outputs.items():
        if args.check:
            assert json.loads(path.read_text()) == data, f'Imported data differs: {path.name}'
        else:
            path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    print(f'{"Verified" if args.check else "Imported"} {sum(EXPECTED.values())} entries in {len(outputs)-1} units across six languages.')
