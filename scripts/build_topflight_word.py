# Builds the ליגת העל review file from the writers' drafts in PIC/team/top-flight and the current text in PIC/word/c.json
import json, os
from docx import Document
from docx.shared import Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

TF = 'PIC/team/top-flight'
cur = json.load(open('PIC/word/c.json', encoding='utf-8'))


def load(n):
    return json.load(open(os.path.join(TF, n + '.json'), encoding='utf-8'))


def rtl(p):
    p._p.get_or_add_pPr().append(OxmlElement('w:bidi'))
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    for r in p.runs:
        r._r.get_or_add_rPr().append(OxmlElement('w:rtl'))


def para(doc, text, bold=False, size=11, color=None, indent=0):
    p = doc.add_paragraph()
    r = p.add_run(text)
    r.bold = bold
    r.font.size = Pt(size)
    r.font.name = 'Arial'
    r._r.get_or_add_rPr().rFonts.set(qn('w:cs'), 'Arial')
    if color:
        r.font.color.rgb = RGBColor(*color)
    rtl(p)
    if indent:
        p.paragraph_format.right_indent = Pt(indent)
    p.paragraph_format.space_after = Pt(3)
    return p


def heading(doc, text, level):
    p = doc.add_heading(level=level)
    r = p.add_run(text)
    r.font.name = 'Arial'
    r._r.get_or_add_rPr().rFonts.set(qn('w:cs'), 'Arial')
    rtl(p)


GREY = (0x55, 0x55, 0x55)
RED = (0xC0, 0x39, 0x2B)
GREEN = (0x1E, 0x84, 0x49)
BLUE = (0x1F, 0x4E, 0x9C)
TAG = {'keep': ('נשאר כמו שהוא', GREY), 'rewrite': ('נכתב מחדש', BLUE), 'new': ('חדש, רק בליגה מקצועית', GREEN), 'drop': ('נמחק מליגת העל', RED)}


def tag(doc, x):
    label, col = TAG[x['action']]
    para(doc, '[' + label + ']  ' + x.get('note', ''), bold=True, size=10, color=col)
    if x.get('when'):
        para(doc, 'מתי: ' + x['when'], size=10, color=GREY)


def money(n):
    return ('כסף %+d' % n).replace('+', '+') if n else ''


def opts(doc, options):
    for o in options:
        bits = [b for b in [('כסף ' + format(o['money'], '+,')) if o.get('money') else '', ('מורל %+d' % o['morale']) if o.get('morale') else '',
                            ('אוהדים %+d' % o['fans']) if o.get('fans') else '', ('יוקרה %+d' % o['prestige']) if o.get('prestige') else ''] if b]
        para(doc, '• ' + o['label'] + ('   (' + ', '.join(bits) + ')' if bits else ''), indent=14)
        para(doc, '→ ' + o['outcome'], size=10, color=GREY, indent=30)


doc = Document()
doc.sections[0].right_margin = doc.sections[0].left_margin = Pt(54)
heading(doc, 'BE A PRO - ליגת העל מההתחלה, לאישור', 0)
para(doc, 'ליגה מקצועית, ישראלית. אין ליגה מעל: מה שהיה "ליגה מעל" הוא עכשיו קבוצה או ליגה בכירה באירופה. אין עבודה, צבא, לימודים, שכנים וסיפורי שכונה.', size=10)
para(doc, 'סימונים: [נשאר] = הטקסט הקיים, מתאים. [נכתב מחדש] = הטקסט החדש, ומתחתיו בקטן הישן להשוואה. [חדש] = לא היה קודם. [נמחק] = יוצא מליגת העל. כל הסכומים בשקלים סופיים של ליגת העל.', size=10)
para(doc, 'לכל פריט: לכתוב ליד "אשר" או "תקן: ..." או למחוק. הכול טיוטה.', size=10, bold=True)

# dilemmas
dil = load('dilemmas-1') + load('dilemmas-2')
old_d = {x['id']: x for x in cur['dilemmas']}
c = {}
for x in dil:
    c[x['action']] = c.get(x['action'], 0) + 1
heading(doc, '1. מגירת המנהל: דילמות (נשארו %d, נכתבו מחדש %d, חדשות %d, נמחקו %d)' % (c.get('keep', 0), c.get('rewrite', 0), c.get('new', 0), c.get('drop', 0)), 1)
for i, x in enumerate(dil, 1):
    heading(doc, '%d. %s' % (i, x['id']), 2)
    tag(doc, x)
    if x['action'] == 'keep':
        o = old_d.get(x['id'])
        if o and o['rolls']:
            r = o['rolls'][0]
            para(doc, r['speaker'] + ': ' + r['text'], bold=True)
            opts(doc, [{'label': a['label'], 'outcome': a['outcome'], 'money': a['money'], 'morale': a['morale'], 'fans': a['fans']} for a in r['options']])
    elif x['action'] in ('rewrite', 'new'):
        para(doc, x.get('speaker', '') + ': ' + x['text'], bold=True)
        for v in x.get('variants', []):
            para(doc, 'ניסוח נוסף: ' + v, size=10, indent=14)
        opts(doc, x['options'])
        o = old_d.get(x['id'])
        if x['action'] == 'rewrite' and o and o['rolls']:
            para(doc, 'הישן: ' + o['rolls'][0]['text'], size=9, color=GREY, indent=14)

# press
pr = load('press')
old_p = {x['id']: x for x in cur['press']}
c = {}
for x in pr:
    c[x['action']] = c.get(x['action'], 0) + 1
heading(doc, '2. מסיבת עיתונאים (נשארו %d, נכתבו מחדש %d, חדשות %d, נמחקו %d)' % (c.get('keep', 0), c.get('rewrite', 0), c.get('new', 0), c.get('drop', 0)), 1)
for i, x in enumerate(pr, 1):
    tag(doc, x)
    if x['action'] == 'keep':
        o = old_p.get(x['id'])
        if o:
            para(doc, '%d. %s' % (i, o['text']), bold=True)
            for a in o['answers']:
                para(doc, '• ' + a['label'], indent=14)
                para(doc, '→ ' + a['reply'], size=10, color=GREY, indent=30)
    elif x['action'] in ('rewrite', 'new'):
        para(doc, '%d. %s' % (i, x['text']), bold=True)
        for a in x['answers']:
            para(doc, '• ' + a['label'], indent=14)
            para(doc, '→ ' + a['reply'], size=10, color=GREY, indent=30)
        o = old_p.get(x['id'])
        if x['action'] == 'rewrite' and o:
            para(doc, 'הישן: ' + o['text'], size=9, color=GREY, indent=14)
    else:
        para(doc, '%d. (%s)' % (i, x['id']), size=10)

# chats
ch = load('chats')
old_c = {x['id']: x for x in cur['chats']}
c = {}
for x in ch:
    c[x['action']] = c.get(x['action'], 0) + 1
heading(doc, '3. הטלפון: צ׳אטים (נשארו %d, נכתבו מחדש %d, חדשים %d)' % (c.get('keep', 0), c.get('rewrite', 0), c.get('new', 0)), 1)
for i, x in enumerate(ch, 1):
    src = x if x['action'] in ('rewrite', 'new') else old_c.get(x['id'], {})
    heading(doc, '%d. %s (%s)' % (i, src.get('contact', x['id']), src.get('subtitle', '')), 2)
    tag(doc, x)
    for l in src.get('lines', []):
        para(doc, l, indent=14)
    o = old_c.get(x['id'])
    if x['action'] == 'rewrite' and o:
        para(doc, 'הישן:', size=9, color=GREY, indent=14)
        for l in o['lines']:
            para(doc, l, size=9, color=GREY, indent=30)

# mate
mt = load('mate')
old_m = {x['id']: x for x in cur['mate']}
heading(doc, '4. החבר בטלפון (%d)' % len(mt), 1)
for i, x in enumerate(mt, 1):
    heading(doc, '%d. %s' % (i, x['id']), 2)
    tag(doc, x)
    src = x if x['action'] == 'rewrite' else old_m.get(x['id'], {})
    for l in src.get('lines', []):
        para(doc, l, indent=14)
    for a in src.get('answers', []):
        para(doc, '• ' + a['label'], indent=14)
        para(doc, '→ ' + a['reply'], size=10, color=GREY, indent=30)

# fans
fn = load('fans')
old_f = {x['id']: x for x in cur['fans']}
c = {}
for x in fn:
    c[x['action']] = c.get(x['action'], 0) + 1
heading(doc, '5. היציע: מה האוהדים אומרים (נשארו %d, נכתבו מחדש %d, חדשות %d)' % (c.get('keep', 0), c.get('rewrite', 0), c.get('new', 0)), 1)
for i, x in enumerate(fn, 1):
    tag(doc, x)
    src = x if x['action'] in ('rewrite', 'new') else old_f.get(x['id'], {})
    when = {'pre': 'לפני משחק', 'post': 'אחרי משחק'}.get(src.get('when', ''), src.get('when', ''))
    para(doc, '%d. [%s] %s' % (i, when, src.get('text', x['id'])), bold=(x['action'] != 'keep'))

out = 'PIC/word/BE A PRO - ליגת העל מההתחלה לאישור.docx'
doc.save(out)
print(out)
