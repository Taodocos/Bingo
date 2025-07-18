import eventlet
eventlet.monkey_patch()

import os
import random
from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit

app = Flask(__name__)
app.config["SECRET_KEY"] = "super_secret_key"
socketio = SocketIO(app, async_mode='eventlet')

game_state = {
    "players": {},
    "started": False,
    "called_numbers": set(),
    "waiting_time": 20,
    "waiting_players": 0,
}


def call_numbers():
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
        if numbers[letter]:
            number = random.choice(numbers[letter])
            called_number = f"{letter}{number}"
            numbers[letter].remove(number)
            game_state["called_numbers"].add(called_number)

            socketio.sleep(5)
            socketio.emit('call_number', {'number': called_number})
            print(f"Called number: {called_number}")


def start_game_if_ready():
    print(f"Waiting players: {game_state['waiting_players']}")
    if game_state["waiting_players"] >= 2:
        game_state["started"] = True
        print("Game is starting...")

        countdown_time = 5
        for i in range(countdown_time, 0, -1):
            socketio.sleep(1)
            socketio.emit("game_starting_soon", i)

        socketio.start_background_task(call_numbers)
        socketio.emit("game_started")
    else:
        socketio.emit("not_enough_players", {"message": "Waiting for more players..."})


@app.route('/')
def index():
    return render_template('lobby.htm')


@app.route('/select')
def card():
    return render_template('first.htm')


@app.route('/bingo')
def bingo():
    return render_template('game.htm')


@socketio.on('player_ready')
def handle_player_ready(data):
    player_id = data['player_id']
    print(f"Player {player_id} is ready.")

    if player_id not in game_state["players"]:
        game_state["waiting_players"] += 1
        game_state["players"][player_id] = data['layout']
        print(f"Current waiting players: {game_state['waiting_players']}")

        socketio.emit('waiting_notification', {
            'message': f'Player {player_id} is ready. Please wait for the game to start.'
        })

        # 🔴 REMOVE Timer
        # ✅ Replace with async background task
        def delayed_start():
            socketio.sleep(game_state["waiting_time"])
            start_game_if_ready()

        socketio.start_background_task(delayed_start)


@socketio.on('select_card')
def handle_select_card(data):
    selected_number = data['selectedNumber']
    layout = data['layout']
    player_id = data['player_id']

    if selected_number in game_state["players"]:
        emit('card_taken', selected_number, to=request.sid)
    else:
        game_state["players"][selected_number] = layout
        emit('update_taken_cards', list(game_state["players"].keys()), broadcast=True)
        emit('card_selected', to=request.sid)


@socketio.on('bingo')
def handle_bingo(data):
    player_id = data['sid']
    game_state["started"] = False
    emit("bingo", {"sid": player_id}, broadcast=True)


@socketio.on('game_finished')
def handle_game_finished():
    game_state["started"] = False
    game_state["waiting_players"] = 0
    game_state["players"].clear()
    socketio.emit('update_lobby_status', {'status': 'inactive'})


if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    socketio.run(app, host="0.0.0.0", port=port)
