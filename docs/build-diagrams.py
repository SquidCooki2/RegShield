import re, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
AWS = os.path.join(HERE, "package/icons")
OUT = sys.argv[1]

SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace"

BG = "#0a0a0a"
CARD = "#121212"
CARD_BORDER = "#2b2b2b"
GROUP_BG = "#0f0f0f"
GROUP_BORDER = "#333333"
TITLE = "#f2f2f2"
SUB = "#9298a1"
MUTED = "#6b7280"
LINE = "#4d525a"
R = 9  # elbow corner radius


def _inner(svg):
    svg = re.sub(r"<!--.*?-->", "", svg, flags=re.S)
    svg = re.sub(r"<title>.*?</title>", "", svg, flags=re.S)
    vb = re.search(r'viewBox="([^"]*)"', svg).group(1)
    return vb, re.search(r"<svg[^>]*>(.*)</svg>", svg, flags=re.S).group(1).strip()


def aws_icon(name, group="architecture-service"):
    vb, body = _inner(open(f"{AWS}/{group}/{name}.svg").read())
    return lambda x, y, s: f'<svg x="{x}" y="{y}" width="{s}" height="{s}" viewBox="{vb}">{body}</svg>'


def brand(name, color):
    vb, body = _inner(open(f"{HERE}/si/{name}.svg").read())
    return lambda x, y, s: f'<svg x="{x}" y="{y}" width="{s}" height="{s}" viewBox="{vb}" fill="{color}">{body}</svg>'


def lucide(name, color="#d8dde5"):
    vb, body = _inner(open(f"{HERE}/lu/{name}.svg").read())
    return lambda x, y, s: (
        f'<svg x="{x}" y="{y}" width="{s}" height="{s}" viewBox="{vb}" fill="none" stroke="{color}" '
        f'stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">{body}</svg>')


def text(x, y, s, size=13, weight=400, color=TITLE, anchor="start", mono=False, spacing=None):
    f = f' font-family="{MONO}"' if mono else ""
    ls = f' letter-spacing="{spacing}"' if spacing else ""
    return (f'<text x="{x}" y="{y}" font-size="{size}" font-weight="{weight}" fill="{color}" '
            f'text-anchor="{anchor}"{f}{ls}>{s}</text>')


def card(x, cy, w, h, title, sub=None, mono=None, icon=None, accent=None):
    """Card centred vertically on cy, icon on the left."""
    y = cy - h / 2
    out = [f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="10" fill="{CARD}" '
           f'stroke="{accent or CARD_BORDER}" stroke-width="1.2"/>']
    tx = x + 18
    if icon:
        out.append(icon(x + 18, cy - 12, 24))
        tx = x + 54
    lines = 1 + (1 if sub else 0) + (1 if mono else 0)
    ty = cy - (lines - 1) * 9 + 5
    out.append(text(tx, ty, title, 14.5, 600, TITLE))
    if sub:
        ty += 17
        out.append(text(tx, ty, sub, 11.5, 400, SUB))
    if mono:
        ty += 16
        out.append(text(tx, ty, mono, 10.5, 400, MUTED, mono=True))
    return "".join(out)


def group(x, y, w, h, label, icon=None, note=None):
    out = [f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="12" fill="{GROUP_BG}" stroke="{GROUP_BORDER}" '
           f'stroke-width="1.2" stroke-dasharray="5 5"/>']
    lx = x + 18
    if icon:
        out.append(icon(lx, y + 14, 17))
        lx += 25
    out.append(text(lx, y + 27, label, 10.5, 600, SUB, spacing="1.4"))
    if note:
        out.append(text(x + w - 18, y + 27, note, 10.5, 400, MUTED, "end", mono=True))
    return "".join(out)


def elbow(pts, label=None, lpos=None, both=False, dashed=False, lanchor="middle", rot=None):
    """Orthogonal path with rounded corners."""
    d = [f"M{pts[0][0]},{pts[0][1]}"]
    for i in range(1, len(pts)):
        x0, y0 = pts[i - 1]
        x1, y1 = pts[i]
        if i < len(pts) - 1:
            x2, y2 = pts[i + 1]
            dx1, dy1 = (x1 - x0), (y1 - y0)
            dx2, dy2 = (x2 - x1), (y2 - y1)
            r = min(R, abs(dx1 or dy1) / 2, abs(dx2 or dy2) / 2)
            sx = x1 - (r if dx1 > 0 else -r if dx1 < 0 else 0)
            sy = y1 - (r if dy1 > 0 else -r if dy1 < 0 else 0)
            ex = x1 + (r if dx2 > 0 else -r if dx2 < 0 else 0)
            ey = y1 + (r if dy2 > 0 else -r if dy2 < 0 else 0)
            d.append(f"L{sx},{sy} Q{x1},{y1} {ex},{ey}")
        else:
            d.append(f"L{x1},{y1}")
    dash = ' stroke-dasharray="4 4"' if dashed else ""
    start = ' marker-start="url(#head-rev)"' if both else ""
    out = [f'<path d="{" ".join(d)}" fill="none" stroke="{LINE}" stroke-width="1.4" stroke-linecap="round"'
           f'{dash}{start} marker-end="url(#head)"/>']
    if label:
        t = text(lpos[0], lpos[1], label, 11, 400, SUB, lanchor, mono=True)
        if rot:
            t = t.replace("<text ", f'<text transform="rotate({rot} {lpos[0]} {lpos[1]})" ')
        out.append(t)
    return "".join(out)


def chips(cx, y, items):
    widths = [len(label) * 6.9 + 44 for _, label in items]
    total = sum(widths) + 10 * (len(items) - 1)
    x = cx - total / 2
    out = []
    for (icon, label), w in zip(items, widths):
        out.append(f'<rect x="{x}" y="{y}" width="{w}" height="30" rx="8" fill="#141414" stroke="#272727"/>')
        out.append(icon(x + 12, y + 8, 14))
        out.append(text(x + 32, y + 19.5, label, 11.5, 500, "#b9bec7"))
        x += w + 10
    return "".join(out)


def doc(w, h, body):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" font-family="{SANS}">
<defs>
<marker id="head" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,1 L8,5 L0,9" fill="none" stroke="{LINE}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></marker>
<marker id="head-rev" viewBox="0 0 10 10" refX="2.5" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M10,1 L2,5 L10,9" fill="none" stroke="{LINE}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></marker>
</defs>
<rect width="{w}" height="{h}" fill="{BG}"/>
{body}
</svg>'''


I = {
    "react": brand("react", "#61dafb"), "vite": brand("vite", "#8f7cff"),
    "chakra": brand("chakraui", "#4fd1c5"), "bun": brand("bun", "#f3f0e7"),
    "express": brand("express", "#d8dde5"), "ts": brand("typescript", "#3178c6"),
    "claude": brand("claude", "#d97757"), "aws": brand("amazonwebservices", "#ff9900"),
    "next": brand("nextdotjs", "#e6edf3"), "nest": brand("nestjs", "#e0234e"),
    "tailwind": brand("tailwindcss", "#38bdf8"), "zod": brand("zod", "#4a8df8"),
    "transcribe": aws_icon("AmazonTranscribe"), "bedrock": aws_icon("AmazonBedrock"),
    "s3": aws_icon("AmazonSimpleStorageService"), "ddb": aws_icon("AmazonDynamoDB"),
}
LU = {k: lucide(k) for k in ["mic", "users-round", "user-round", "radio-tower", "shield-check", "workflow",
                             "server", "list-checks", "database", "file-up", "layout-dashboard", "route",
                             "cpu", "file-scan", "book-open"]}


# lane geometry shared by both diagrams
W = 1520
PX, PW = 40, 210
BX, BW = 346, 300
SX, SW = 742, 320
AX, AW = 1158, 320
bc, bw = BX + 16, BW - 32
sc, sw = SX + 16, SW - 32
ac, aw = AX + 16, AW - 32
be, se, ae = bc + bw, sc + sw, ac + aw
C1 = 686          # corridor: browser -> server
C2, C3 = 1092, 1124   # corridors: server <-> aws

# ============================================================ Transcribe
TOP, GH = 150, 645
b = [text(40, 48, "Transcribe", 21, 700, TITLE),
     text(40, 71, "advisor\u2013client meeting compliance", 12.5, 400, SUB, mono=True)]
b.append(group(BX, TOP, BW, GH, "BROWSER \u00b7 REACT", I["react"]))
b.append(group(SX, TOP, SW, GH, "SERVER \u00b7 BUN + EXPRESS", I["bun"]))
b.append(group(AX, TOP, AW, GH, "AWS CLOUD", I["aws"]))
b.append(text(PX + 8, TOP + 27, "PEOPLE", 10.5, 600, SUB, spacing="1.4"))

b.append(card(PX, 337, PW, 70, "Advisor", "runs the meeting", icon=LU["user-round"]))
b.append(card(PX, 537, PW, 70, "Reviewer", "clears the queue", icon=LU["users-round"]))
b.append(card(bc, 337, bw, 104, "Advisor workspace", "live meeting \u00b7 upload", "summary \u2192 CRM", icon=LU["mic"]))
b.append(card(bc, 537, bw, 104, "Compliance queue", "flags \u00b7 transcript \u00b7 audio", "approve \u00b7 request changes", icon=LU["list-checks"]))

b.append(card(sc, 237, sw, 88, "Live socket", "/api/live websocket", icon=LU["radio-tower"]))
b.append(card(sc, 337, sw, 88, "Analysis", "prompt from rules.md", icon=LU["shield-check"]))
b.append(card(sc, 437, sw, 88, "Recorded pipeline", "archive \u2192 transcribe \u2192 analyze", icon=LU["workflow"]))
b.append(card(sc, 537, sw, 88, "REST API", "/api/meetings \u00b7 summary", icon=LU["server"]))
b.append(card(sc, 637, sw, 88, "Store", "store.ts \u00b7 audit log", icon=LU["database"]))

b.append(card(ac, 237, aw, 76, "Transcribe Streaming", "real-time speech to text", icon=I["transcribe"]))
b.append(card(ac, 337, aw, 76, "Bedrock \u00b7 Claude", "Haiku live \u00b7 Sonnet full", icon=I["bedrock"]))
b.append(card(ac, 437, aw, 76, "S3 archive bucket", "original audio \u00b7 Object Lock", icon=I["s3"]))
b.append(card(ac, 537, aw, 76, "Transcribe batch", "speaker labels + PII redaction", icon=I["transcribe"]))
b.append(card(ac, 637, aw, 76, "S3 work bucket", "redacted transcripts", icon=I["s3"]))
b.append(card(ac, 737, aw, 76, "DynamoDB", "reviews + audit log", icon=I["ddb"]))

b.append(elbow([(PX + PW, 337), (bc, 337)], "records", (298, 328)))
b.append(elbow([(PX + PW, 537), (bc, 537)], "reviews", (298, 528)))
b.append(elbow([(be, 312), (C1, 312), (C1, 237), (sc, 237)], "mic audio", (C1 + 8, 268), lanchor="start"))
b.append(elbow([(be, 362), (C1, 362), (C1, 437), (sc, 437)], "upload", (C1 + 8, 410), lanchor="start"))
b.append(elbow([(be, 537), (sc, 537)], "review actions", (C1 + 8, 528), lanchor="middle"))
b.append(elbow([(sc + 60, 281), (sc + 60, 293)]))
b.append(elbow([(sc + 60, 393), (sc + 60, 381)]))
b.append(elbow([(se - 70, 581), (se - 70, 593)]))
b.append(elbow([(se, 237), (ac, 237)], "audio", (1110, 228)))
b.append(elbow([(se, 337), (ac, 337)], "prompt", (1110, 328)))
b.append(elbow([(se, 437), (ac, 437)], "original", (1110, 428)))
b.append(elbow([(se, 637), (C3, 637), (C3, 737), (ac, 737)], "records", (C3 + 8, 700), lanchor="start"))
b.append(elbow([(ac, 660), (C2, 660), (C2, 462), (se, 462)], "transcript back", (C2 - 7, 565), lanchor="middle", rot=-90))
b.append(elbow([(ac + 70, 475), (ac + 70, 499)], "job", (ac + 80, 492), lanchor="start"))
b.append(elbow([(ac + 70, 575), (ac + 70, 599)], "redacted", (ac + 80, 592), lanchor="start"))

RY = 831
b.append(group(PX, RY, 1440, 116, "RULEBOOK \u00b7 server/rules/rules.md", I["claude"], note="read by Analysis on every check"))
rules = [("R1 \u00b7 Guarantees", "FINRA 2210"), ("R2 \u00b7 Selling away", "FINRA 3280"),
         ("R3 \u00b7 Outside business", "FINRA 3270"), ("R4 \u00b7 Best interest", "SEC Reg BI"),
         ("R5 \u00b7 AML red flags", "BSA \u00b7 FINRA 3310")]
rw = (1440 - 32 - 4 * 12) / 5
for i, (t, s2) in enumerate(rules):
    x = PX + 16 + i * (rw + 12)
    b.append(f'<rect x="{x}" y="{RY + 46}" width="{rw}" height="52" rx="9" fill="{CARD}" stroke="{CARD_BORDER}" stroke-width="1.2"/>')
    b.append(text(x + rw / 2, RY + 68, t, 13, 600, TITLE, "middle"))
    b.append(text(x + rw / 2, RY + 86, s2, 11, 400, SUB, "middle", mono=True))

b.append(chips(W / 2, 981, [(I["bun"], "Bun"), (I["express"], "Express"), (I["ts"], "TypeScript"),
                            (I["react"], "React"), (I["vite"], "Vite"), (I["chakra"], "Chakra UI"),
                            (I["zod"], "Zod"), (I["aws"], "AWS"), (I["claude"], "Claude")]))
open(f"{OUT}/transcribe-architecture.svg", "w").write(doc(W, 1041, "\n".join(b)))

# ============================================================ RegShield
TOP, GH = 150, 405
b = [text(40, 48, "RegShield", 21, 700, TITLE),
     text(40, 71, "client onboarding document compliance", 12.5, 400, SUB, mono=True)]
b.append(group(BX, TOP, BW, GH, "FRONTEND \u00b7 NEXT.JS", I["next"]))
b.append(group(SX, TOP, SW, GH, "BACKEND \u00b7 NESTJS  /api", I["nest"]))
b.append(group(AX, TOP, AW, GH, "AWS CLOUD", I["aws"]))
b.append(text(PX + 8, TOP + 27, "PEOPLE", 10.5, 600, SUB, spacing="1.4"))

b.append(card(PX, 287, PW, 70, "Advisor", "submits a client", icon=LU["user-round"]))
b.append(card(PX, 462, PW, 70, "Reviewer", "approves or not", icon=LU["users-round"]))
b.append(card(bc, 287, bw, 96, "/advisor", "upload statements, IDs", "demo data built in", icon=LU["file-up"]))
b.append(card(bc, 462, bw, 96, "/reviewer", "queue \u00b7 dossier \u00b7 grid", "approve \u00b7 remediate", icon=LU["layout-dashboard"]))
b.append(card(sc, 287, sw, 88, "Compliance controller", "submit \u00b7 clients \u00b7 decision", icon=LU["route"]))
b.append(card(sc, 387, sw, 88, "Compliance service", "orchestrates the review", icon=LU["cpu"]))
b.append(card(sc, 487, sw, 88, "OCR engine", "pdf-parse \u00b7 categories", icon=LU["file-scan"]))
b.append(card(ac, 287, aw, 84, "Amazon S3", "client documents", icon=I["s3"]))
b.append(card(ac, 387, aw, 84, "Amazon Bedrock", "Claude \u00b7 mock without AWS", icon=I["bedrock"]))

b.append(elbow([(PX + PW, 287), (bc, 287)], "uploads", (298, 278)))
b.append(elbow([(PX + PW, 462), (bc, 462)], "decides", (298, 453)))
b.append(elbow([(be, 287), (C1, 287), (C1, 275), (sc, 275)], "submit + files", (C1 + 8, 262), lanchor="start"))
b.append(elbow([(be, 462), (C1, 462), (C1, 311), (sc, 311)], "decision", (C1 + 8, 420), lanchor="start"))
b.append(elbow([(sc + 60, 331), (sc + 60, 343)]))
b.append(elbow([(sc + 60, 431), (sc + 60, 443)]))
b.append(elbow([(se - 70, 443), (se - 70, 431)], "OCR text", (se - 62, 444), lanchor="start"))
b.append(elbow([(se, 363), (C2, 363), (C2, 287), (ac, 287)], "store files", (C2 + 8, 330), lanchor="start"))
b.append(elbow([(se, 375), (ac, 375)], "client + OCR text", (1110, 366)))
b.append(elbow([(ac, 399), (se, 399)], "dossier + scores", (1110, 418)))

OY = 591
b.append(group(PX, OY, 1440, 116, "WHAT THE REVIEWER SEES", I["claude"], note="per client, in /reviewer"))
outs = [("Compliance dossier", "markdown summary"), ("Source of funds", "entity matching"),
        ("Portfolio risk", "statement analysis"), ("4-bucket audit grid", "green \u00b7 yellow \u00b7 red")]
ow = (1440 - 32 - 3 * 12) / 4
for i, (t, s2) in enumerate(outs):
    x = PX + 16 + i * (ow + 12)
    b.append(f'<rect x="{x}" y="{OY + 46}" width="{ow}" height="52" rx="9" fill="{CARD}" stroke="{CARD_BORDER}" stroke-width="1.2"/>')
    b.append(text(x + ow / 2, OY + 68, t, 13, 600, TITLE, "middle"))
    b.append(text(x + ow / 2, OY + 86, s2, 11, 400, SUB, "middle", mono=True))

b.append(chips(W / 2, 741, [(I["next"], "Next.js"), (I["react"], "React"), (I["tailwind"], "Tailwind"),
                            (I["nest"], "NestJS"), (I["ts"], "TypeScript"), (I["aws"], "AWS"), (I["claude"], "Claude")]))
open(f"{OUT}/regshield-architecture.svg", "w").write(doc(W, 801, "\n".join(b)))
print("ok")
