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

