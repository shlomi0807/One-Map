

const select = document.getElementById('reqtype');

// display placeholder for select tag in gray
select.addEventListener('change', function () {
    if (this.value !== '') {
        this.classList.add('valid');
    } else {
        this.classList.remove('valid');
    }
});

const form = document.querySelector('form');

// play audio on submit
form.addEventListener('submit', function(event) {

    event.preventDefault(); // prevent the page from refresh immediately
    const submitSound = new Audio('audio/gotcha.mp3'); 
    submitSound.play();
    form.reset();

    // returns select tag to gray
    document.getElementById('reqtype').classList.remove('valid');
});

