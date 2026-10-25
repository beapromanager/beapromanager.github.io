# מדים — פרומפטים ליצירת 28 תמונות

**התשובה לשאלה:** 14 צבעים זה בדיוק המספר הנכון.
מדידה בפועל: **13 גוונים שונים ב-92 המועדונים, אבל הם מתקבצים ל-7 משפחות בלבד** —
3 אדומים, 3 ירוקים, 2 כחולים, 2 צהובים, וכולם מתחת לרף ההתנגשות של המשחק.
כלומר 7 צבעים מכסים את **כל** המועדונים הקיימים; 14 נותנים למשתמש בחירה אמיתית.

| כמה | למה |
|---|---|
| **7** | מכסה את כל 92 המועדונים בפועל |
| **14** | פלטה לבורר, כל אחת נבדלת לעין (המרווח הקטן ביותר: 43) |
| **28** | 14 בית + 14 חוץ |

הפלטה הקנונית יושבת ב-`src/data/palette.ts`. כל צבע מועדון במשחק ממופה
לצבע הקרוב אליו (`nearestKitColor`), כך שגם ל-1,200 העיירות העתידיות יש מדים
בלי ליצור אף תמונה נוספת.

---

## ⚠️ קרא את זה לפני שאתה מייצר

**הבעיה:** 28 פרומפטים נפרדים ייתנו 28 חולצות שלא נראות מאותה סדרה — זווית שונה,
תאורה שונה, בד שונה. זה ייראה כמו קולאז' ולא כמו קטלוג.

**הפתרון:** השלד למטה **זהה בכל 28**. רק שתי מילות צבע מתחלפות.
ואחרי שהתמונה הראשונה יוצאת טוב — **תשתמש בה כ-reference לכל השאר**.
ככה מקבלים סדרה ולא אוסף.

**סדר עבודה:** תייצר קודם את `red-home` בלבד. אם היא טובה — היא ה-reference,
ואז batch של ה-27 הנותרות.

---

## השלד (זהה בכל 28)

```
Product photograph of a football shirt, front view, laid perfectly flat and
centred, shot from directly above. Short sleeves, modern crew collar, clean
athletic cut. The shirt body is {BODY}, with {TRIM} sleeve cuffs, collar trim
and a thin {TRIM} side panel. No sponsor text, no club badge, no numbers, no
player name, no other text.
Matte technical polyester with a subtle fine mesh weave. Soft even studio
light, no harsh shadows, no wrinkles, no mannequin, no hanger, no human.
Plain flat neutral light grey background. Square 1:1 framing, the shirt
filling about 85% of the frame. Photorealistic, sharp, catalogue quality.
```

**החלף רק `{BODY}` ו-`{TRIM}`.** אל תיגע בשאר — זה מה ששומר על העקביות.

---

## 14 מדי בית

| # | קובץ | `{BODY}` | `{TRIM}` |
|---|---|---|---|
| 1 | `red-home.webp` | deep crimson red (#c0392b) | warm cream (#f4e7d8) |
| 2 | `maroon-home.webp` | dark maroon burgundy (#7d1128) | soft gold (#e9c46a) |
| 3 | `orange-home.webp` | bright tangerine orange (#e67e22) | very dark brown (#3a2109) |
| 4 | `yellow-home.webp` | golden yellow (#f1c40f) | near-black (#1a1a1a) |
| 5 | `green-home.webp` | emerald green (#27ae60) | very dark forest green (#04331b) |
| 6 | `teal-home.webp` | teal turquoise (#16a085) | very dark teal (#04302a) |
| 7 | `sky-home.webp` | light sky blue (#56b4e8) | deep navy (#0b2540) |
| 8 | `blue-home.webp` | royal blue (#2472c8) | golden yellow (#ffd233) |
| 9 | `navy-home.webp` | very dark navy blue (#14274e) | off-white (#eef2f6) |
| 10 | `purple-home.webp` | rich purple violet (#8e44ad) | pale lilac (#f0e4f7) |
| 11 | `pink-home.webp` | rose pink (#e75480) | near-black (#15181f) |
| 12 | `black-home.webp` | near-black charcoal (#15181f) | golden yellow (#f1c40f) |
| 13 | `white-home.webp` | clean off-white (#eef2f6) | near-black (#15181f) |
| 14 | `silver-home.webp` | cool silver grey (#9aa5b1) | near-black (#15181f) |

## 14 מדי חוץ

מדי החוץ במשחק הם **הניגוד** — צבע בהיר הופך לכהה, כהה הופך לבהיר, והשוליים
נשארים בצבע המועדון כדי שעדיין יזוהה. זה מה שהקוד עושה אוטומטית ב-`awayKit()`.

| # | קובץ | `{BODY}` | `{TRIM}` |
|---|---|---|---|
| 1 | `red-away.webp` | clean off-white (#eef2f6) | deep crimson red (#c0392b) |
| 2 | `maroon-away.webp` | clean off-white (#eef2f6) | dark maroon burgundy (#7d1128) |
| 3 | `orange-away.webp` | near-black charcoal (#15181f) | bright tangerine orange (#e67e22) |
| 4 | `yellow-away.webp` | near-black charcoal (#15181f) | golden yellow (#f1c40f) |
| 5 | `green-away.webp` | clean off-white (#eef2f6) | emerald green (#27ae60) |
| 6 | `teal-away.webp` | clean off-white (#eef2f6) | teal turquoise (#16a085) |
| 7 | `sky-away.webp` | near-black charcoal (#15181f) | light sky blue (#56b4e8) |
| 8 | `blue-away.webp` | clean off-white (#eef2f6) | royal blue (#2472c8) |
| 9 | `navy-away.webp` | clean off-white (#eef2f6) | deep navy blue (#14274e) |
| 10 | `purple-away.webp` | clean off-white (#eef2f6) | rich purple violet (#8e44ad) |
| 11 | `pink-away.webp` | near-black charcoal (#15181f) | rose pink (#e75480) |
| 12 | `black-away.webp` | clean off-white (#eef2f6) | near-black charcoal (#15181f) |
| 13 | `white-away.webp` | near-black charcoal (#15181f) | clean off-white (#eef2f6) |
| 14 | `silver-away.webp` | near-black charcoal (#15181f) | cool silver grey (#9aa5b1) |

---

## איפה לשים אותן

```
public/kits/red-home.webp
public/kits/red-away.webp
...
```

שם הקובץ הוא `{id}-home.webp` / `{id}-away.webp`, כשה-`id` הוא בדיוק ה-`id`
מ-`KIT_COLORS` ב-`src/data/palette.ts`. הקוד מצפה למבנה הזה, אז אם השמות
מדויקים — התמונות נכנסות בלי לגעת בכלום.

**גודל:** 512×512 מספיק. webp באיכות ~80.
28 קבצים × ~25KB ≈ **700KB** לכל הסדרה.

---

## אלטרנטיבה ששווה לשקול

מדי כדורגל הם צורה פשוטה: גוף, שרוולים, צווארון, ופס או סש. זה **בדיוק** מה
ש-SVG עושה טוב, וכבר יש במשחק מערכת דומה — ה-`CrestPattern` של הסמלים
(`solid` / `stripes` / `half` / `sash` / `chevron`).

| | 28 תמונות AI | מדים ב-SVG |
|---|---|---|
| משקל | ~700KB | ~2KB |
| עקביות | תלוי במזל | מושלמת |
| צבע חדש | תמונה חדשה | חינם |
| דוגמאות (פסים/סש) | 28 → 140 תמונות | חינם |
| מראה | פוטוריאליסטי | נקי, אילוסטרטיבי |

**ההמלצה:** SVG לתצוגה במשחק (בורר צבעים, סגל, ספסל) — כי הוא עובד לכל צבע
ולכל דוגמה בחינם ולעולם לא חסרה בו תמונה. ותמונות AI רק לרגע אחד גדול:
**"חשיפת המדים"** בתחילת העונה, מסך אחד עם החולצה הביתית בגדול.
ככה מקבלים גם את ה-WOW וגם מערכת שלא נשברת.
