import json

emoji = {}

EMOJI_FILE = 'emoji-test.txt'

with open(EMOJI_FILE, 'r', encoding="utf-8") as f:
    lines = f.read().splitlines()

for line in lines:
    if not line:
        continue
    if line[0] in ('#'):
        continue
    # code ; fully-qualified/minimally-qualified/unqualified # emoji names (/ names)*
    code, rest = line.split(';')
    toks = rest.split()
    if toks[0] != "fully-qualified":
        continue
    emoji_names = " ".join(toks[3:]).replace(' ', '_').replace('-', '_')
    for emoji_name in emoji_names.split('/'):
        if ":" in emoji_names:
            continue
        emoji[emoji_name] = {"code": "-".join(code.lower().replace('-', ' ').split()), "emoji": toks[2]}

with open('emoji.json', 'w+', encoding='utf-8') as f:
    json.dump(emoji, f)
