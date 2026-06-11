
// ---self save in local storage ---

// catching all fields of the form
const fnameInput = document.getElementById('fname');
const emailInput = document.getElementById('email');
const reqTypeSelect = document.getElementById('reqtype');
const subjectInput = document.getElementById('subject');

// func to save every data every change
function saveFormData() {
    localStorage.setItem('savedFname', fnameInput.value);
    localStorage.setItem('savedEmail', emailInput.value);
    localStorage.setItem('savedReqType', reqTypeSelect.value);
    localStorage.setItem('savedSubject', subjectInput.value);
}

// listening to every inpot in the form
fnameInput.addEventListener('input', saveFormData);
emailInput.addEventListener('input', saveFormData);
reqTypeSelect.addEventListener('change', saveFormData);
subjectInput.addEventListener('input', saveFormData);

// func to check if there is any data stored and displaying it
function loadFormData() {
    if (localStorage.getItem('savedFname')) {
        fnameInput.value = localStorage.getItem('savedFname');
    }
    
    if (localStorage.getItem('savedEmail')) {
        emailInput.value = localStorage.getItem('savedEmail');
    }
    
    if (localStorage.getItem('savedReqType')) {
        reqTypeSelect.value = localStorage.getItem('savedReqType');
        // if there was a selected reqtype, displaying it in black
        if (reqTypeSelect.value !== '') {
            reqTypeSelect.classList.add('valid');
        }
    }
    
    if (localStorage.getItem('savedSubject')) {
        subjectInput.value = localStorage.getItem('savedSubject');
        // if we reached max input, displaying the warning
        if (subjectInput.value.length >= 1000) {
            document.getElementById('char-warning').style.display = 'inline';
        }
    }
}

// start loading as soon as the page loades up
loadFormData();


// display placeholder for select tag in gray
const select = document.getElementById('reqtype');

select.addEventListener('change', function () {
    if (this.value !== '') {
        this.classList.add('valid');
    } else {
        this.classList.remove('valid');
    }
});


// sets a custom invalid message of email address
emailInput.addEventListener('invalid', function() {
    this.setCustomValidity('Please enter a valid email address');
});
emailInput.addEventListener('input', function() {

    this.setCustomValidity(''); // resets the error so the browser check it again
});

// sets a custom invalid message when user didnt choose a type of request
reqTypeSelect.addEventListener('invalid', function() {
    this.setCustomValidity('Please choose a type of request');
});
reqTypeSelect.addEventListener('change', function() {
    this.setCustomValidity(''); 
});

// sets a custom invalid message if textarea is empty
subjectInput.addEventListener('invalid', function() {
    this.setCustomValidity('Please enter a subject');
});
subjectInput.addEventListener('input', function() {
    this.setCustomValidity(''); 
});


// message for reaching max characters in text box 

const textarea = document.getElementById('subject');
const warningText = document.getElementById('char-warning');

// listening to type in the textarea
textarea.addEventListener('input', function() {
    // check if the number of characters is more than/equal to 1000
    if (this.value.length >= 1000) {
        warningText.style.display = 'inline';
    } else {
        warningText.style.display = 'none'; 
    }
});

// managing form submitting

const form = document.querySelector('form');
const popup = document.getElementById('success-popup');
const closepopupBtn = document.getElementById('close-popup');

form.addEventListener('submit', function(event) {
    
    event.preventDefault(); // prevent the page from refresh immediately

    // creats the data objects from the input in the form
    const formData = {
        name: document.getElementById('fname').value,
        email: document.getElementById('email').value,
        type: document.getElementById('reqtype').value,
        subject: document.getElementById('subject').value
    };

    // prints the data to the console in JSON format (we can't save it to JSON without backend)
    console.log("New contact form submission:");
    console.log(JSON.stringify(formData, null, 2));

    // activating sound
    const submitSound = new Audio('audio/gotcha.mp3'); 
    submitSound.play();

    // activating fade in 
    popup.classList.add('show');

    // reset the form and the selection box
    form.reset();
    document.getElementById('reqtype').classList.remove('valid');

    // cleaning local storage
    localStorage.removeItem('savedFname');
    localStorage.removeItem('savedEmail');
    localStorage.removeItem('savedReqType');
    localStorage.removeItem('savedSubject');

    // removes the warning of max input if it was active
    document.getElementById('char-warning').style.display = 'none';

});

// listener to click on the close button in the popup
closepopupBtn.addEventListener('click', function() {
    // removes class so the popup will fade out
    popup.classList.remove('show');
});
