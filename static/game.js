const socket = io();

// Get the stored layout from localStorage
const selectedNumber = localStorage.getItem("selectedNumber");
const userCardLayout = JSON.parse(localStorage.getItem("userCardLayout"));
const boardNumber = selectedNumber || "roman";

// Elements
const userCardContainer = document.getElementById("user-card");
const currentCallLetterDisplay = document.getElementById("current-call-letter");
const currentCallNumberDisplay = document.getElementById("current-call-number");
const boardNumberDisplay = document.getElementById("board-number");
const gameOverContainer = document.getElementById("game-over-container");
const countdownDisplay = document.getElementById("countdown");

// Track marked numbers and called numbers
const markedNumbers = new Set();
const calledNumbers = new Set();
generateLeftSideGrid();

// Audio setup
const clickSound = new Audio("/static/sounds/click.mp3");
const winSound = new Audio("/static/sounds/win.mp3");

// Preload audio
clickSound.load();
winSound.load();
let gameOver = false;

function generateLeftSideGrid() {
    const calledNumbersGrid = document.getElementById("called-numbers-grid");
    calledNumbersGrid.innerHTML = '';

    const ranges = {
        B: { min: 1, max: 15 },
        I: { min: 16, max: 30 },
        N: { min: 31, max: 45 },
        G: { min: 46, max: 60 },
        O: { min: 61, max: 75 }
    };

    Object.keys(ranges).forEach(letter => {
        const column = document.createElement("div");
        column.className = "bingo-left-column";

        for (let i = ranges[letter].min; i <= ranges[letter].max; i++) {
            const numElement = document.createElement("div");
            numElement.className = "bingo-left-number";
            numElement.textContent = i;
            numElement.id = `num-${letter}-${i}`;
            column.appendChild(numElement);
        }

        calledNumbersGrid.appendChild(column);
    });
}

// Build User Bingo Card
function buildUserCard(layout) {
    userCardContainer.innerHTML = '';

    const headerRow = document.createElement("div");
    headerRow.className = "bingo-row header-row";
    ["B", "I", "N", "G", "O"].forEach(letter => {
        const headerCell = document.createElement("div");
        headerCell.className = "bingo-header-cell";
        headerCell.textContent = letter;
        headerRow.appendChild(headerCell);
    });
    userCardContainer.appendChild(headerRow);

    layout.forEach((row) => {
        const rowDiv = document.createElement("div");
        rowDiv.className = "bingo-row";

        row.forEach((num) => {
            const cell = document.createElement("div");
            cell.className = "bingo-cell";
            cell.textContent = num === "*" ? "FREE" : num;

            cell.addEventListener("click", () => toggleMarkNumber(cell, num));
            rowDiv.appendChild(cell);
        });

        userCardContainer.appendChild(rowDiv);
    });

    boardNumberDisplay.textContent = `Board No. ${boardNumber}`;
}

// Toggle number marking
function toggleMarkNumber(cell, number) {
    if (gameOver || number === "*") return;

    const numberStr = number.toString();
    if (calledNumbers.has(numberStr)) {
        if (markedNumbers.has(numberStr)) {
            cell.classList.remove("marked");
            markedNumbers.delete(numberStr);
        } else {
            cell.classList.add("marked");
            markedNumbers.add(numberStr);
        }
    } else {
        alert("This number has not been called yet!");
    }
}

// Check for a win
function checkForWin() {
    const winningCombinations = getWinningCombinations();

    for (const combination of winningCombinations) {
        const isWinning = combination.every(num =>
            num === "FREE" || markedNumbers.has(num.toString())
        );

        if (isWinning) {
            // Notify server and trigger win
            socket.emit("bingo", { sid: localStorage.getItem("userId") });
            return;
        }
    }

    alert("No winning pattern found. Keep marking!");
}


// Show game over UI
function showGameOver() {
    userCardContainer.style.display = 'none';
    currentCallLetterDisplay.style.display = 'none';
    currentCallNumberDisplay.style.display = 'none';
    boardNumberDisplay.style.display = 'none';
    gameOverContainer.style.display = 'block';
    document.querySelector(".controls").style.display = 'none';
}

// Get winning combinations
function getWinningCombinations() {
    const rows = [];
    const columns = [[], [], [], [], []];
    const diagonals = [[], []];

    const rowElements = Array.from(userCardContainer.querySelectorAll('.bingo-row'));
    const numberRows = rowElements.slice(1);

    numberRows.forEach((rowDiv, rowIndex) => {
        const row = [];
        const cells = rowDiv.querySelectorAll('.bingo-cell');

        cells.forEach((cell, colIndex) => {
            const value = cell.textContent === "FREE" ? "FREE" : cell.textContent;
            row.push(value);
            columns[colIndex].push(value);
            if (rowIndex === colIndex) diagonals[0].push(value);
            if (rowIndex + colIndex === 4) diagonals[1].push(value);
        });

        rows.push(row);
    });

    return [...rows, ...columns, ...diagonals];
}
// Check button
document.getElementById("check-btn").addEventListener("click", () => {
    console.log("Check button clicked");
    checkForWin();
});


// Ready button
document.getElementById("ready-btn").addEventListener("click", () => {
    const playerId = localStorage.getItem("userId");
    if (!playerId) {
        alert("Player ID is missing! Please refresh the page.");
        return;
    }

    if (!userCardLayout) {
        alert("User card layout is not defined!");
        return;
    }

    socket.emit("player_ready", {
        player_id: playerId,
        layout: userCardLayout
    });
});

// Countdown handling
socket.on("game_starting_soon", (time) => {
    countdownDisplay.style.display = 'block';
    let countdown = time;

    const countdownInterval = setInterval(() => {
        countdownDisplay.textContent = `Game starts in: ${countdown} seconds`;
        countdown--;

        if (countdown < 0) {
            clearInterval(countdownInterval);
            countdownDisplay.style.display = 'none'; // Hide countdown when done
        }
    }, 1000);
});

// On game start
socket.on("game_started", () => {
    alert("The game has started! Numbers will be called.");
    document.getElementById("ready-btn").disabled = true;
    countdownDisplay.style.display = 'none'; // Hide countdown when game starts
});

// Handle called number
socket.on("call_number", (data) => {
    const calledFull = data.number.toString();   // e.g. "N45"
    const calledLetter = calledFull.charAt(0);   // "N"
    const calledDigit = calledFull.slice(1);     // "45"

    const utterance = new SpeechSynthesisUtterance(`Number called: ${calledFull}`);

    // Update UI when the voice starts
    utterance.onstart = () => {
        currentCallLetterDisplay.textContent = calledLetter;
        currentCallNumberDisplay.textContent = calledDigit;

        // Highlight the number in the left-side grid
        const calledCell = document.getElementById(`num-${calledLetter}-${calledDigit}`);
        if (calledCell) {
            calledCell.classList.add("called");
        }
    };

    // Store the number after voice ends
    utterance.onend = () => {
        calledNumbers.add(calledDigit);
    };

    speechSynthesis.speak(utterance);
});


socket.on("bingo_accepted", ({ message }) => {
    alert(message);
    gameOver = true;
    winSound.play();
    speechSynthesis.cancel();
    showGameOver();
});


// Speak number
// function speakNumber(text) {
//     const utterance = new SpeechSynthesisUtterance(`Number called: ${text}`);
//     speechSynthesis.speak(utterance);
// }

// Notify players to wait
socket.on("waiting_notification", (data) => {
    alert(data.message);
});

// Bingo notification
socket.on("bingo", ({ sid }) => {
    winSound.play();
    gameOver = true;

    if (sid === localStorage.getItem("userId")) {
        alert("🎉 Congratulations! You’ve won!");
    } else {
        alert(`Player with ID ${sid} has won the game!`);
    }
    speechSynthesis.cancel();
    showGameOver();

});


// Initialize
if (userCardLayout) {
    buildUserCard(userCardLayout);
}