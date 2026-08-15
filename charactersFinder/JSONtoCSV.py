import json
import csv
import os

# ──────────────────────────────────────────────────────────────────────────────
# הגדרות קבצים
# ──────────────────────────────────────────────────────────────────────────────
JSON_FILE = "onepiece_index.json"  # שם קובץ המקור
CSV_FILE = "onepiece_characters.csv" # שם הקובץ שיווצר לאקסל

def json_to_csv():
    # 1. בדיקה אם קובץ ה-JSON קיים
    if not os.path.exists(JSON_FILE):
        print(f"❌ שגיאה: הקובץ '{JSON_FILE}' לא נמצא בתיקייה.")
        return

    # 2. טעינת הנתונים מה-JSON
    print(f"📂 קורא נתונים מהקובץ {JSON_FILE}...")
    with open(JSON_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    if not data:
        print("⚠️ הקובץ ריק, אין נתונים לייצא.")
        return

    # 3. מיון הנתונים לפי שם הדמות בסדר אלפביתי (A-Z) ללא התחשבות באותיות גדולות/קטנות
    sorted_data = sorted(data.items(), key=lambda item: item[0].lower())

    # 4. מציאת כמות ההופעות המקסימלית כדי לדעת כמה עמודות ליצור
    max_appearances = max(len(chapters) for _, chapters in sorted_data)

    # 5. יצירת כותרות דינמיות לעמודות
    headers = ["שם הדמות"]
    for i in range(max_appearances):
        if i == 0:
            headers.append("צ'אפטר אחרון")
        elif i == 1:
            headers.append("צ'אפטר לפני אחרון")
        else:
            headers.append(f"הופעה {i+1}")

    # 6. כתיבת הנתונים לקובץ CSV בקידוד שמתאים לאקסל (utf-8-sig)
    print("✍️ כותב את הנתונים לקובץ ה-CSV...")
    with open(CSV_FILE, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        
        # כתיבת שורת הכותרות
        writer.writerow(headers)
        
        # כתיבת שורות הנתונים (דמות ואחריה מספרי הצ'אפטרים)
        for char, chapters in sorted_data:
            row = [char] + chapters
            writer.writerow(row)

    print(f"✅ בהצלחה! הקובץ נוצר ושמור בשם: {CSV_FILE}")

if __name__ == "__main__":
    json_to_csv()