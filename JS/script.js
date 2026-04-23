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

    const mapImg = document.getElementById('map');

    const initMap = () => {
        requestAnimationFrame(() => { // ensure that the DOM is fully ready before setting the pan
            panzoom.zoom(0.2, { animate: false });
            requestAnimationFrame(() => {
                panzoom.pan(0, 0, { animate: false });
            });
        });
    };

    // init immediately if image is already loaded (from cache)
    if (mapImg.complete) {
        initMap();
    } 
    else { // otherwise wait for it to load
        mapImg.addEventListener('load', initMap);
    }

    let allMapData = []; // arry to stor all character/island data from memory

    /* ----- characters markers ----- */

    fetch('data/characters.json')
        .then(response => response.json()) // converts the text to json
        .then(characters => {

            const CLUSTER_DISTANCE = 0.6; // the min distance that cluster markers together 
            let clusters = [];

            // sorts to groups
            characters.forEach(character => {
                let placed = false;
                for (let cluster of clusters) {
                    let dx = parseFloat(character.left) - cluster.centerLeft;
                    let dy = parseFloat(character.top) - cluster.centerTop;
                    let distance = Math.sqrt((dx * dx) + (dy * dy));

                    if (distance <= CLUSTER_DISTANCE) {
                        cluster.members.push(character);
                        placed = true;
                        break;
                    }
                }
                if (!placed) {
                    clusters.push({
                        centerLeft: parseFloat(character.left),
                        centerTop: parseFloat(character.top),
                        members: [character]
                    });
                }
            });

            // draws on the map
            clusters.forEach(cluster => {
                if (cluster.members.length === 1) {

                    createSingleCharacterMarker(cluster.members[0]); 
                } else {
                    // group elements
                    const clusterMarker = document.createElement('div');
                    clusterMarker.classList.add('cluster-marker');
                    clusterMarker.style.left = cluster.centerLeft + '%';
                    clusterMarker.style.top = cluster.centerTop + '%';
                    
                    // Separate element for number or image
                    const display = document.createElement('div');
                    display.classList.add('cluster-display');
                    display.dataset.count = cluster.members.length;
                    display.innerHTML = cluster.members.length;
                    clusterMarker.appendChild(display);

                    // group pup up element
                    const activePopup = document.createElement('div');
                    activePopup.classList.add('info-popup'); 
                    activePopup.style.display = 'none';
                    clusterMarker.appendChild(activePopup);

                    //adding menu elenemt
                    const menu = document.createElement('div');
                    menu.classList.add('cluster-menu');
                    
                    cluster.members.forEach(character => {
                        const item = document.createElement('div');
                        
                        item.innerHTML = `
                            <img src="${character.image}" alt="${character.name}" class="cluster-menu-img">
                            <span>${character.name}</span>
                        `;
                        
                        // function to crate the pop up of a character
                        const openCharacterLogic = () => {
                            menu.style.display = 'none';
                            display.innerHTML = `<img src="${character.image}" title="${character.name}" class="cluster-active-img">`;
                            activePopup.innerHTML = `
                                <h3>${character.name}</h3>
                                <strong>Bounty: </strong>${character.bounty}<br>
                                <strong>Status: </strong>${character.status}<br>
                                <strong>Condition: </strong>${character.condition}<br>
                                <strong>Last Seen: </strong>${character.last_seen_manga}<br>
                                <strong>Infromation: </strong><a style="color: white;" href = ${character.link}>see at character page</a><br>
                            `;
                            document.querySelectorAll('.info-popup, .island-popup, .cluster-menu').forEach(p => p.style.display = 'none');
                            activePopup.style.display = 'block';
                        };

                        // listen to a click on the cluster marker
                        item.addEventListener('click', (e) => {
                            e.stopPropagation();
                            openCharacterLogic();
                        });

                        character.triggerPopup = openCharacterLogic; // saves parameters to search the character
                        character.element = clusterMarker; // adds the cluster marker created to the character data
                        menu.appendChild(item);
                    });

                    clusterMarker.appendChild(menu);

                    // disable panzoom scroll when hovering over the menu
                    menu.addEventListener('wheel', (e) => {
                        e.stopPropagation();
                    }, { passive: false });

                    // open and close the menu by clicking on the pop up
                    clusterMarker.addEventListener('click', (e) => {
                        e.stopPropagation();
                        display.innerHTML = cluster.members.length; // returns the display to the number

                        document.querySelectorAll('.info-popup, .island-popup, .cluster-menu').forEach(p => {
                            if (p !== menu && p !== activePopup) p.style.display = 'none';
                        });

                        // returns the number of a cluster if it was open
                        document.querySelectorAll('.cluster-display').forEach(display => {
                            if (display.dataset.count) {
                                display.innerHTML = display.dataset.count; // take the number from the memory
                            }
                        });
                        
                        // close popup when the menu opens
                        activePopup.style.display = 'none';
                        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                    });

                    mapContainer.appendChild(clusterMarker);
                }
            });     

        allMapData = [...allMapData, ...characters]; // adds the new data to the arr
        
    })
    .catch(error => console.error('Error loading characters:', error));  
        
    // function to create a single character marker 
    function createSingleCharacterMarker(character) {
        //characters.forEach(character => {
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
                    <strong>Last Seen: </strong>${character.last_seen_manga}<br>
                    <strong>Infromation: </strong><a style="color: white;" href = ${character.link}>see at character page</a><br>
                </div>
            `;

            const openCharacterLogic = () => {
                const popup = marker.querySelector('.info-popup');
                
                // resets the clusters
                document.querySelectorAll('.cluster-display').forEach(d => {
                if (d.dataset.count) d.innerHTML = d.dataset.count;
                });
                
                // close all other popups
                document.querySelectorAll('.island-popup, .info-popup, .cluster-menu').forEach(p => {
                    if (p !== popup) 
                        p.style.display = 'none';
                });

                // open and close the current popup
                popup.style.display = popup.style.display === 'block' ? 'none' : 'block';
            };

            // listen to a click on the marker
            marker.addEventListener('click', (event) => {
                event.stopPropagation(); // make sure the click activate only the marker
                openCharacterLogic();
            });

            // saves parameters to search the character
            character.triggerPopup = openCharacterLogic;

            mapContainer.appendChild(marker); // adds the marker to the map
            character.element = marker; // adds the marker created to the character data
    }

    /* ----- island markers ----- */

    fetch('data/islands.json')
        .then(response => response.json()) // converts the text to json
        .then(islands => {
            islands.forEach(island => {
                const area = document.createElement('div');
                
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                
                //להחזיר / למחוק כדי להעלים / לשים
                area.classList.add('island-area');

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////               
                // set the place and the size of the island in the map
                area.style.top = island.top + '%';
                area.style.left = island.left + '%';
                area.style.width = island.width + 'px';
                area.style.height = island.height + 'px';

                // creats the inner HTML for each island
                area.innerHTML = `
                    <div class="island-popup">
                        <h3>${island.name}</h3>
                        <strong>Ruler: </strong>${island.ruler}<br>
                        <strong>Arc: </strong>${island.arc}<br>
                        <strong>Chapters: </strong>${island.chapters}<br>
                        <strong>Infromation: </strong><a style="color: white;" href = ${island.link}>see at places page</a><br>
                    </div>
                `;

                // listening to click on the markers in order to open it
                area.addEventListener('click', (event) => {
                    event.stopPropagation(); // make sure the click activate only the marker
                    const popup = area.querySelector('.island-popup');

                    // close all other popups
                    document.querySelectorAll('.island-popup, .info-popup, .cluster-menu').forEach(p => {
                        if (p !== popup) {
                            p.style.display = 'none';
                        }
                    });

                    // returns the number of a cluster if it was open
                    document.querySelectorAll('.cluster-display').forEach(display => {
                        if (display.dataset.count) {
                            display.innerHTML = display.dataset.count; // take the number from the memory
                        }
                    });
                            
                    // open and close the current popup
                    popup.style.display = popup.style.display === 'block' ? 'none' : 'block';
                });

                mapContainer.appendChild(area); // adds the marker to the map
                island.element = area; // adds the marker created to the island data

            });
            
        allMapData = [...allMapData, ...islands]; // adds the new data to the arr
    })
    .catch(error => console.error('Error loading islands:', error));

    // close when clicking outside the window
    document.addEventListener('click', () => {
        document.querySelectorAll('.info-popup, .island-popup, .cluster-menu').forEach(p => {
            p.style.display = 'none';
        });

        // returns the number of a cluster if it was open
        document.querySelectorAll('.cluster-display').forEach(display => {
            if (display.dataset.count) {
                display.innerHTML = display.dataset.count; // take the number from the memory
            }
        });

    });

    // changin the scale of the pop-ups to match the current zoom
    mapContainer.addEventListener('panzoomchange', (event) => {
    const inverseScale = 1 / event.detail.scale; // reads current zoom and inverts it

    // pass the value to the CSS 
    document.documentElement.style.setProperty('--popup-scale', inverseScale);
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

        // if no matches found, show a gray message
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

                    // check if the item have a trigger value
                    setTimeout(() => { // wating to finish the jump 
                        if (item.triggerPopup) {
                            item.triggerPopup();
                        }
                    }, 50);
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
    console.log(`panzoom methods:`, Object.keys(panzoom));
    console.log(`getPan:`, panzoom.getPan());
    console.log(`current zoom:`, panzoom.getScale());
    });





});












