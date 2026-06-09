
// search results and filtering behvior (using JQUERY)
function initSearch(dataToSearch, onItemSelect) {
    
    $('#search-input').on('input', function () {

        const inputVal = $(this).val(); // saves original val in order to save in SS
        sessionStorage.setItem('lastSearch', inputVal); // SS save
        
        const inputValLower = inputVal.toLowerCase();  // get what the user type and convert to lowercase
        const resultsContainer = $('#search-results');
        const searchBar = $('#search');
        resultsContainer.empty(); // clear previous results

        // if the input is empty, hide the dropdown
        if (inputVal === '') {
            resultsContainer.hide();
            searchBar.removeClass('active');
            return;
        }

        // filter allMapData depending on what the user typed
        const filteredData = dataToSearch.filter(item =>
            item.name.toLowerCase().includes(inputValLower)
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
                    sessionStorage.setItem('lastSearch', item.name); // update SS to the selected name
                    resultsContainer.hide(); // hide the dropdown
                    searchBar.removeClass('active');
                    
                    if (typeof onItemSelect === 'function') {
                        onItemSelect(item);
                    }
                });
                resultsContainer.append(resultItem); // add the link to the dropdown
            });
        }
        resultsContainer.show(); // show the dropdown with results
        searchBar.addClass('active');
    });
    
    // func to jump to location if user pressed enter
    $('#search-input').on('keydown', function (e) {
        if (e.key === 'Enter') { 
            e.preventDefault();
            
            // take the first result
            const firstResult = $('#search-results a').first();
            
            // automatic clicks on the first result if exists
            if (firstResult.length > 0) {
                firstResult.trigger('click');
            }
        }
    });

}



$(document).ready(function() { // wait to finish build the document 

    const savedSearch = sessionStorage.getItem('lastSearch'); // var to save search item in ss
    
    // check if there was data saved at ss
    if (savedSearch) {
        const searchInput = document.getElementById('search-input');
        // check if search input exists
        if (searchInput) {
            searchInput.value = savedSearch;
        }
    }

    // func to open the sidenav using JQUERY
    $('#open-nav-btn').on('click', function() {
        $('#mySidenav').css('width', '250px');
        $(this).fadeOut(200);
        $('#page-overlay').fadeIn(200);
    });

    // func to close the sidenav using JQUERY
    $('#close-nav-btn, #page-overlay').on('click', function() {
        $('#mySidenav').css('width', '0');
        $('#open-nav-btn').fadeIn(200)
        $('#page-overlay').fadeOut(200);
    });

    // func to hide search results and search area focus (using JQUERY)
    $(document).on('click', function(event) {
        // check if the click was outside the search area
        if (!$(event.target).closest('#search').length) {
            
            $('#search-results').hide(); // hides results
            $('#search').removeClass('active'); // removes style if any
            $('#search-input').blur(); // removing the curser
        }
    });

    
    // x button behvior (using JQUERY)   
    
    const $searchInput = $('#search-input');
    const $clearBtn = $('#clear-btn');

    // showing X button if there is input inside the search box
    $searchInput.on('input', function() {
        if ($(this).val().length > 0) {
            $clearBtn.show();
        } else {
            $clearBtn.hide();
        }
    });

    // clearing search area 
    $clearBtn.on('click', function(e) {
        e.preventDefault();
        $searchInput.val(''); // clears search area
        sessionStorage.removeItem('lastSearch'); // delete from ss
        
        // re-trigger the typing event to returns the rest of the items back to the screen
        $searchInput.trigger('input'); 

        $searchInput.focus();
    });

});
