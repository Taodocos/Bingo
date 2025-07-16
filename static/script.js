const socket = io();
let selectedNumber = null;
let userCardLayout = null;
const takenCards = new Set();

function generateUniqueId() {
    return 'player-' + Math.random().toString(36).substr(2, 9);
}

const createNumberGrid = () => {
    const numberGrid = document.getElementById("number-grid");
    numberGrid.innerHTML = ''; // Clear existing numbers
    
    // Create numbers 1-100 in a 10x10 grid (matches the image)
    for (let i = 1; i <= 100; i++) {
        const numberDiv = document.createElement("div");
        numberDiv.className = "number";
        numberDiv.innerText = i;
        numberDiv.onclick = () => selectNumber(i, numberDiv);
        numberGrid.appendChild(numberDiv);
    }
};

const selectNumber = (number, numberDiv) => {
    // Check if card is already taken
    if (takenCards.has(number)) {
        alert("This card is already taken. Please choose another one.");
        return;
    }

    // Clear any prior selected number
    if (selectedNumber !== null) {
        const prevSelected = document.querySelector(".number.selected");
        if (prevSelected) prevSelected.classList.remove("selected");
    }
    
    // Highlight the selected number
    selectedNumber = number;
    numberDiv.classList.add("selected");
    userCardLayout = generateBingoLayout();
    displayUserCard(userCardLayout);
    
    // Update UI to show ready state
    document.getElementById("start-game").style.display = "block";
    document.getElementById("status").textContent = "Ready to start";
    document.getElementById("card-preview").style.display = "block";
};

const displayUserCard = (layout) => {
    const selectedCardContainer = document.getElementById("selected-card");
    selectedCardContainer.innerHTML = ""; 

    // Create BINGO header
    const headerDiv = document.createElement("div");
    headerDiv.className = "card-header";
    ["B", "I", "N", "G", "O"].forEach(letter => {
        const headerCell = document.createElement("div");
        headerCell.className = "card-header-cell";
        headerCell.innerText = letter;
        headerDiv.appendChild(headerCell);
    });
    selectedCardContainer.appendChild(headerDiv);

    // Create card body (5x5 grid)
    const cardDiv = document.createElement("div");
    cardDiv.className = "card-body";
    layout.forEach(row => {
        row.forEach(num => {
            const cell = document.createElement("div");
            cell.className = "card-cell";
            cell.innerText = num === "*" ? "FREE" : num;
            if (num === "*") cell.classList.add("free-space");
            cardDiv.appendChild(cell);
        });
    });
    selectedCardContainer.appendChild(cardDiv);
};

// In script.js
const generateBingoLayout = () => {
    const ranges = {
        B: [1, 15],  // 15 numbers
        I: [16, 30],  // 15 numbers
        N: [31, 45],  // 15 numbers
        G: [46, 60],  // 15 numbers
        O: [61, 75]   // 15 numbers
    };
    
    const layout = [];
    const columns = ["B", "I", "N", "G", "O"];
    
    // Generate numbers for each column
    columns.forEach(col => {
        const [min, max] = ranges[col];
        const columnNumbers = [];
        
        // Get 5 unique numbers for this column
        while (columnNumbers.length < 5) {
            const num = Math.floor(Math.random() * (max - min + 1)) + min;
            if (!columnNumbers.includes(num)) {
                columnNumbers.push(num);
            }
        }
        
        // Sort numbers in ascending order
        columnNumbers.sort((a, b) => a - b);
        
        // Add to layout rows
        columnNumbers.forEach((num, rowIndex) => {
            if (!layout[rowIndex]) layout[rowIndex] = [];
            layout[rowIndex][columns.indexOf(col)] = num;
        });
    });
    
    // Set center space to FREE
    layout[2][2] = "*";
    
    return layout;
};
const getRandomNumbers = (min, max, count) => {
    const nums = [];
    while (nums.length < count) {
        const rand = Math.floor(Math.random() * (max - min + 1)) + min;
        if (!nums.includes(rand)) {
            nums.push(rand);
        }
    }
    return nums;
};

// Refresh button logic
document.getElementById("refresh").onclick = () => {
    selectedNumber = null;
    userCardLayout = null;
    document.querySelectorAll(".number").forEach(num => {
        num.classList.remove("selected");
        num.classList.remove("taken");
    });
    document.getElementById("selected-card").innerHTML = "";
    document.getElementById("start-game").style.display = "none";
    document.getElementById("status").textContent = "Start in waiting";
    document.getElementById("card-preview").style.display = "none";
};

// Start game button logic
document.getElementById("start-game").onclick = () => {
    let playerId = localStorage.getItem("userId");
    if (!playerId) {
        playerId = generateUniqueId();
        localStorage.setItem("userId", playerId);
    }

    if (!userCardLayout) {
        alert("Please select a card first!");
        return;
    }

    if (takenCards.has(selectedNumber)) {
        alert("This card is already taken. Please choose another one.");
        return;
    }

    // ✅ Save to localStorage for game.js
    localStorage.setItem("selectedNumber", selectedNumber);
    localStorage.setItem("userCardLayout", JSON.stringify(userCardLayout));

    socket.emit("select_card", { 
        selectedNumber, 
        layout: userCardLayout, 
        player_id: playerId
    });
};

// Socket listeners
socket.on("card_selected", () => {
    window.location.href = '/bingo';
});

socket.on("update_taken_cards", (updatedTakenCards) => {
    takenCards.clear();
    updatedTakenCards.forEach(card => {
        takenCards.add(card);
        const numberDivs = document.querySelectorAll(".number");
        numberDivs.forEach(numDiv => {
            if (parseInt(numDiv.innerText) === parseInt(card)) {
                numDiv.classList.add("taken");
            }
        });
    });
});

socket.on("card_taken", (card) => {
    alert(`Card ${card} is already taken. Please choose another one.`);
    selectedNumber = null;
    const prevSelected = document.querySelector(".number.selected");
    if (prevSelected) prevSelected.classList.remove("selected");
    document.getElementById("start-game").style.display = "none";
    document.getElementById("status").textContent = "Start in waiting";
    document.getElementById("card-preview").style.display = "none";
});

// Initialize the game
createNumberGrid();