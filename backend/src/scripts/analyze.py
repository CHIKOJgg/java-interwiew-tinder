import re
with open('C:/Users/Honor/Desktop/Code/java-interview-tinder/backend/src/scripts/seed-generated.mjs', 'r', encoding='utf-8') as f:
    content = f.read()
langs = {}
for line in content.split('\n'):
    if line.strip().startswith('Q('):
        parts = line.split("'")
        if len(parts) >= 10:
            lang = parts[-2]
            diff = parts[-4]
            cat = parts[1]
            key = lang + '|' + diff
            langs[key] = langs.get(key, 0) + 1
cats = {}
for line in content.split('\n'):
    if line.strip().startswith('Q('):
        parts = line.split("'")
        if len(parts) >= 10:
            cat = parts[1]
            lang = parts[-2]
            cats[lang] = cats.get(lang, {})
            cats[lang][cat] = cats[lang].get(cat, 0) + 1
for k in sorted(langs.keys(), key=lambda x: -langs[x]):
    l, d = k.split('|')
    print(f'{l:12s} {d:8s}: {langs[k]}')
print(f'\nTotal: {sum(langs.values())}')
print(f'\nBy language:')
by_lang = {}
for k, v in langs.items():
    l = k.split('|')[0]
    by_lang[l] = by_lang.get(l, 0) + v
for l, v in sorted(by_lang.items(), key=lambda x: -x[1]):
    print(f'  {l:12s}: {v}')