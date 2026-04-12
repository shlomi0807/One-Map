// waiting for page to reload using JQUERY
$(window).on('load', function () {
    const mapContainer = document.getElementById('map-container');
    const mapWrapper = document.getElementById('map-wrapper');

    // initialization panzoom
    const panzoom = Panzoom(mapContainer, {
        maxScale: 2,
        minScale: 0.05,
        contain: 'outside' // allows the map to go outside of the wrapper
    });

    mapWrapper.addEventListener('wheel', panzoom.zoomWithWheel); // allwos for scrolling with mouse wheel

    panzoom.zoom(0.05, { animate: false }) // initialization map zoom

    setTimeout(() => {
        panzoom.pan(0, 0, { animate: false }); // initialization map in the center
    }, 50);

    let allMapData = []; // arry to stor all character/island data from memory

    // characters markers
    fetch('data/characters.json')
        .then(response => response.json()) // converts the text to json
        .then(characters => {
            characters.forEach(character => {
                const marker = document.createElement('div');
                marker.classList.add('marker');
                
                // set the place of the character in the map
                marker.style.top = character.top + '%';
                marker.style.left = character.left + '%';

                // creats the inner HTML for each chatacter
                marker.innerHTML = `
                    <img src="${character.image}" alt="${character.name}" title="${character.name}">
                    <div class="info-popup">
                        <h3>${character.name}</h3>
                        <strong>Bounty: </strong>${character.bounty}<br>
                        <strong>Status: </strong>${character.status}<br>
                        <strong>Condition: </strong>${character.condition}<br>
                    </div>
                `;

                // listening to click on the markers in order to open it
                marker.addEventListener('click', (event) => {
                    event.stopPropagation(); // make sure the click activate only the marker
                    const popup = marker.querySelector('.info-popup');

                    // close all other popups
                    document.querySelectorAll('.info-popup').forEach(p => {
                        if (p !== popup) {
                            p.style.display = 'none';
                        }
                    });

                    // open and close the current popup
                    popup.style.display = popup.style.display === 'block' ? 'none' : 'block';
                });

                mapContainer.appendChild(marker); // adds the marker to the map
                character.element = marker; // adds the marker created to the character data

            });

            allMapData = [...allMapData, ...characters]; // adds the new data to the arr
        
        })
        .catch(error => console.error('Error loading characters:', error));


    // island markers
    fetch('data/islands.json')
        .then(response => response.json()) // converts the text to json
        .then(islands => {
            islands.forEach(island => {
                const area = document.createElement('div');
                area.classList.add('island-area');

                // set the place and the size of the island in the map
                area.style.top = island.top + '%';
                area.style.left = island.left + '%';
                area.style.width = island.width + 'px';
                area.style.height = island.height + 'px';

                // creats the inner HTML for each island
                area.innerHTML = `
                    <div class="island-popup">
                        <strong>${island.name}</strong><br>
                        ${island.description}
                    </div>
                `;

                // listening to click on the markers in order to open it
                area.addEventListener('click', (event) => {
                    event.stopPropagation(); // make sure the click activate only the marker
                    const popup = area.querySelector('.island-popup');

                    // close all other popups
                    document.querySelectorAll('.island-popup').forEach(p => {
                        if (p !== popup) {
                            p.style.display = 'none';
                        }
                    });
                    
                    // open and close the current popup
                    popup.style.display === 'block' ? 'none' : 'block';
                });

                mapContainer.appendChild(area); // adds the marker to the map
                island.element = area; // adds the marker created to the island data

            });
            
            allMapData = [...allMapData, ...islands]; // adds the new data to the arr
    })
    .catch(error => console.error('Error loading islands:', error));

     // close when clicking outside the window
    document.addEventListener('click', () => {
        document.querySelectorAll('.info-popup, .island-popup').forEach(p => {
            p.style.display = 'none';
        });
    });

    // function to move to the location of a specific character / island
    function jumpToLocation(item) {
        const targetScale = 2;

        const markerX = (parseFloat(item.left) / 100) * mapContainer.offsetWidth;
        const markerY = (parseFloat(item.top) / 100) * mapContainer.offsetHeight;

        const wrapperW = mapWrapper.offsetWidth;
        const wrapperH = mapWrapper.offsetHeight;

        // disable contain so pan is not clamped during the jump
        panzoom.setOptions({ contain: undefined });

        // reset to scale=1 and place marker at viewport center
        panzoom.zoom(1, { animate: false });
        panzoom.pan(wrapperW / 2 - markerX, wrapperH / 2 - markerY, { animate: false });

        setTimeout(() => {
            // zoom to targetScale with viewport center as focal point
            // marker is already at viewport center so it stays there
            panzoom.zoomToPoint(targetScale, { clientX: wrapperW / 2, clientY: wrapperH / 2 });

            // Re-enable contain after the jump completes
            setTimeout(() => {
                panzoom.setOptions({ contain: 'outside' });
            }, 100);

            // Open this item's popup (close all others first)
            if (item.element) {
                document.querySelectorAll('.info-popup, .island-popup').forEach(p => p.style.display = 'none');
                const popup = item.element.querySelector('.info-popup, .island-popup');
                if (popup) popup.style.display = 'block';
            }
        }, 50);
    }

    // search bar behavior (using JQUERY)
    $('#toggle-search-btn').on('click', function () {

        // add/remove close class to slide the search bar in/out
        $('#search').toggleClass('close');

        // swap the arrow icon direction (left - right)
        $('#toggle-icon').toggleClass('fa-chevron-left fa-chevron-right');

        // if the arrow points left show the search icon and results
        if ($('#toggle-icon').hasClass('fa-chevron-left')) {
            $('#search .fa-search').show();
            $('#search-results').show();
        } else {
            // arrow points right hide everything
            $('#search .fa-search').hide();
            $('#search-results').hide();
        }

        // if search is open focus in the input
        if ($('#search').hasClass('open')) {
            $('#search-input').focus();
        }
    });

    // search results and filtering behvior (using JQUERY)
    $('#search-input').on('input', function () {

        // get what the user type and convert to lowercase
        const inputVal = $(this).val().toLowerCase();
        const resultsContainer = $('#search-results');
        resultsContainer.empty(); // clear previous results

        // if the input is empty, hide the dropdown
        if (inputVal === '') {
            resultsContainer.hide();
            return;
        }

        // filter allMapData depending on what the user typed
        const filteredData = allMapData.filter(item =>
            item.name.toLowerCase().includes(inputVal)
        );

        // of no matches found, show a gray message
        if (filteredData.length === 0) { 
            resultsContainer.append('<a style="color: gray; cursor: default;">No results found</a>');
        } else {
            // create a clickable link for each matching result
            filteredData.forEach(item => {
                const resultItem = $('<a></a>').text(item.name);

                resultItem.on('click', function (e) {
                    e.preventDefault(); // Prevent default link behavior

                    $('#search-input').val(item.name); // fill the input with the selected name
                    resultsContainer.hide(); // hide the dropdown
                    jumpToLocation(item); // go to the location on the map (calls the function)
                });
                resultsContainer.append(resultItem); // add the link to the dropdown
            });
        }
        resultsContainer.show(); // show the dropdown with results
    });

    $(document).on('click', function (event) {
        if (!$(event.target).closest('#search').length) {
            $('#search-results').hide(); // close search results when clicking outside the search bar
        }
    });



/////////////////////////////////////////////////////////////////////////////////////



    /////////////////////////////////////////////////////////
    // delete at realese
    ////////////////////////////////////////////////////////
    

    // temp code for finding click area
    document.getElementById('map').addEventListener('click', function(e) {
    const xPercent = (e.offsetX / this.offsetWidth) * 100;
    const yPercent = (e.offsetY / this.offsetHeight) * 100;
    
    console.log(`--- click ---`);
    console.log(`top=${yPercent.toFixed(2)}`);
    console.log(`left=${xPercent.toFixed(2)}`);
    //console.log(`panzoom methods:`, Object.keys(panzoom));
    console.log(`getPan:`, panzoom.getPan());
    console.log(`getScale:`, panzoom.getScale());
    });





});












