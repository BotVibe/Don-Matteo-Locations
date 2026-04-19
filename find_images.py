import urllib.request
import urllib.parse
import json

def get_wiki_image(title, lang="en"):
    encoded_title = urllib.parse.quote(title)
    url = f"https://{lang}.wikipedia.org/w/api.php?action=query&titles={encoded_title}&prop=pageimages&format=json&pithumbsize=800"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            pages = data['query']['pages']
            for page_id in pages:
                if 'thumbnail' in pages[page_id]:
                    return pages[page_id]['thumbnail']['source']
    except Exception as e:
        pass
    return ""

locations = [
    ("Gubbio", "it"),
    ("Piazza Grande (Gubbio)", "it"),
    ("Duomo di Spoleto", "it"),
    ("Chiesa di Sant'Eufemia (Spoleto)", "it"),
    ("Chiesa di San Giovanni Battista (Gubbio)", "it"),
    ("Palazzo Ducale (Gubbio)", "it"),
    ("Basilica di Sant'Ubaldo", "it")
]

for loc, lang in locations:
    print(f"{loc}: {get_wiki_image(loc, lang)}")
