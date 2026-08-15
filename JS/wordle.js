$(document).ready(function () {
    let targetWord = "";
    let wordLength = 0;
    let currentGuessCount = 0;
    const maxGuesses = 6;
    
    // Stores character lists by difficulty
    let gameData = { easy: [], medium: [], hard: [] };
    let currentLevel = 'easy';

    const $activeRow = $('#active-guess');
    const $historyContainer = $('#guess-history');
    const $checkBtn = $('#check-btn');
    const $message = $('#game-message');
    const $hintBtn = $('#hint-btn');

    // --- 1. Load the Counts JSON Data ---
    // Fetching the flat character appearance counts dictionary
    $.getJSON('charactersFinder/onepiece_counts.json', function(data) {
        // Get all character names
        let allChars = Object.keys(data);
        
        // Filter out any invalid / empty entries
        allChars = allChars.filter(c => /[a-zA-Z]/.test(c));
        
        // Sort character names strictly by appearance count descending
        allChars.sort((a, b) => data[b] - data[a]);
        
        // Calculate thresholds for difficulties based on percentages
        let top5Count = Math.ceil(allChars.length * 0.05);
        let top20Count = Math.ceil(allChars.length * 0.20);
        
        // Assign arrays based on the new percentage rules
        gameData.easy = allChars.slice(0, top5Count);     // Top 5% most frequent (Legends)
        gameData.medium = allChars.slice(0, top20Count);  // Top 20% (First name only)
        gameData.hard = allChars.slice(0, top20Count);    // Top 20% (Full name with hyphens)

        startNewGame(); // Start game once sorted data is ready
    }).fail(function() {
        alert("Error loading onepiece_counts.json! Please check the file path.");
    });

    // --- 2. Difficulty Button Listeners ---
    $('.diff-btn').on('click', function() {
        $('.diff-btn').removeClass('active');
        $(this).addClass('active');
        currentLevel = $(this).data('level');
        startNewGame();
    });

    // --- 3. Parsing Names ---
    function getCleanFirstName(fullName) {
        // Remove special chars, split by space, and get the last word (Given Name)
        let clean = fullName.replace(/[^a-zA-Z\s]/g, '').trim();
        let parts = clean.split(' ');
        return parts[parts.length - 1].toUpperCase();
    }

    function getCleanFullName(fullName) {
        // Remove special chars, replace spaces with hyphens
        let clean = fullName.replace(/[^a-zA-Z\s]/g, '').trim();
        return clean.replace(/\s+/g, '-').toUpperCase();
    }

    // --- 4. Game Setup Logic ---
    function startNewGame() {
        currentGuessCount = 0;
        $historyContainer.empty();
        $activeRow.empty();
        $message.hide();
        $checkBtn.show();
        
        // Add this line to reset the hint button
        $hintBtn.prop('disabled', false).show();
        
        let wordList = gameData[currentLevel];
        if (!wordList || wordList.length === 0) return;

        let randomChar = wordList[Math.floor(Math.random() * wordList.length)];
        
        if (currentLevel === 'hard') {
            targetWord = getCleanFullName(randomChar);
        } else {
            targetWord = getCleanFirstName(randomChar);
        }
        
        // Safety check if target name is empty after cleaning
        if (!targetWord || targetWord.length === 0) {
            startNewGame();
            return;
        }

        wordLength = targetWord.length;
        setupActiveRow();
    }

    function setupActiveRow() {
        $activeRow.empty();
        for (let i = 0; i < wordLength; i++) {
            if (targetWord[i] === '-') {
                // Visual separator for Hard mode spaces
                const $separator = $('<div>', {
                    class: 'wordle-separator',
                    text: '-'
                });
                $activeRow.append($separator);
            } else {
                // Playable input tile
                const $input = $('<input>', {
                    type: 'text',
                    class: 'wordle-tile active-tile reveal-tile',
                    maxlength: 1,
                    css: { 'animation-delay': `${i * 0.15}s` }
                });
                $activeRow.append($input);
            }
        }
        setupInputBehavior();
    }

    function setupInputBehavior() {
        const $tiles = $('.active-tile');
        
        $tiles.on('input', function () {
            const val = $(this).val();
            $(this).val(val.toUpperCase()); 
            
            if (val && /^[A-Za-z]$/.test(val)) {
                // Jump over hyphen separators to the next tile
                const nextTile = $(this).nextAll('.active-tile').first();
                if (nextTile.length) {
                    nextTile.focus();
                }
            } else {
                $(this).val(''); 
            }
        });

        $tiles.on('keydown', function (e) {
            if (e.key === 'Backspace' && $(this).val() === '') {
                // Jump backwards over hyphen separators
                const prevTile = $(this).prevAll('.active-tile').first();
                if (prevTile.length) {
                    prevTile.focus();
                }
            } else if (e.key === 'Enter') {
                $checkBtn.click(); 
            }
        });

        setTimeout(() => {
            $tiles.first().focus();
        }, 100);
    }

    // --- Hint Button Logic ---
    $hintBtn.on('click', function() {
        if (!targetWord) return;

        // Get the target word without hyphens to match the inputs array
        const cleanTarget = targetWord.replace(/-/g, '');
        const $tiles = $('.active-tile');
        
        let firstEmptyIndex = -1;

        // Iterate through input tiles to find the first empty one
        $tiles.each(function(index) {
            if ($(this).val() === '' && firstEmptyIndex === -1) {
                firstEmptyIndex = index;
            }
        });

        // If an empty tile was found, reveal the correct letter for that position
        if (firstEmptyIndex !== -1) {
            const correctLetter = cleanTarget[firstEmptyIndex];
            const $targetTile = $tiles.eq(firstEmptyIndex);

            // Insert the correct letter into the first empty tile
            $targetTile.val(correctLetter);

            // Automatically move focus to the next tile (if available)
            const $nextTile = $targetTile.nextAll('.active-tile').first();
            if ($nextTile.length) {
                $nextTile.focus();
            }

            // Disable the hint button so it can only be used once per game
            $(this).prop('disabled', true);
        } else {
            // If the user already filled all tiles manually
            alert("All tiles are already filled!");
        }
    });

    // --- 5. Game Checking Logic ---
    $checkBtn.on('click', function () {
        if (currentGuessCount >= maxGuesses) return;

        const $tiles = $('.active-tile');
        
        // Validate that all letter inputs are filled
        let filledCount = $tiles.filter(function() { return $(this).val() !== ''; }).length;
        if (filledCount < $tiles.length) {
            alert("Not enough letters!");
            return;
        }

        let userGuess = "";
        let tileIndex = 0;
        
        // Construct guess string, adding hyphens where needed
        for (let i = 0; i < wordLength; i++) {
            if (targetWord[i] === '-') {
                userGuess += '-';
            } else {
                userGuess += $tiles.eq(tileIndex).val();
                tileIndex++;
            }
        }

        let targetLetterArray = targetWord.split('');
        let guessLetterArray = userGuess.split('');
        let tileColors = Array(wordLength).fill('absent'); 

        // First pass: Green (exact match)
        for (let i = 0; i < wordLength; i++) {
            if (targetWord[i] === '-') {
                tileColors[i] = 'separator';
                targetLetterArray[i] = null;
                guessLetterArray[i] = null;
                continue;
            }
            if (guessLetterArray[i] === targetLetterArray[i]) {
                tileColors[i] = 'correct';
                targetLetterArray[i] = null; 
                guessLetterArray[i] = null;  
            }
        }

        // Second pass: Yellow (present in wrong spot)
        for (let i = 0; i < wordLength; i++) {
            if (guessLetterArray[i] !== null && guessLetterArray[i] !== '-') {
                let foundIndex = targetLetterArray.indexOf(guessLetterArray[i]);
                if (foundIndex !== -1) {
                    tileColors[i] = 'present';
                    targetLetterArray[foundIndex] = null; 
                }
            }
        }

        // Add completed guess to history
        const $historyRow = $('<div>', { class: 'wordle-row' });
        
        for (let i = 0; i < wordLength; i++) {
            if (targetWord[i] === '-') {
                $historyRow.append($('<div>', { class: 'wordle-separator', text: '-' }));
            } else {
                $historyRow.append($('<div>', {
                    class: `wordle-tile ${tileColors[i]}`,
                    text: userGuess[i],
                    css: { 'line-height': '56px' } 
                }));
            }
        }

        $historyContainer.append($historyRow);
        currentGuessCount++;

        // Win/Lose check
        if (userGuess === targetWord) {
            $activeRow.empty(); 
            $checkBtn.hide();
            $message.text("Pirate King! You found the character! 👑").show();
        } else if (currentGuessCount >= maxGuesses) {
            $activeRow.empty();
            $checkBtn.hide();
            let answerClean = targetWord.replace(/-/g, ' ');
            $message.text(`Game Over! The character was ${answerClean}`).show();
        } else {
            setupActiveRow();
        }
    });
});