import random
import time
from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit
from threading import Thread, Timer

app = Flask(__name__)
app.config["SECRET_KEY"] = "super_secret_key"
socketio = SocketIO(app)

# Initialize game state
game_state = {
    "players": {},  # Track players and their selected cards
    "started": False,
    "called_numbers": set(),
    "waiting_time": 20,  # Waiting time in seconds
    "waiting_players": 0,  # Count of players who are ready
}

def call_numbers():
    """Continuously call numbers and emit to clients."""
    letters = ['B', 'I', 'N', 'G', 'O']
    numbers = {
        'B': list(range(1, 16)),
        'I': list(range(16, 31)),
        'N': list(range(31, 46)),
        'G': list(range(46, 61)),
        'O': list(range(61, 76))
    }

    while game_state["started"]:
        letter = random.choice(letters)
        if numbers[letter]:  # Check if there are numbers left to call
            number = random.choice(numbers[letter])
            called_number = f"{letter}{number}"
            numbers[letter].remove(number)
            game_state["called_numbers"].add(called_number)

            # Delay before emitting the number
            time.sleep(5)  # Adjust this delay as needed
            
            socketio.emit('call_number', {'number': called_number})  # Emit the called number
            print(f"Called number: {called_number}")  # Debugging line
def start_game_if_ready():
    """Start the game if there are at least 2 players ready after the waiting time."""
    print(f"Waiting players: {game_state['waiting_players']}")  # Log number of waiting players
    
    if game_state["waiting_players"] >= 2:
        game_state["started"] = True
        print("Game is starting...")  # Log when the game starts
        
        # Notify players about the countdown
        countdown_time = 5  # Set the countdown time (in seconds)
        for i in range(countdown_time, 0, -1):
            socketio.sleep(1)  # Delay for 1 second
            socketio.emit("game_starting_soon", i)  # No broadcast argument needed
        
        # Start calling numbers
        thread = Thread(target=call_numbers)
        thread.start()
        socketio.emit("game_started")  # No broadcast argument needed
    else:
        socketio.emit("not_enough_players", {"message": "Waiting for more players..."})

@app.route('/')
def index():
    return render_template('lobby.htm')  # Your lobby page

@app.route('/select')
def card():
    return render_template('first.htm')  # Your card selection page

@app.route('/bingo')
def bingo():
    return render_template('game.htm')  # Your bingo game page

@socketio.on('player_ready')
def handle_player_ready(data):
    player_id = data['player_id']
    print(f"Player {player_id} is ready.")  # Log when a player is ready

    if player_id not in game_state["players"]:
        game_state["waiting_players"] += 1
        game_state["players"][player_id] = data['layout']  # Store player's card layout
        print(f"Current waiting players: {game_state['waiting_players']}")  # Log current players

        # Emit waiting notification
        print(f"Emitting waiting_notification for player {player_id}.")
        socketio.emit('waiting_notification', {
            'message': f'Player {player_id} is ready. Please wait for the game to start.'
        }, to='*')  # Send to all connected clients

        # Start the timer to check if the game can start
        Timer(game_state["waiting_time"], start_game_if_ready).start()
        print("Timer started for checking if the game can start.")

@socketio.on('select_card')
def handle_select_card(data):
    selected_number = data['selectedNumber']
    layout = data['layout']
    player_id = data['player_id']
    
    # Emit to the specific player who selected the card
    if selected_number in game_state["players"]:
        emit('card_taken', selected_number, to=request.sid)  # If using request
    else:
        # Add player and their card to the game state
        game_state["players"][selected_number] = layout
        
        # Broadcast the updated list of taken cards to all clients
        emit('update_taken_cards', list(game_state["players"].keys()), broadcast=True)

        # Emit to the specific player that their card was successfully selected
        emit('card_selected', to=request.sid)  # Use `sid` from the event




@socketio.on('bingo')
def handle_bingo(data):
    player_id = data['sid']
    
    # Stop the game
    game_state["started"] = False
    
    emit("bingo", {"sid": player_id}, broadcast=True)



# @socketio.on('bingo')
# def handle_bingo(data):
#     player_id = data['sid']
#     # Logic to check if the player has won can be added here
#     emit("bingo_accepted", {"message": f"Player {player_id} has called Bingo!"}, broadcast=True)

@socketio.on('game_finished')
def handle_game_finished():
    # Update the game state
    game_state["started"] = False
    game_state["waiting_players"] = 0  # Reset waiting players
    game_state["players"].clear()  # Clear players for the new game

    # Emit event to update lobby status
    socketio.emit('update_lobby_status', {'status': 'inactive'})

if __name__ == '__main__':
    socketio.run(app, debug=True)