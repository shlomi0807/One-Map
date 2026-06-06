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
            panzoom.zoom(0.15, { animate: false });
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
                            // reset all markers z-index
                            document.querySelectorAll('.marker, .cluster-marker, .island-area').forEach(el => {
                                el.style.zIndex = '';
                            });
                            
                            // raise this cluster above all others
                            clusterMarker.style.zIndex = 100;
                            menu.style.display = 'none';
                            display.innerHTML = `<img src="${character.image}" title="${character.name}" class="cluster-active-img">`;
                            activePopup.innerHTML = `
                                <h3>${character.name}</h3>
                                <strong>Bounty: </strong>${character.bounty}<br>
                                <strong>Status: </strong>${character.status}<br>
                                <strong>Condition: </strong>${character.condition}<br>
                                <strong>Last Seen: </strong>${character.last_seen_manga}<br>
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

        allMapData.push(...characters); // pushes the new data into the arr
        
    })
    .catch(error => console.error('Error loading characters:', error));  
        
    // function to create a single character marker 
    function createSingleCharacterMarker(character) {
            const marker = document.createElement('div');
            marker.classList.add('marker');
            
            // ads a code name to fix popups that close to edges of the map
            let popupFix = "";

            if (character.left < 5) {
                popupFix = "align-left";
            } else if (character.left > 95) {
                popupFix = "align-right";
            } else if (character.top < 10) {
                popupFix = "align-top";
            }

            // set the place of the character in the map
            marker.style.top = character.top + '%';
            marker.style.left = character.left + '%';

            // creats the inner HTML for each chatacter
            marker.innerHTML = `
                <img src="${character.image}" alt="${character.name}" title="${character.name}">
                <div class="info-popup ${popupFix}">
                    <h3>${character.name}</h3>
                    <strong>Bounty: </strong>${character.bounty}<br>
                    <strong>Status: </strong>${character.status}<br>
                    <strong>Condition: </strong>${character.condition}<br>
                    <strong>Last Seen: </strong>${character.last_seen_manga}<br>
                </div>
            `;

            const openCharacterLogic = () => {
                const popup = marker.querySelector('.info-popup');

                // reset all markers z-index
                document.querySelectorAll('.marker, .cluster-marker, .island-area').forEach(el => {
                    el.style.zIndex = '';
                });
                
                // raise this marker above all others
                marker.style.zIndex = 100;
                            
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

                // ads a code name to fix popups that close to edges of the map
                let popupFix = "";

                if (parseFloat(island.left) < 5) {
                    popupFix = "align-left";
                } else if (parseFloat(island.left) > 95) {
                    popupFix = "align-right";
                } else if (parseFloat(island.top) < 10) {
                    popupFix = "align-top";
                }

                // creats the inner HTML for each island
                area.innerHTML = `
                    <div class="island-popup ${popupFix}">
                        <h3>${island.name}</h3>
                        <strong>Ruler: </strong>${island.ruler}<br>
                        <strong>Arc: </strong>${island.arc}<br>
                        <strong>Chapters: </strong>${island.chapters}<br>
                    </div>
                `;

                // listening to click on the markers in order to open it
                area.addEventListener('click', (event) => {
                    event.stopPropagation(); // make sure the click activate only the marker
                    const popup = area.querySelector('.island-popup');

                    // reset all markers z-index
                    document.querySelectorAll('.marker, .cluster-marker, .island-area').forEach(el => {
                        el.style.zIndex = '';
                    });
                    
                    // raise this island above all others
                    //area.style.zIndex = 100;

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
            
        allMapData.push(...islands); // pushes the new data into the arr
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
            if (item.element && !item.triggerPopup) {
                document.querySelectorAll('.info-popup, .island-popup').forEach(p => p.style.display = 'none');
                const popup = item.element.querySelector('.info-popup, .island-popup');
                if (popup) popup.style.display = 'block';
            }
        }, 50);
    }


    // calls the generic search func
    initSearch(allMapData, function(selectedItem) {
        jumpToLocation(selectedItem);
        
        setTimeout(() => { 
            if (selectedItem.triggerPopup) {
                selectedItem.triggerPopup();
            }
        }, 50);
    });


    $(document).on('click', function (event) {
        if (!$(event.target).closest('#search').length) {
            $('#search-results').hide(); // close search results when clicking outside the search bar
            $('#search').removeClass('active'); 
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












