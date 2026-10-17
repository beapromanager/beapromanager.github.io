# BE A PRO, מדריך למפתח

מדריך לעבודה על הקוד בלי Claude. כל מה שצריך כדי להרים את המשחק, לשנות אותו, לבדוק ולהעלות לאוויר.

אתר חי: https://beapromanager.github.io/
ריפו של האתר החי: https://github.com/beapromanager/beapromanager.github.io
ריפו ארכיון: https://github.com/itzik200592-byte/BE-A-PRO

---

## 1. להרים את המשחק אצלך

צריך Node.js גרסה 20 ומעלה (נבדק על 24) ו-Git.

```bash
npm install
npm run dev
```

המשחק עולה על http://localhost:5173 (Vite מדפיס את הכתובת המדויקת). שינוי בקובץ מתעדכן בדפדפן לבד.

בנייה לפרודקשן, לבדיקה שהכל מתקמפל:

```bash
npm run build
```

התוצאה בתיקייה `dist`. אפשר לראות אותה עם `npm run preview`.

---

## 2. איפה כל דבר

| תיקייה | מה יש בה |
|---|---|
| `src/engine/` | מנוע המשחק: סימולציית הכדורגל (`matchEngine.ts`). דטרמיניסטי: אותו seed נותן אותו משחק |
| `src/game/` | חוקי המשחק והמצב: `state.ts` (הלב, מצב המשחק וכל הפעולות), `career.ts` (עונה, עליות וירידות), `league.ts`, `packs.ts`, `scout.ts`, `daily.ts` (המתנה היומית), `fixing.ts` (בעלים מבקש למכור משחק), `euro.ts`, `academy.ts`/`youth.ts`, `coach.ts`, `save.ts` |
| `src/data/` | תוכן וטקסטים: דילמות, הודעות אוהדים, שאלות עיתונאים, שמות, מועדונים, ליגות |
| `src/ui/` | המסכים והרכיבים (React). `screens/` מסכים, `components/` חלקים משותפים |
| `public/` | תמונות, סרטונים, אייקונים. נטענים דרך `asset('/...')` (ראה סעיף 7) |
| `scripts/` | הבדיקות האוטומטיות ומחוללי קבצי טקסט |
| `worker/` | שרת ספירה קטן ב-Cloudflare (כמה אנשים נכנסו). מוסבר ב-`worker/README.md` ו-`CRM.md` |

מסמכים נוספים בשורש: `DEPLOY.md` (פריסה), `HANDOFF.md` ו-`HANDOFF-NEXT.md` (היסטוריית החלטות וסטטוס), `CRM.md` (נתוני שימוש).

---

## 3. הבדיקות: זה מה שמונע לשבור את המשחק

יש כ-70 בדיקות. כל אחת היא סקריפט שמריץ את המשחק האמיתי על קריירות אמיתיות ובודק טענות (בכל ליגה, בכל שבוע) ומדפיס `OK` או רשימת כשלונות.

בדיקה אחת:

```bash
npm run check:daily
```

כל הבדיקות מופיעות ב-`package.json` תחת `check:*` (למשל `check:league`, `check:packsquad`, `check:fix`, `check:foreign`).

בדיקת טיפוסים:

```bash
npx tsc --noEmit -p .
```

**כל הסוויטה** (לוקחת בין 25 ל-35 דקות). ב-Git Bash או בטרמינל של Linux/Mac:

```bash
for c in $(grep -o '"check:[a-z0-9-]*"' package.json | tr -d '"'); do
  echo "== $c"
  npm run $c 2>&1 | tail -4
done
```

שתי בדיקות (`check:climb`, `check:gems`) מדפיסות דוחות ולא שורת OK, זה תקין.

**כלל עבודה:** שינוי בחוק (סכום, מחיר, סף, טקסט שנבדק) משנה גם את הבדיקה שמחזיקה אותו. זה בכוונה: הבדיקה נועדה להיכשל כשמישהו משנה מספר בלי לשים לב. אחרי שינוי, להריץ את הבדיקה הרלוונטית ואת `tsc`, ולפני העלאה את הסוויטה המלאה.

---

## 4. דלתות: להפעיל ולכבות פיצ'רים

כל פיצ'ר גדול יושב מאחורי דגל בקוד, כדי שאפשר יהיה להעלות אותו סגור ולפתוח אותו אחר כך:

| דגל | קובץ | מצב היום |
|---|---|---|
| `DAILY_LIVE` | `src/game/daily.ts` | פתוח |
| `EURO_LIVE` | `src/game/euro.ts` | פתוח |
| `YOUTH_LIVE` | `src/game/academy.ts` | פתוח |
| `SCOUT_LIVE` | `src/game/scout.ts` | פתוח |
| `FIX_OPEN` | `src/game/fixing.ts` | פתוח |

`false` סוגר את הפיצ'ר לשחקנים. על המחשב שלך (מצב `npm run dev`) אפשר לפתוח דלתות סגורות דרך הכתובת, למשל `?fix` ל-`FIX_LIVE`.

---

## 5. טקסטים שנוצרים מקובץ מקור

חלק מקבצי הטקסט אינם נערכים ביד, הם נוצרים מ-JSON. עורכים את ה-JSON ומריצים את המחולל:

| קובץ שנוצר | מחולל | מקור |
|---|---|---|
| `src/data/fixingText.ts` | `node scripts/gen-fixing.cjs` | `PIC/team/fixing/content.json` |
| `src/data/openersText.ts` | `node scripts/gen-openers.cjs` | `PIC/team/openers/openers.json` |
| `src/data/topFlightText.ts` | `node scripts/gen-topflight.cjs` | `PIC/team/top-flight/` |

תיקיית `PIC/` לא נמצאת ב-Git (היא כבדה, כמעט 2GB, ומכילה תמונות מקור והנחיות). בחבילה הזו מצורפים בתוכה רק קבצי הטקסט והנתונים (JSON ו-Markdown) שהמחוללים צריכים.

---

## 6. להעלות לאוויר

האתר רץ על GitHub Pages. כל דחיפה ל-`main` בריפו של האתר מפעילה בנייה אוטומטית (`.github/workflows/deploy.yml`) והאתר מתעדכן תוך כשתי דקות.

הריפו של האתר מוגדר כ-remote בשם `game`:

```bash
git remote add game https://github.com/beapromanager/beapromanager.github.io.git   # פעם אחת, אם חסר
git add <הקבצים ששינית>
git commit -m "מה שונה ולמה"
git push game main
```

לעקוב אחרי הבנייה: לשונית Actions בריפו, או `gh run watch`.

**לפני כל דחיפה:** `npx tsc --noEmit -p .`, הבדיקות הרלוונטיות, ועדיף הסוויטה המלאה. מה שנדחף נראה מיד לשחקנים אמיתיים עם קריירות שמורות.

---

## 7. מלכודות שכבר עלו לנו כסף

- **תמונות וסרטונים:** תמיד דרך `asset('/נתיב')` מ-`src/ui/asset.ts`, לא נתיב גלוי. אחרת הנתיב נשבר כשה-base משתנה.
- **שמירות של שחקנים:** המשחק שומר ב-localStorage תחת המפתח `beapro.career.v1`. שינוי במבנה המצב חייב להיות תואם לאחור, ובדרך כלל מוסיפים מילוי ברירת מחדל ב-`src/game/save.ts` לשמירות ישנות. שחקן שחוזר עם שמירה מלפני חודש לא אמור להתרסק.
- **דטרמיניזם:** אותו seed חייב לתת אותה תוצאה. אל תשתמש ב-`Math.random()` בלוגיקת משחק, רק ב-rng שמקבלים מ-`createRng(seed)` / `drawSeed(...)`.
- **סיומות שורה:** הקבצים נשמרים עם LF. ב-Windows, `core.autocrlf` עלול להציג עשרות קבצים כשונים בלי שינוי אמיתי. להסתכל על `git diff --stat` ולהוסיף ל-commit רק קבצים ששינית בפועל.
- **קובץ `tsconfig.tsbuildinfo`:** נוצר מחדש ב-`tsc`. לא לכלול אותו ב-commit (`git checkout tsconfig.tsbuildinfo`).
- **מספרים בטקסט:** מה שהשחקן קורא חייב להיות נכון במשחק. תמונה או משפט שמראים משהו שלא קיים (קלף אירופאי בליגה שלישית, למשל) נתפסים מיד.
- **עברית ו-RTL:** כל המשחק מימין לשמאל. מספרים וסכומים בתוך טקסט עברי מקבלים `dir="ltr"` כדי שה-₪ לא יקפוץ לצד הלא נכון.

---

## 8. כיוונים מומלצים לפני שנוגעים בכלכלה

הכלכלה (שכר, פרסים, מתנות, מחירי חבילות) מכוילת בסימולציה של קריירות שלמות. לא משנים סכום "על עיוור". יש סקריפטי סימולציה ב-`scripts/` (למשל `gem-economy.mts`, `economy-check.mts`, `climb-check.mts`) שמראים מה השינוי עושה לאורך עונות. להריץ לפני ואחרי.

---

## 9. הערה ל-Windows אחרי הרצת מחולל

המחוללים בסעיף 5 עלולים לכתוב קבצים עם סיומות שורה של Windows. אחרי הרצה, להחזיר ל-LF כדי שה-diff יראה רק שינוי אמיתי (ב-Git Bash):

```bash
sed -i 's/\r$//' src/data/fixingText.ts src/data/openersText.ts src/data/topFlightText.ts
```
