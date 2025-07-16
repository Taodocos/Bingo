const socket = io();
const clickSound = new Audio("/static/sounds/call.mp3");
const winSound = new Audio("/static/sounds/win.mp3");

// Preload audio files
clickSound.load();
winSound.load();

// Error handling for audio loading
clickSound.onerror = () => console.error("Error loading click sound.");
winSound.onerror = () => console.error("Error loading win sound.");

// Prompt for user name
const user_name = prompt("Enter your name:", "Guest") || "Guest";
socket.emit("join", { username: user_name });

let userMarked = [];
let calledNumbers = new Set(); // To  track called numbers
let userCard; // To store the user's Bingo card
let isGameActive = true; // Flag to check if the game is active

// Create a grid of numbers from 1 to 75
const createNumberGrid = () => {
    console.log("Creating number grid...");
    const numberGrid = document.getElementById("number-grid");
    for (let i = 1; i <= 75; i++) {
        const numberDiv = document.createElement("div");
        numberDiv.className = "number";
        numberDiv.innerText = i;
        numberDiv.onclick = () => selectNumber(i, numberDiv);
        numberGrid.appendChild(numberDiv);
    }
    console.log("Number grid created.");
};

// Handle receiving card data
socket.on("card_data", (data) => {
    userCard = data.card; // Store the user's Bingo card
    createCard(userCard); // Create the Bingo card in the DOM
});

// Handle user joining
socket.on("user_joined", (data) => {
    alert(`${data.username} joined the game!`);
});

// Handle called number
socket.on("call_number", (data) => {
    if (!isGameActive) return; // Stop calling numbers if the game is not active
    const calledNumber = data.number;
    calledNumbers.add(calledNumber); // Add to called numbers
    clickSound.play();
    document.getElementById("call-number").innerText = `🎤 Number called: ${calledNumber}`;
    speakNumber(calledNumber);
});

// Speak the called number
function speakNumber(number) {
    const utterance = new SpeechSynthesisUtterance(`Number called: ${number}`);
    speechSynthesis.speak(utterance);
}

// Handle marking updates
socket.on("mark_update", (data) => {
    if (data.win) {
        winSound.play();
        alert(`🎉 ${data.username} wins the Bingo! 🎉`);
        isGameActive = false; // Stop the game
        socket.emit("stop_calling"); // Notify server to stop calling numbers
    }
});

// Announce win
socket.on("win_announcement", (data) => {
    winSound.play();
    alert(`🎉 ${data.username} wins the Bingo! 🎉`);
    isGameActive = false; // Stop the game
});

// Handle user leaving
socket.on("user_left", (data) => {
    alert(`${data.username} left the game!`);
});

// Handle game end
socket.on("game_end", () => {
    alert("All numbers have been called. Game over!");
});

// Create Bingo card in the DOM
function createCard(card) {
    const table = document.getElementById("card");
    table.innerHTML = ""; // Clear existing
    card.forEach(row => {
        const tr = document.createElement("tr");
        row.forEach(num => {
            const td = document.createElement("td");
            td.innerText = num === "FREE" ? "FREE" : num;
            td.dataset.number = num;
            td.className = "card-cell";
            td.addEventListener("click", (event) => clickNumber(event)); // Allow marking only by users
            tr.appendChild(td);
        });
        table.appendChild(tr);
    });
}

// Handle number click
function clickNumber(event) {
    const num = parseInt(event.target.dataset.number);
    
    // Allow marking only if the number has been called
    if (!userMarked.includes(num)) {
        if (!calledNumbers.has(num)) { // Check if the number is called
            alert("You can only mark called numbers!");
            return; // Prevent marking
        }
        userMarked.push(num);
        event.target.classList.add("marked"); // Visually mark the cell
        socket.emit("mark", { number: num }); // Notify server of the marked number
    } else {
        alert("You have already marked this number!");
    }
}

// Button handler for "I'm Ready"
document.getElementById("ready").addEventListener("click", () => {
    socket.emit("ready");
    alert("✅ You're ready! The numbers will be called automatically every 5 seconds.");
});

// Create a button for user to check for win
const checkWinButton = document.createElement('button');
checkWinButton.innerText = "Check Win";
document.body.appendChild(checkWinButton);

// Handle win checking
checkWinButton.addEventListener("click", () => {
    const hasWon = isWinner(userCard, userMarked); // Check win condition
    if (hasWon) {
        alert("🎉 You win the Bingo! 🎉");
        socket.emit("win"); // Notify server if needed
        isGameActive = false; // Stop the game
        socket.emit("stop_calling"); // Notify server to stop calling numbers
        showPlayAgainButton(); // Show play again button
    } else {
        alert("No Bingo yet! Keep playing.");
    }
});

// Function to show the play again button
function showPlayAgainButton() {
    const playAgainButton = document.createElement('button');
    playAgainButton.innerText = "Play Again";
    document.body.appendChild(playAgainButton);
    
    playAgainButton.addEventListener("click", () => {
        resetGame(); // Reset the game state
        socket.emit("request_new_card"); // Request a new Bingo card from the server
        document.body.removeChild(playAgainButton); // Remove the play again button
    });
}

// Function to reset the game state
function resetGame() {
    userMarked = []; // Clear marked numbers
    calledNumbers.clear(); // Clear called numbers
    isGameActive = true; // Reset game active state
    document.getElementById("call-number").innerText = ""; // Clear displayed called number
    createCard([]); // Clear the displayed card
}

// Function to check for a win
function isWinner(card, marked) {
    // Check rows for winning condition
    for (let row of card) {
        if (row.every(num => marked.includes(num) || num === "FREE")) {
            return true; // Winning row found
        }
    }
    
    // Check columns for winning condition
    for (let col = 0; col < card[0].length; col++) {
        if (card.every(row => marked.includes(row[col]) || row[col] === "FREE")) {
            return true; // Winning column found
        }
    }
    
    // Check main diagonal (top-left to bottom-right)
    if (card.every((row, index) => marked.includes(row[index]) || row[index] === "FREE")) {
        return true; // Winning diagonal found
    }
    
    // Check anti-diagonal (top-right to bottom-left)
    if (card.every((row, index) => marked.includes(row[card.length - 1 - index]) || row[card.length - 1 - index] === "FREE")) {
        return true; // Winning diagonal found
    }
    
    return false; // No win found
}

// Handle any invalid marks from the server (if necessary)
socket.on("invalid_mark", (data) => {
    alert(data.message);
});

// Initialize number grid on page load
createNumberGrid();