// lobb.js

const socket = io();

// Event listener for the refresh button
document.getElementById('refresh-button').addEventListener('click', refreshGameStatus);

// Function to refresh game statuses
function refreshGameStatus() {
    const games = document.querySelectorAll('.game');
    games.forEach(game => {
        const status = game.getAttribute('data-status');
        const button = game.querySelector('.play-button');

        if (status === 'active') {
            game.querySelector('.status').textContent = 'Active Game';
            button.disabled = false;
        } else {
            game.querySelector('.status').textContent = 'Inactive Game';
            button.disabled = true;
        }
    });
}

// Function to redirect to the card selection page
function redirectToCardSelection() {
    window.location.href = '/select'; // Replace with your actual card selection page URL
}

// Attach the redirect function to play buttons dynamically
document.querySelectorAll('.play-button').forEach(button => {
    button.addEventListener('click', (event) => {
        // Check if the button is enabled before redirecting
        if (!button.disabled) {
            redirectToCardSelection();
        }
    });
});

// Listen for updates to lobby status
socket.on("update_lobby_status", ({ status }) => {
    const gameDiv = document.querySelector('.game[data-status="inactive"]');
    if (gameDiv) {
        gameDiv.setAttribute("data-status", status);
        gameDiv.querySelector('.status').textContent = "Active Game";
        gameDiv.querySelector('.play-button').disabled = false;
    }
});