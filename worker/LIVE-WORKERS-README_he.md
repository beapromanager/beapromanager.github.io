# מקור ה-Workers החיים — לשילוב בענף (בלי פריסה)

נארז ב-11.11.2026 (שעון ישראל). **אין כאן סודות, אין `.dev.vars`, אין מפתחות.**

אלה הקבצים שמתוכם נפרסו ב-4.11.2026 (שעון ישראל) הגרסאות שרצות באוויר:

| שרת | גרסת פריסה | מאיפה על הקופסה |
|---|---|---|
| beapro-count | e91c8cb6-577f-4bed-8407-dfaa84548252 | `/workspace/deploy_wkl/worker` (עותק של deploy_wk + טלאי ליגות לדשבורד) |
| beapro-weekend | 5d48829f-f7eb-46b5-a4f6-970855e7fe7e | אותו עץ |

## איפה לשים בריפו (על הענף החדש, בלי לפרוס)

מתוך תיקיית הריפו (`C:\Users\itzik\Desktop\CLAUDE\be-a-pro` או ה-worktree):

```
worker/live-count/     ← תוכן תיקיית live-count שבארכיון
worker/live-weekend/   ← תוכן תיקיית live-weekend שבארכיון
```

אל תחליף את `worker/src` הקיים בלי השוואה. הקוד החי **שונה** מ-`worker/src` שבענף:

- ב-beapro-count החי יש חיבור ל-beapro-weekend (`WEEKEND` service, `weekendProxy.ts`, `statsExt.ts`) ושאילתת ליגות לדשבורד. פריסה מ-`worker/src` של הענף בלי המיזוג הזה עלולה למחוק את נתוני הסופ״ש מהדשבורד.
- ב-beapro-count שבענף (מ-98de363) יש גם סימון אירועי העברת קריירה (`xfer_*`, `site_new`) שחסר בגרסה החיה.
- beapro-weekend החי מייבא קוד משחק מ-`../../src/game/` (`weekendCore.ts`, `duel.ts`, `weekendRoutes.ts`). אי אפשר לפרוס את התיקייה הזו לבד.

המטרה: שהענף יידע מה באמת רץ, כדי שפריסה עתידית (רק אחרי אישור מפורש של איציק, לא בשיחה הזו) לא תמחק כלום. **אסור להריץ wrangler deploy או rollback בשיחה הזו.**

Durable Objects של הליגה הוגדרו בפריסה עם `new_sqlite_classes` (MatchDO, LeagueDO, LobbyDO) — כלומר אחסון מבוסס SQLite.
