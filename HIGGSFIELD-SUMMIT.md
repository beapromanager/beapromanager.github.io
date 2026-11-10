# פסגת אירופה: הנכסים ל-Higgsfield

כל תמונה וקליפ שפסגת אירופה מבקשת, במקום אחד. הקוד כבר טוען כל אחד מהם דרך `src/data/summitAssets.ts`, וכל עוד קובץ חסר, המסך מצייר גיבוי משלו (קנבס, SVG או המאמן הקיים). אפשר לייצר בכל סדר, וכל קובץ שנכנס לתיקייה מופיע במשחק מיד.

## כללים לכל נכס

- **אין טקסט בשום נכס.** שמות, תוצאות ועונות הקוד מצייר מעל, בעברית. בכל פרומפט ה-negative כולל: no text, no letters, no logos.
- **אין שמות אמיתיים**: לא של מועדון, לא של שחקן, לא של אצטדיון, לא כינוי, לא סמל. הצבעים בלבד מרמזים.
- **נתיב**: `public/summit/<group>/<name>.<ext>`. המזהה הוא `<group>/<name>`, כמו בטבלה.
- **תמונה**: webp, עד 250KB.
- **קליפ**: mp4 H.264, בלי אודיו, עד 600KB, ולידו poster: הפריים הראשון כ-webp באותו שם (`<name>.webp`).
- **דחיסה** (ffmpeg): `ffmpeg -i in.mp4 -an -c:v libx264 -crf 28 -preset slow -pix_fmt yuv420p -movflags +faststart out.mp4` ואת ה-poster: `ffmpeg -i out.mp4 -frames:v 1 -q:v 80 out.webp`.
- **מודלים**: תמונה ב-gpt_image_2_6 (או Soul). קליפ: קודם התמונה, ואז Kling 3.0 image-to-video עם התמונה כפריים פותח, כדי שהקליפ יתחיל בדיוק במה שאישרת.
- **כיוון**: 9:16 (720x1280) לכניסות, לטקס ולתקציר; 1:1 (512x512) למאמן ולסמלים; 4:5 (1080x1350) לרקע השיתוף.

## סדר עבודה

1. **עדיפות 1** (משנה הכי הרבה, 3 נכסים): `entrance/home`, `entrance/final`, `trophy/ceremony`.
2. **עדיפות 2**: 20 הכניסות של המועדונים, 6 קליפי המאמן בפנדלים, רקע השיתוף.
3. **עדיפות 3**: 20 הסמלים כתמונה, 12 תמונות ספר הזהב, רקע המפה, רקע התקציר.

טיפ: את הכניסה הראשונה (`entrance/home`) תייצר לבד ותאשר. היא הרפרנס לכל 22 הכניסות, וכך הן נראות כמו סדרה אחת.

## טבלה מסכמת

| מזהה | נתיב | סוג | שלב | עדיפות | גיבוי בקוד |
|---|---|---|---|---|---|
| `entrance/eu2-madrid-ivory` | `public/summit/entrance/eu2-madrid-ivory.mp4` | קליפ | 3 | 2 | entrance-canvas |
| `entrance/eu2-madrid-fighters` | `public/summit/entrance/eu2-madrid-fighters.mp4` | קליפ | 3 | 2 | entrance-canvas |
| `entrance/eu2-catalonia` | `public/summit/entrance/eu2-catalonia.mp4` | קליפ | 3 | 2 | entrance-canvas |
| `entrance/eu2-manchester-textile` | `public/summit/entrance/eu2-manchester-textile.mp4` | קליפ | 3 | 2 | entrance-canvas |
| `entrance/eu2-manchester-sky` | `public/summit/entrance/eu2-manchester-sky.mp4` | קליפ | 3 | 2 | entrance-canvas |
| `entrance/eu2-mersey` | `public/summit/entrance/eu2-mersey.mp4` | קליפ | 3 | 2 | entrance-canvas |
| `entrance/eu2-london-blue` | `public/summit/entrance/eu2-london-blue.mp4` | קליפ | 3 | 2 | entrance-canvas |
| `entrance/eu2-london-north` | `public/summit/entrance/eu2-london-north.mp4` | קליפ | 3 | 2 | entrance-canvas |
| `entrance/eu2-munich` | `public/summit/entrance/eu2-munich.mp4` | קליפ | 3 | 2 | entrance-canvas |
| `entrance/eu2-dortmund` | `public/summit/entrance/eu2-dortmund.mp4` | קליפ | 3 | 2 | entrance-canvas |
| `entrance/eu2-turin` | `public/summit/entrance/eu2-turin.mp4` | קליפ | 3 | 2 | entrance-canvas |
| `entrance/eu2-milan-red` | `public/summit/entrance/eu2-milan-red.mp4` | קליפ | 3 | 2 | entrance-canvas |
| `entrance/eu2-milan-blue` | `public/summit/entrance/eu2-milan-blue.mp4` | קליפ | 3 | 2 | entrance-canvas |
| `entrance/eu2-south-italy` | `public/summit/entrance/eu2-south-italy.mp4` | קליפ | 3 | 2 | entrance-canvas |
| `entrance/eu2-paris` | `public/summit/entrance/eu2-paris.mp4` | קליפ | 3 | 2 | entrance-canvas |
| `entrance/eu2-portugal-blue` | `public/summit/entrance/eu2-portugal-blue.mp4` | קליפ | 3 | 2 | entrance-canvas |
| `entrance/eu2-lisbon-red` | `public/summit/entrance/eu2-lisbon-red.mp4` | קליפ | 3 | 2 | entrance-canvas |
| `entrance/eu2-istanbul-flame` | `public/summit/entrance/eu2-istanbul-flame.mp4` | קליפ | 3 | 2 | entrance-canvas |
| `entrance/eu2-glasgow-green` | `public/summit/entrance/eu2-glasgow-green.mp4` | קליפ | 3 | 2 | entrance-canvas |
| `entrance/eu2-amsterdam-mad` | `public/summit/entrance/eu2-amsterdam-mad.mp4` | קליפ | 3 | 2 | entrance-canvas |
| `entrance/home` | `public/summit/entrance/home.mp4` | קליפ | 3 | 1 | entrance-canvas |
| `entrance/final` | `public/summit/entrance/final.mp4` | קליפ | 3 | 1 | entrance-canvas |
| `crest/eu2-madrid-ivory` | `public/summit/crest/eu2-madrid-ivory.webp` | תמונה | 3 | 3 | crest-elite |
| `crest/eu2-madrid-fighters` | `public/summit/crest/eu2-madrid-fighters.webp` | תמונה | 3 | 3 | crest-elite |
| `crest/eu2-catalonia` | `public/summit/crest/eu2-catalonia.webp` | תמונה | 3 | 3 | crest-elite |
| `crest/eu2-manchester-textile` | `public/summit/crest/eu2-manchester-textile.webp` | תמונה | 3 | 3 | crest-elite |
| `crest/eu2-manchester-sky` | `public/summit/crest/eu2-manchester-sky.webp` | תמונה | 3 | 3 | crest-elite |
| `crest/eu2-mersey` | `public/summit/crest/eu2-mersey.webp` | תמונה | 3 | 3 | crest-elite |
| `crest/eu2-london-blue` | `public/summit/crest/eu2-london-blue.webp` | תמונה | 3 | 3 | crest-elite |
| `crest/eu2-london-north` | `public/summit/crest/eu2-london-north.webp` | תמונה | 3 | 3 | crest-elite |
| `crest/eu2-munich` | `public/summit/crest/eu2-munich.webp` | תמונה | 3 | 3 | crest-elite |
| `crest/eu2-dortmund` | `public/summit/crest/eu2-dortmund.webp` | תמונה | 3 | 3 | crest-elite |
| `crest/eu2-turin` | `public/summit/crest/eu2-turin.webp` | תמונה | 3 | 3 | crest-elite |
| `crest/eu2-milan-red` | `public/summit/crest/eu2-milan-red.webp` | תמונה | 3 | 3 | crest-elite |
| `crest/eu2-milan-blue` | `public/summit/crest/eu2-milan-blue.webp` | תמונה | 3 | 3 | crest-elite |
| `crest/eu2-south-italy` | `public/summit/crest/eu2-south-italy.webp` | תמונה | 3 | 3 | crest-elite |
| `crest/eu2-paris` | `public/summit/crest/eu2-paris.webp` | תמונה | 3 | 3 | crest-elite |
| `crest/eu2-portugal-blue` | `public/summit/crest/eu2-portugal-blue.webp` | תמונה | 3 | 3 | crest-elite |
| `crest/eu2-lisbon-red` | `public/summit/crest/eu2-lisbon-red.webp` | תמונה | 3 | 3 | crest-elite |
| `crest/eu2-istanbul-flame` | `public/summit/crest/eu2-istanbul-flame.webp` | תמונה | 3 | 3 | crest-elite |
| `crest/eu2-glasgow-green` | `public/summit/crest/eu2-glasgow-green.webp` | תמונה | 3 | 3 | crest-elite |
| `crest/eu2-amsterdam-mad` | `public/summit/crest/eu2-amsterdam-mad.webp` | תמונה | 3 | 3 | crest-elite |
| `coach/pen-user-goal` | `public/summit/coach/pen-user-goal.mp4` | קליפ | 4 | 2 | coach-css |
| `coach/pen-user-miss` | `public/summit/coach/pen-user-miss.mp4` | קליפ | 4 | 2 | coach-css |
| `coach/pen-opp-goal` | `public/summit/coach/pen-opp-goal.mp4` | קליפ | 4 | 2 | coach-css |
| `coach/pen-opp-miss` | `public/summit/coach/pen-opp-miss.mp4` | קליפ | 4 | 2 | coach-css |
| `coach/pen-win` | `public/summit/coach/pen-win.mp4` | קליפ | 4 | 2 | coach-css |
| `coach/pen-loss` | `public/summit/coach/pen-loss.mp4` | קליפ | 4 | 2 | coach-css |
| `trophy/ceremony` | `public/summit/trophy/ceremony.mp4` | קליפ | 3 | 1 | trophy-svg |
| `book/last-minute` | `public/summit/book/last-minute.webp` | תמונה | 5 | 3 | book-medallion |
| `book/comeback` | `public/summit/book/comeback.webp` | תמונה | 5 | 3 | book-medallion |
| `book/pens-win` | `public/summit/book/pens-win.webp` | תמונה | 5 | 3 | book-medallion |
| `book/clean-sheet` | `public/summit/book/clean-sheet.webp` | תמונה | 5 | 3 | book-medallion |
| `book/long-range` | `public/summit/book/long-range.webp` | תמונה | 5 | 3 | book-medallion |
| `book/their-red` | `public/summit/book/their-red.webp` | תמונה | 5 | 3 | book-medallion |
| `book/away-win` | `public/summit/book/away-win.webp` | תמונה | 5 | 3 | book-medallion |
| `book/big-win` | `public/summit/book/big-win.webp` | תמונה | 5 | 3 | book-medallion |
| `book/trophy-lift` | `public/summit/book/trophy-lift.webp` | תמונה | 5 | 3 | book-medallion |
| `book/rain-night` | `public/summit/book/rain-night.webp` | תמונה | 5 | 3 | book-medallion |
| `book/final-whistle` | `public/summit/book/final-whistle.webp` | תמונה | 5 | 3 | book-medallion |
| `book/fans-night` | `public/summit/book/fans-night.webp` | תמונה | 5 | 3 | book-medallion |
| `share/bg` | `public/summit/share/bg.webp` | תמונה | 5 | 2 | share-canvas |
| `map/path-bg` | `public/summit/map/path-bg.webp` | תמונה | 5 | 3 | map-css |
| `reel/win-base` | `public/summit/reel/win-base.mp4` | קליפ | 5 | 3 | reel-canvas |

סה"כ 64 נכסים: 30 קליפים ו-34 תמונות. לכל מועדון: קליפ כניסה ותמונת סמל (2 נכסים).

## הכניסה למשחק (שלב 3)

מבט ישר מלמעלה על אצטדיון מלא בלילה, 3 שניות, המצלמה יורדת לאט לכיוון הדשא. הקוד מציג 2.6 שניות, כותב את שם המועדון באמצע הדשא ואת שם האצטדיון מתחתיו, ואז חותך ישר למשחק. השלד זהה בכל 22, רק הצבעים מתחלפים:

```
Top-down aerial view, camera directly above the centre spot of a packed football stadium at night, slowly descending toward the pitch. Floodlit striped grass, crisp white pitch markings, the stands a dense ring of supporters. Both ends of the stadium burn with handheld flares in {COLOURS}, thick glowing smoke drifting over the stands. Cinematic, high contrast, deep blacks, warm gold floodlight rim. Empty centre circle, nothing written anywhere.
```

- יחס 9:16, 720x1280, 3 שניות, 24fps. וידאו: Kling 3.0 image-to-video מהתמונה עם הוראת תנועה: "slow vertical descent, flares flicker, smoke drifts".
- negative: text, letters, words, numbers, logos, badges, crests, brand marks, watermarks, signatures, real club names, real stadiums, recognisable real people, famous footballers, blurry, distorted faces, extra limbs, flicker, morphing architecture, camera shake, cuts, fades
- רפרנס: הכניסה הראשונה שאישרת.

### `entrance/eu2-madrid-ivory` (מדריד השנהבית)
- {COLOURS} = **white and old gold** (#F4F1EA, #C9A227). הקוד כותב: מדריד השנהבית, היכל השנהב.

### `entrance/eu2-madrid-fighters` (הפייטרים ממדריד)
- {COLOURS} = **red and white** (#B5172F, #F4F4F4). הקוד כותב: הפייטרים ממדריד, זירת הנהר.

### `entrance/eu2-catalonia` (קטלוניה הגדולה)
- {COLOURS} = **navy blue and claret** (#1B3F8B, #8E1B3A). הקוד כותב: קטלוניה הגדולה, אמפיתיאטרון הים התיכון.

### `entrance/eu2-manchester-textile` (מנצ'סטר הטקסטילית)
- {COLOURS} = **red and gold** (#C1121F, #F7D774). הקוד כותב: מנצ'סטר הטקסטילית, אצטדיון הטחנות.

### `entrance/eu2-manchester-sky` (מנצ'סטר התכולה)
- {COLOURS} = **sky blue and white** (#6CABDD, #FFFFFF). הקוד כותב: מנצ'סטר התכולה, הקערה התכולה.

### `entrance/eu2-mersey` (נמל המרסי)
- {COLOURS} = **deep crimson and teal** (#B0102A, #0E6B5C). הקוד כותב: נמל המרסי, רציף המרסי.

### `entrance/eu2-london-blue` (לונדון הכחולה)
- {COLOURS} = **royal blue and white** (#1D4E9E, #F2F2F2). הקוד כותב: לונדון הכחולה, חצר המערב.

### `entrance/eu2-london-north` (צפון לונדון האדומה)
- {COLOURS} = **red and white** (#D0021B, #FFFFFF). הקוד כותב: צפון לונדון האדומה, ארמון הצפון.

### `entrance/eu2-munich` (מינכן הבווארית)
- {COLOURS} = **red and white** (#C8102E, #FFFFFF). הקוד כותב: מינכן הבווארית, היכל האלפים.

### `entrance/eu2-dortmund` (דורטמונד צהובה)
- {COLOURS} = **yellow and white** (#F2C200, #FFFFFF). הקוד כותב: דורטמונד צהובה, כור הפחם.

### `entrance/eu2-turin` (טורינו בשחור לבן)
- {COLOURS} = **old gold and white** (#C9A227, #F5F5F5). הקוד כותב: טורינו בשחור לבן, מבצר הפו.

### `entrance/eu2-milan-red` (מילאנו אדומה)
- {COLOURS} = **deep crimson and white** (#A50021, #FFFFFF). הקוד כותב: מילאנו אדומה, היכל לומברדיה.

### `entrance/eu2-milan-blue` (מילאנו הכחולה)
- {COLOURS} = **navy blue and old gold** (#0B3D91, #C9A227). הקוד כותב: מילאנו הכחולה, היכל לומברדיה.

### `entrance/eu2-south-italy` (אלופי דרום איטליה)
- {COLOURS} = **cyan blue and white** (#12A0D7, #FFFFFF). הקוד כותב: אלופי דרום איטליה, לוע הר הגעש.

### `entrance/eu2-paris` (פריז הענקית)
- {COLOURS} = **white and red** (#FFFFFF, #C8102E). הקוד כותב: פריז הענקית, זירת הסן.

### `entrance/eu2-portugal-blue` (הכחולים מפורטוגל)
- {COLOURS} = **royal blue and white** (#1C4FA1, #FFFFFF). הקוד כותב: הכחולים מפורטוגל, מגדלור הדורו.

### `entrance/eu2-lisbon-red` (ליסבון האדומה)
- {COLOURS} = **red and white** (#C8102E, #FFFFFF). הקוד כותב: ליסבון האדומה, מצודת הטז'ו.

### `entrance/eu2-istanbul-flame` (הלהבה מאיסטנבול)
- {COLOURS} = **deep crimson and old gold** (#A6192E, #F2A900). הקוד כותב: הלהבה מאיסטנבול, כור הבוספורוס.

### `entrance/eu2-glasgow-green` (גלזגו הירוקה)
- {COLOURS} = **dark green and white** (#138A4B, #FFFFFF). הקוד כותב: גלזגו הירוקה, היכל הקלייד.

### `entrance/eu2-amsterdam-mad` (המשוגעים של אמסטרדם)
- {COLOURS} = **white and red** (#F5F5F5, #D2122E). הקוד כותב: המשוגעים של אמסטרדם, זירת התעלות.

### `entrance/home` (הבית של המשתמש)
- {COLOURS} = **white** (לבנים). הקוד מוסיף מעל את צבעי המועדון של המשתמש, כי הצבעים שלו משתנים מקריירה לקריירה.

### `entrance/final` (הגמר)
- {COLOURS} = **white at one end and gold at the other**, ובנוסף: "a grand neutral final stadium, a ring of gold light around the roof". הקוד כותב "גמר פסגת אירופה" ואת שם האצטדיון (מתחלף בין: היכל הכתרים, זירת הזהב, אצטדיון האגמים, היכל הפסגה, זירת הכוכבים, אמפיתיאטרון הלילה).

## הסמלים (שלב 3, עדיפות 3)

הסמל המצויר בקוד (טבעת זהב, סמל, כוכבים) כבר עובד. התמונה רק מחליפה אותו כשהיא קיימת. לכל מועדון אותו שלד, רק הסמל והצבעים מתחלפים:

```
A luxury football crest on a pure black background, front view, centred: a {SHAPE} shield of polished gold rim, the field {PRIMARY} with a {SECONDARY} detail, and in the middle a single small engraved gold {EMBLEM}. Embossed metal, soft gold rim light, no letters, no words, no numbers.
```

- יחס 1:1, 512x512, webp. negative: text, letters, words, numbers, logos, badges, crests, brand marks, watermarks, signatures, real club names, real stadiums, recognisable real people, famous footballers, blurry, distorted faces, extra limbs

### `crest/eu2-madrid-ivory` (מדריד השנהבית)
- {SHAPE} = round, {PRIMARY} = white (#F4F1EA), {SECONDARY} = old gold (#C9A227), {EMBLEM} = eight-pointed star.

### `crest/eu2-madrid-fighters` (הפייטרים ממדריד)
- {SHAPE} = shield, {PRIMARY} = red (#B5172F), {SECONDARY} = white (#F4F4F4), {EMBLEM} = pair of crossed swords.

### `crest/eu2-catalonia` (קטלוניה הגדולה)
- {SHAPE} = diamond, {PRIMARY} = navy blue (#1B3F8B), {SECONDARY} = claret (#8E1B3A), {EMBLEM} = lighthouse.

### `crest/eu2-manchester-textile` (מנצ'סטר הטקסטילית)
- {SHAPE} = shield, {PRIMARY} = red (#C1121F), {SECONDARY} = black (#141414), {EMBLEM} = thread spool.

### `crest/eu2-manchester-sky` (מנצ'סטר התכולה)
- {SHAPE} = round, {PRIMARY} = sky blue (#6CABDD), {SECONDARY} = navy blue (#1C2C5B), {EMBLEM} = bee.

### `crest/eu2-mersey` (נמל המרסי)
- {SHAPE} = diamond, {PRIMARY} = deep crimson (#B0102A), {SECONDARY} = teal (#0E6B5C), {EMBLEM} = ship anchor.

### `crest/eu2-london-blue` (לונדון הכחולה)
- {SHAPE} = shield, {PRIMARY} = royal blue (#1D4E9E), {SECONDARY} = white (#F2F2F2), {EMBLEM} = clock tower.

### `crest/eu2-london-north` (צפון לונדון האדומה)
- {SHAPE} = round, {PRIMARY} = red (#D0021B), {SECONDARY} = white (#FFFFFF), {EMBLEM} = arrow.

### `crest/eu2-munich` (מינכן הבווארית)
- {SHAPE} = shield, {PRIMARY} = red (#C8102E), {SECONDARY} = cyan blue (#0A3A7A), {EMBLEM} = mountain peak.

### `crest/eu2-dortmund` (דורטמונד צהובה)
- {SHAPE} = diamond, {PRIMARY} = yellow (#F2C200), {SECONDARY} = black (#141414), {EMBLEM} = pair of crossed pickaxes.

### `crest/eu2-turin` (טורינו בשחור לבן)
- {SHAPE} = shield, {PRIMARY} = black (#1A1A1A), {SECONDARY} = white (#F5F5F5), {EMBLEM} = castle tower.

### `crest/eu2-milan-red` (מילאנו אדומה)
- {SHAPE} = round, {PRIMARY} = deep crimson (#A50021), {SECONDARY} = black (#141414), {EMBLEM} = cathedral spires.

### `crest/eu2-milan-blue` (מילאנו הכחולה)
- {SHAPE} = round, {PRIMARY} = navy blue (#0B3D91), {SECONDARY} = black (#141414), {EMBLEM} = crescent moon with stars.

### `crest/eu2-south-italy` (אלופי דרום איטליה)
- {SHAPE} = diamond, {PRIMARY} = cyan blue (#12A0D7), {SECONDARY} = cyan blue (#0A2342), {EMBLEM} = volcano.

### `crest/eu2-paris` (פריז הענקית)
- {SHAPE} = diamond, {PRIMARY} = navy blue (#0B1F4B), {SECONDARY} = red (#C8102E), {EMBLEM} = arched bridge over a river.

### `crest/eu2-portugal-blue` (הכחולים מפורטוגל)
- {SHAPE} = shield, {PRIMARY} = royal blue (#1C4FA1), {SECONDARY} = white (#FFFFFF), {EMBLEM} = sailing ship.

### `crest/eu2-lisbon-red` (ליסבון האדומה)
- {SHAPE} = round, {PRIMARY} = red (#C8102E), {SECONDARY} = white (#FFFFFF), {EMBLEM} = sun.

### `crest/eu2-istanbul-flame` (הלהבה מאיסטנבול)
- {SHAPE} = diamond, {PRIMARY} = deep crimson (#A6192E), {SECONDARY} = old gold (#F2A900), {EMBLEM} = flame.

### `crest/eu2-glasgow-green` (גלזגו הירוקה)
- {SHAPE} = round, {PRIMARY} = dark green (#138A4B), {SECONDARY} = white (#FFFFFF), {EMBLEM} = thistle flower.

### `crest/eu2-amsterdam-mad` (המשוגעים של אמסטרדם)
- {SHAPE} = diamond, {PRIMARY} = white (#F5F5F5), {SECONDARY} = red (#D2122E), {EMBLEM} = windmill.

## המאמן בפנדלים (שלב 4)

**רק המאמן שכבר קיים במשחק.** לפני כל קליפ, להעלות את `public/coach/guide.webp` ואת `public/coach/celebrate.mp4` כרפרנס (image-to-video), כדי שזה יהיה בדיוק הוא. לא להמציא דמות ולא לבקש אדם אמיתי.

הדמות כפי שהיא ב-guide.webp: איור וקטורי שטוח (flat vector illustration), גבר בשנות ה-40 לחייו, שיער חום כהה קצר ומוסט אחורה, חיוך קטן ובטוח, ג׳קט רוכסן כהה בגוון טורקיז-פחם עם צווארון גבוה, תאורת שוליים זהובה על הלחי והכתף, רקע כמעט שחור עם צורת מגן מעוגלת בגווני טורקיז וזהב מאחוריו.

```
Flat vector illustration, the same coach as the reference image: a man in his 40s, short dark brown hair swept back, dark teal-charcoal zip jacket with a high collar, warm gold rim light, near-black background with a rounded teal-and-gold shield shape behind him. {ACTION}. Smooth limited animation, same art style, same face, same jacket.
```

- יחס 1:1, 512x512, 24fps, בלי אודיו. negative: text, letters, words, numbers, logos, badges, crests, brand marks, watermarks, signatures, real club names, real stadiums, recognisable real people, famous footballers, blurry, distorted faces, extra limbs, flicker, morphing architecture, camera shake, cuts, fades, a different person, realistic photo style

### `coach/pen-user-goal` (השחקן שלנו כבש)
- {ACTION} = he punches the air and roars with joy, arms raised. משך 1.5 שניות.

### `coach/pen-user-miss` (השחקן שלנו החמיץ)
- {ACTION} = he drops his head and covers his mouth with one hand, crushed. משך 1.5 שניות.

### `coach/pen-opp-goal` (היריבה כבשה)
- {ACTION} = he claps his hands twice to lift his own team, jaw tight, tense, not happy. משך 1.5 שניות.

### `coach/pen-opp-miss` (היריבה החמיצה)
- {ACTION} = he pumps his fist hard and shouts, as if his own side had scored. משך 1.5 שניות.

### `coach/pen-win` (ניצחנו בדו-קרב)
- {ACTION} = wide shot from far away: he runs toward the fans behind the goal, arms wide open, under the floodlights. משך 3.5 שניות.

### `coach/pen-loss` (הפסדנו בדו-קרב)
- {ACTION} = he turns and walks slowly into the stadium tunnel, and the tunnel lights go out one by one behind him. משך 3.5 שניות.

## טקס הגביע (שלב 3, עדיפות 1)

### `trophy/ceremony`
```
A gleaming gold football trophy rises slowly from darkness into the centre of the frame on a floodlit night pitch, fireworks of gold and white bursting high behind it, gold confetti falling, the camera orbiting a half turn around the trophy. Luxurious, cinematic, deep blacks, gold highlights. The trophy is an original design: a tall cup with two elegant handles on a dark plinth, no engraving, nothing written.
```
- יחס 9:16, 720x1280, 5.5 שניות, 24fps. הקוד כותב אחרי הקליפ "אלופי אירופה" ואת העונה. negative: text, letters, words, numbers, logos, badges, crests, brand marks, watermarks, signatures, real club names, real stadiums, recognisable real people, famous footballers, blurry, distorted faces, extra limbs, flicker, morphing architecture, camera shake, cuts, fades, a real trophy

## ספר הזהב (שלב 5)

תמונה אחת לכל סוג רגע. ספר הזהב מקבל עמוד רק על גמר ששוחק ועל זכייה בגביע (החלטה שלך מ-9.11), והתמונה נבחרת לפי מה שקרה במשחק. שלד:

```
Cinematic night football photograph, players seen from behind or in silhouette with faces not visible, {MOMENT}. Gold and black colour grade, floodlight haze, shallow depth of field, plain kits with no logos or numbers.
```

- יחס 4:5, 1080x1350, webp. negative: text, letters, words, numbers, logos, badges, crests, brand marks, watermarks, signatures, real club names, real stadiums, recognisable real people, famous footballers, blurry, distorted faces, extra limbs

### `book/last-minute` (גול בדקה האחרונה)
- {MOMENT} = a striker wheels away after a goal in the final seconds, the stadium clock area dark, the crowd exploding.

### `book/comeback` (מהפך)
- {MOMENT} = a team piling on top of each other in celebration after turning the match around.

### `book/pens-win` (ניצחון בפנדלים)
- {MOMENT} = players sprinting from the centre circle toward their keeper after the winning penalty.

### `book/clean-sheet` (שער נקי)
- {MOMENT} = a goalkeeper standing tall in front of his goal at the final whistle, gloves raised.

### `book/long-range` (גול מרחוק)
- {MOMENT} = a ball flying from far out into the top corner, the keeper at full stretch.

### `book/their-red` (אדום ליריבה)
- {MOMENT} = a referee seen from behind holding a red card high, players arguing around him.

### `book/away-win` (ניצחון בחוץ)
- {MOMENT} = a small travelling end of supporters celebrating in a huge dark stadium.

### `book/big-win` (ניצחון גדול)
- {MOMENT} = a team saluting their supporters together, arms linked, after a big win.

### `book/trophy-lift` (הנפת גביע)
- {MOMENT} = a captain lifting an original gold trophy, gold confetti in the air.

### `book/rain-night` (לילה גשום)
- {MOMENT} = rain pouring through the floodlights, a player sliding on the soaked grass.

### `book/final-whistle` (שריקת סיום)
- {MOMENT} = a player falling to his knees in relief at the final whistle.

### `book/fans-night` (לילה של אוהדים)
- {MOMENT} = a wall of supporters with scarves raised and flares burning gold.

## שיתוף, מפה ותקציר (שלב 5)

### `share/bg`
```
Abstract luxury background: black marble with fine gold veins, a soft spotlight from the top, a faint ring of gold light in the centre where a crest will sit, generous empty space top and bottom.
```
- יחס 4:5, 1080x1350. הקוד מצייר מעל את הסמל, הכותרת, התוצאה וכתובת המשחק. negative: text, letters, words, numbers, logos, badges, crests, brand marks, watermarks, signatures, real club names, real stadiums, recognisable real people, famous footballers, blurry, distorted faces, extra limbs

### `map/path-bg`
```
An abstract dark map of Europe made of faint gold lines and dots, no borders labelled, no city names, a soft glow, mostly black, elegant and minimal.
```
- יחס 9:16, 720x1280. הקוד מצייר מעל את דרך הזהב והתחנות. negative: text, letters, words, numbers, logos, badges, crests, brand marks, watermarks, signatures, real club names, real stadiums, recognisable real people, famous footballers, blurry, distorted faces, extra limbs

### `reel/win-base`
```
A slow push through floodlit night haze over a packed stadium, gold sparks drifting upward, dark and luxurious, leaving the centre of the frame calm for overlaid graphics.
```
- יחס 9:16, 720x1280, 5 שניות, 24fps. הקוד מצייר מעל את התוצאה, הדקות והכובשים. negative: text, letters, words, numbers, logos, badges, crests, brand marks, watermarks, signatures, real club names, real stadiums, recognisable real people, famous footballers, blurry, distorted faces, extra limbs, flicker, morphing architecture, camera shake, cuts, fades
