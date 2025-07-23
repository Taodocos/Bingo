const socket = io();

document.getElementById('refresh-button').addEventListener('click', refreshGameStatus);

function refreshGameStatus() {
    const games = document.querySelectorAll('.game');
    games.forEach(game => {
        const status = game.getAttribute('data-status');
        const button = game.querySelector('.play-button');
        const statusText = game.querySelector('.status');

        if (status === 'active') {
            statusText.textContent = 'Active Game';
            statusText.className = 'status text-green-400 font-semibold';
            button.disabled = false;
            button.className = 'play-button bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600';
        } else {
            statusText.textContent = 'Low balance';
            statusText.className = 'status text-red-400 font-semibold';
            button.disabled = true;
            button.className = 'play-button bg-gray-400 text-white px-4 py-1 rounded cursor-not-allowed';
        }
    });
}

// Function to redirect to the card selection page
function redirectToCardSelection() {
    window.location.href = '/select';
}

// Attach the redirect function to play buttons dynamically
document.querySelectorAll('.play-button').forEach(button => {
    button.addEventListener('click', (event) => {
        if (!button.disabled) {
            redirectToCardSelection();
        }
    });
});

// Listen for updates to lobby status
socket.on("update_lobby_status", ({ status }) => {
    const inactiveGames = document.querySelectorAll('.game[data-status="inactive"]');
    inactiveGames.forEach(gameDiv => {
        gameDiv.setAttribute("data-status", status);
        const statusText = gameDiv.querySelector('.status');
        statusText.textContent = "Active Game";
        statusText.className = 'status text-green-400 font-semibold';

        const button = gameDiv.querySelector('.play-button');
        button.disabled = false;
        button.className = 'play-button bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600';
    });
});
