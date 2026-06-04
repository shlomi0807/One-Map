
// waits for HTML to load
document.addEventListener('DOMContentLoaded', () => {
    
    fetch('data/islands.json')
        .then(response => response.json()) // converts the text to json
        .then(islands => {
            const gridContainer = document.getElementById('cards-grid');
            let htmlContent = '';

            islands.forEach(island => {
                htmlContent += `
                <div class="flip-card">
                    <div class="flip-card-inner">
                        <div class="flip-card-front">
                            <img src="${island.image}" alt="${island.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 5px;">
                        </div>
                        <div class="flip-card-back">
                            <h1>${island.name}</h1>
                            <p>Ruler: ${island.ruler}</p>
                            <p>Chapters: ${island.chapters}</p>
                        </div>
                    </div>
                </div>
                `;
            });

            // inserts all cards to HTML
            gridContainer.innerHTML = htmlContent;

            gridContainer.addEventListener('click', (event) => {
                // findes the closest card near the click
                const card = event.target.closest('.flip-card');
                if (card) {
                    card.classList.toggle('is-flipped'); 
                }
            });
        })
});