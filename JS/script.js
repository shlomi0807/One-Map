// אנחנו משתמשים ב-jQuery כדי לחכות שהדף ייטען
$(window).on('load', function() {
    const mapContainer = document.getElementById('map-container');
    const mapWrapper = document.getElementById('map-wrapper');

    // 1. אתחול המפה (Panzoom)
    const panzoom = Panzoom(mapContainer, {
        maxScale: 2,
        minScale: 0.05,
        contain: 'outside'
    });

    // 2. זום וגרירה
    mapWrapper.addEventListener('wheel', panzoom.zoomWithWheel);
    mapWrapper.addEventListener('mousedown', () => mapWrapper.style.cursor = 'grabbing');
    mapWrapper.addEventListener('mouseup', () => mapWrapper.style.cursor = 'grab');

    // מרכוז המפה בהתחלה
    panzoom.zoom(0.1, { animate: false });
    setTimeout(() => {
        panzoom.pan(0, 0, { animate: false });
    }, 50);

    // ==========================================
    // קוד ה-jQuery של המרקר וה-Popup
    // ==========================================

    const $luffyMarker = $('#luffy-marker');
    const $luffyPopup = $luffyMarker.find('.info-popup');

    // כאן אתה מכניס את האחוזים המדויקים שמצאת קודם!
    $luffyMarker.css({
        top: '46.6%', // שנה למספר שלך
        left: '35.7%' // שנה למספר שלך
    });

    // פתיחה/סגירה של ה-Popup בלחיצה על המרקר
    $luffyMarker.on('click', function(event) {
        event.stopPropagation(); // קריטי: עוצר את הלחיצה מלעבור למפה
        
        // הפקודה stop(true, true) עוצרת כל אנימציה קודמת ומונעת את ההבהוב!
        $luffyPopup.stop(true, true).fadeToggle(300);
    });

    // סגירת ה-Popup בלחיצה בכל מקום אחר במסך
    $(document).on('click', function(event) {
        // אנחנו בודקים: האם המקום שלחצו עליו הוא *לא* המרקר של לופי?
        if (!$(event.target).closest('#luffy-marker').length) {
            // אם ה-Popup פתוח, תסגור אותו
            if ($luffyPopup.is(':visible')) {
                $luffyPopup.fadeOut(300);
            }
        }
    });
});















// // temp code for finding places in map
// // כלי עזר למפתח: חישוב קואורדינטות
// document.getElementById('map').addEventListener('click', function(e) {
//     // e.offsetX ו-e.offsetY נותנים לנו את הפיקסלים המדויקים על התמונה המקורית!
//     const xPercent = (e.offsetX / this.offsetWidth) * 100;
//     const yPercent = (e.offsetY / this.offsetHeight) * 100;
    
//     // בוא נוסיף קצת דיוק (4 ספרות אחרי הנקודה) כי המפה שלך ענקית
//     const finalX = xPercent.toFixed(2);
//     const finalY = yPercent.toFixed(2);
    
//     console.log(`luffyMarker.style.left = '${finalX}%';`);
//     console.log(`luffyMarker.style.top = '${finalY}%';`);
    
//     alert(`הקואורדינטות למרקר:\nleft: ${finalX}%\ntop: ${finalY}%`);
// });