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

                marker.style.top = character.top + '%';
                marker.style.left = character.left + '%';

                marker.innerHTML = `
                    <img src="${character.image}" alt="${character.name}" title="${character.name}">
                    <div class="info-popup">
                        <h3>${character.name}</h3>
                        <strong>Bounty: </strong>${character.bounty}<br>
                        <strong>Status: </strong>${character.status}<br>
                        <strong>Condition: </strong>${character.condition}<br>
                    </div>
                `;

                marker.addEventListener('click', (event) => {
                    event.stopPropagation();
                    const popup = marker.querySelector('.info-popup');

                    document.querySelectorAll('.info-popup').forEach(p => {
                        if (p !== popup) {
                            p.style.display = 'none';
                        }
                    });

                    popup.style.display = popup.style.display === 'block' ? 'none' : 'block';
                });

                mapContainer.appendChild(marker);

                character.element = marker; 

            });

            allMapData = [...allMapData, ...characters]; 
        
        })
        .catch(error => console.error('Error loading characters:', error));


    // island markers
    fetch('data/islands.json')
        .then(response => response.json()) // converts the text to json
        .then(islands => {
            islands.forEach(island => {
                const area = document.createElement('div');
                area.classList.add('island-area');

                area.style.top = island.top + '%';
                area.style.left = island.left + '%';
                area.style.width = island.width + 'px';
                area.style.height = island.height + 'px';

                area.innerHTML = `
                    <div class="island-popup">
                        <strong>${island.name}</strong><br>
                        ${island.description}
                    </div>
                `;

                area.addEventListener('click', (event) => {
                    event.stopPropagation();

                    const popup = area.querySelector('.island-popup');

                    document.querySelectorAll('.island-popup').forEach(p => {
                        if (p !== popup) {
                            p.style.display = 'none';
                        }
                    });

                    popup.style.display =
                        popup.style.display === 'block' ? 'none' : 'block';
                });

                mapContainer.appendChild(area);

                island.element = area;

            });

            allMapData = [...allMapData, ...islands];
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

    // search
    $('#toggle-search-btn').on('click', function () {
        $('#search').toggleClass('close');
        $('#toggle-icon').toggleClass('fa-chevron-left fa-chevron-right');
        if ($('#toggle-icon').hasClass('fa-chevron-left')) {
            $('#search .fa-search').show();
            $('#search-results').show();
        } else {
            $('#search .fa-search').hide();
            $('#search-results').hide();
        }
        if ($('#search').hasClass('open')) {
            $('#search-input').focus();
        }
    });

    $('#search-input').on('input', function () {
        const inputVal = $(this).val().toLowerCase();
        const resultsContainer = $('#search-results');
        resultsContainer.empty();

        if (inputVal === '') {
            resultsContainer.hide();
            return;
        }

        const filteredData = allMapData.filter(item =>
            item.name.toLowerCase().includes(inputVal)
        );

        if (filteredData.length === 0) {
            resultsContainer.append('<a style="color: gray; cursor: default;">No results found</a>');
        } else {
            filteredData.forEach(item => {
                const resultItem = $('<a></a>').text(item.name);
                resultItem.on('click', function (e) {
                    e.preventDefault();
                    $('#search-input').val(item.name);
                    resultsContainer.hide();
                    jumpToLocation(item);
                });
                resultsContainer.append(resultItem);
            });
        }

        resultsContainer.show();
    });

    $(document).on('click', function (event) {
        if (!$(event.target).closest('#search').length) {
            $('#search-results').hide();
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












