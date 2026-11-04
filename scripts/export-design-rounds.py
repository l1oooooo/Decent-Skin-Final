"""Archive the six preserved Vite builds as offline, individual concept files."""
from pathlib import Path
import base64, hashlib, html, json, re, shutil, zipfile

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'exports/design-rounds'
BUILDS = ['decent-proto-build', 'decent-round2-build', 'decent-round3-build', 'decent-polish-build', 'decent-round5-build', 'decent-round6-build']
NOTES = [
 'Initial exploration: Workspace, Instrument, Ritual, Orbit and Sequence.',
 'Workspace and Instrument retained as references; Studio, Grid and Console added.',
 'Studio and Grid retained; Monochrome Studio and Grid Focus added.',
 'Shared bottom actions, profile library and utility settings; annotation refinements.',
 'Grind controls, simplified favorites, centered status and steam enable switch.',
 'Right-aligned status, centered Monochrome Studio utilities, profile dividers and reordered Grid Focus recipe.'
]
OUT.mkdir(parents=True, exist_ok=True)
manifest=[]
for rnd,build in enumerate(BUILDS,1):
    source=Path('/private/tmp')/build
    entry=source/'proto/home-brewing/index.html'
    markup=entry.read_text()
    jsfile=(entry.parent/re.search(r'<script[^>]+src="([^"]+)"',markup)[1]).resolve()
    cssfile=(entry.parent/re.search(r'<link rel="stylesheet"[^>]+href="([^"]+)"',markup)[1]).resolve()
    js=jsfile.read_text(); css=cssfile.read_text()
    def asset(match):
        url=match[1].strip('"\'')
        if url.startswith('data:'): return match[0]
        f=(cssfile.parent/url).resolve()
        return 'url(data:font/woff2;base64,'+base64.b64encode(f.read_bytes()).decode()+')'
    css=re.sub(r'url\(([^)]+)\)',asset,css)
    match=re.search(r'var (\w+)=\[(\{name:`(?:Workspace|Studio)`.*?)\],(\w+)=new URLSearchParams',js)
    assert match, build
    concepts=re.findall(r'\{name:`[^`]+`.*?\}',match[2])
    assert len(concepts)==(5 if rnd<3 else 4)
    for index,concept in enumerate(concepts,1):
        name=re.search(r'name:`([^`]+)`',concept)[1]
        axis=re.search(r'axis:`([^`]+)`',concept)[1]
        filename=f'round-{rnd:02d}-'+name.lower().replace(' ','-')+'.html'
        individual=js[:match.start(2)]+concept+js[match.end(2):]
        # A sandboxed embed may not permit URL updates; they are optional to the demo.
        individual=individual.replace('history.replaceState(null,``,t)', '(()=>{try{history.replaceState(null,``,t)}catch{}})()')
        individual=individual.replace('</script','<\\/script')
        style=css+'\n.proto-picker,.study-label span,.study-size a{display:none!important}'
        doc='<!doctype html>\n<html lang="en" class="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>'+html.escape(f'Round {rnd:02d} · {name} · Decent Skin')+'</title><style>'+style+'</style></head><body><div id="root"></div><script type="module">'+individual+'</script></body></html>'
        (OUT/filename).write_text(doc)
        manifest.append(dict(round=rnd,name=name,filename=filename,description=axis,source_build=build,source_js_sha256=hashlib.sha256(jsfile.read_bytes()).hexdigest(),bytes=len(doc.encode())))
shutil.copyfile(ROOT/'proto/home-brewing/DECISIONS.md',OUT/'DECISIONS.md')
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2))
(OUT/'README.md').write_text('''# Decent Skin design archive\n\n26 standalone interactive HTML files from six preserved build snapshots. Each file includes its JavaScript, CSS and Geist font and opens without a development server or internet connection. One concept is isolated per file; use Load state for Home, Brewing and the other demo states, or interact with the prototype. R resets.\n\nThese are historical snapshots: later fixes intentionally are not backported. All machine behavior is simulated. No live hardware commands are implemented. The comparison canvas is 1340 × 800 and scales to fit.\n\nOpen index.html to browse the archive. manifest.json records provenance and build hashes. DECISIONS.md records the design evolution.\n''')
links=[]
for rnd,note in enumerate(NOTES,1):
    links.append(f'<section><h2>Round {rnd:02d}</h2><p>{html.escape(note)}</p><ul>'+''.join(f'<li><a href="{m["filename"]}">{html.escape(m["name"])}</a><span>{html.escape(m["description"])}</span></li>' for m in manifest if m['round']==rnd)+'</ul></section>')
(OUT/'index.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Decent Skin · Design archive</title><style>body{margin:0;background:#101011;color:#eee;font:16px/1.6 system-ui;padding:48px;max-width:1000px}h1{font-size:36px}section{border-top:1px solid #333;margin-top:32px}a{color:#fff}li{padding:12px 0}li span{display:block;color:#aaa;font-size:14px}p{color:#aaa}</style><h1>Decent Skin / Design archive</h1><p>Six rounds · 26 individual concepts · interactive local demos.<br>Each HTML includes its scripts, styles and font. Select Load state to compare Home and Brewing.</p>'+''.join(links)+'</html>')
with zipfile.ZipFile(ROOT/'exports/decent-skin-all-six-rounds.zip','w',zipfile.ZIP_DEFLATED) as z:
    for f in sorted(OUT.iterdir()): z.write(f,'design-rounds/'+f.name)
print(json.dumps({'concepts':len(manifest),'size_range':[min(m['bytes'] for m in manifest),max(m['bytes'] for m in manifest)],'zip_bytes':(ROOT/'exports/decent-skin-all-six-rounds.zip').stat().st_size}))
