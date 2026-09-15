# פריסה, BE A PRO

**אתר חי (MVP לבדיקה):** https://beapromanager.github.io/
**קוד כניסה:** 100
**Repo:** https://github.com/beapromanager/beapromanager.github.io (ציבורי, חשבון המשחק). הריפו הישן github.com/itzik200592-byte/BE-A-PRO נשאר כארכיון.

## איך זה עובד
- GitHub Pages, נבנה אוטומטית ב-GitHub Actions מהקובץ `.github/workflows/deploy.yml`.
- זה אתר משתמש של Pages (ריפו בשם `beapromanager.github.io`), אז Vite `base` הוא `/` (ב-`vite.config.ts`).
  כל נתיבי התמונות עוברים דרך `src/ui/asset.ts` (`asset()`), שמוסיף את ה-base, אז מעבר לתת-נתיב
  בעתיד הוא שורה אחת. **אם מוסיפים תמונה חדשה מ-`public/`, להשתמש ב-`asset('/...')`.**
- שער כניסה רך: `src/ui/screens/Gate.tsx`, קוד `100`, נשמר ב-localStorage `beapro.gate`.

## לעדכן את האתר (אחרי שינויים בקוד)
```
git add -A && git commit -m "..." && git push
```
ה-workflow ירוץ לבד ותוך ~2 דקות האתר מתעדכן באותה כתובת. לעקוב: `gh run watch`.

## הערה חד פעמית שכבר בוצעה
GitHub לא נתן ל-workflow להפעיל את Pages לבד בפעם הראשונה. הופעל ידנית עם:
`gh api repos/beapromanager/beapromanager.github.io/pages -X POST -f build_type=workflow`
זה כבר נעשה, לא צריך לחזור על זה.
