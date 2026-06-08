// waits for HTML to load
document.addEventListener('DOMContentLoaded', () => {
    
    fetch('data/islands.json')
        .then(response => response.json()) // converts the text to json
        .then(islands => {
            const gridContainer = document.getElementById('cards-grid');
            let htmlContent = '';

            islands.forEach((island, index) => {
                // 1create a unique ID for each island)
                const islandId = `island-${index}`;
                
                island.elementId = islandId;

                htmlContent += `
                <div class="flip-card" id="${islandId}">
                    <div class="flip-card-inner">
                        <div class="flip-card-front">
                            <img src="${island.image}" alt="${island.name}">
                        </div>
                        <div class="flip-card-back">
                            <h1>${island.name}</h1>
                            <p>Ruler: ${island.ruler}</p>
                            <p>Arc: ${island.arc}</p>
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

            // calls the generic search func
            initSearch(islands, function(selectedItem) {
                // hids all islands
                $('.flip-card').hide();
                
                //shows the selected island
                $('#' + selectedItem.elementId).show(); 
                
                // opens its card
                $('#' + selectedItem.elementId).addClass('is-flipped');
            });

            // live filter of islands search
            $('#search-input').on('input', function() {
                const inputVal = $(this).val().toLowerCase().trim();
                
                if (inputVal === '') {
                    // shows all islands when search is empty
                    $('.flip-card').show(); 
                    $('.flip-card').removeClass('is-flipped'); // closes open cards
                } else {
                    let hasMatches = false; // flag to check if at least one island was found
                    
                    // go through all the islands and Comparing them one by one as you type
                    islands.forEach(island => {
                        if (island.name.toLowerCase().includes(inputVal)) {
                            $('#' + island.elementId).show();
                            hasMatches = true; // flag up when founds a island
                        } else {
                            $('#' + island.elementId).hide();
                        }
                    });
                    
                    // if there is no match at all, show back all islands
                    if (hasMatches === false) {
                        $('.flip-card').show(); 
                    }
                }
            });

        })
        .catch(error => console.error('Error fetching islands:', error));
});