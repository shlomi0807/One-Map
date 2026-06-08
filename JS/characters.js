// waits for HTML to load
document.addEventListener('DOMContentLoaded', () => {
    
    fetch('data/characters.json')
        .then(response => response.json()) 
        .then(characters => {
            const gridContainer = document.getElementById('cards-grid');
            let htmlContent = '';

            characters.forEach((character, index) => {
                // create a unique ID for each character
                const charId = `char-${index}`;
                
                character.elementId = charId;

                htmlContent += `
                <div class="character-row" id="${charId}">
                    
                    <div class="flip-card">
                        <div class="flip-card-inner">
                            <div class="flip-card-front">
                                <img src="${character.image}" alt="${character.name}">
                            </div>
                            <div class="flip-card-back">
                                <p><strong>Bounty:</strong> ${character.bounty}</p>
                                <p><strong>Last Seen:</strong> ${character.last_seen_manga}</p>
                            </div>
                        </div>
                    </div>

                    <div class="character-info">
                        <h2>${character.name}</h2>
                        <p>${character.info}</p>
                    </div>

                </div>
                `;
            });

            // inserts all cards to HTML
            gridContainer.innerHTML = htmlContent;

            // flips the card when receives a click
            gridContainer.addEventListener('click', (event) => {
                const card = event.target.closest('.flip-card');
                if (card) {
                    card.classList.toggle('is-flipped'); 
                }
            });

            // calls the generic search func
            initSearch(characters, function(selectedItem) {
                // hiding all character
                $('.character-row').hide();
                // shows the selected character
                $('#' + selectedItem.elementId).show(); 
            });

            // live filter of character search
            $('#search-input').on('input', function() {
                const inputVal = $(this).val().toLowerCase().trim();
                
                if (inputVal === '') {
                    // shows all character when search is empty
                    $('.character-row').show(); 
                    $('.flip-card').removeClass('is-flipped'); //  closes open cards
                } else {
                    let hasMatches = false; // flag to check if at least one character was found
                    
                    // go through all the characters and Comparing them one by one as you type
                    characters.forEach(character => {
                        if (character.name.toLowerCase().includes(inputVal)) {
                            $('#' + character.elementId).show();
                            hasMatches = true; // flag up when founds a character
                        } else {
                            $('#' + character.elementId).hide();
                        }
                    });
                    
                    // if there is no match at all, show back all character
                    if (hasMatches === false) {
                        $('.character-row').show();
                    }
                }
            });

        })
        .catch(error => console.error('Error fetching characters:', error));
});