from flask import Flask, render_template
from flask_socketio import SocketIO, emit
import sqlite3
from datetime import datetime

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, cors_allowed_origins="*")

DB_PATH = 'chat.db'
online_users = {}  # Храним подключенных пользователей: {sid: username}

# Инициализация базы данных
def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL,
                text TEXT NOT NULL,
                time TEXT NOT NULL
            )
        ''')

@app.route('/')
def index():
    return render_template('index.html')

# --- WebSocket События ---

@socketio.on('join')
def on_join(data):
    username = data['username']
    online_users[data['sid']] = username
    
    # Отправляем историю сообщений новому пользователю
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.execute('SELECT username, text, time FROM messages ORDER BY id ASC LIMIT 50')
        history = [{'username': row[0], 'text': row[1], 'time': row[2]} for row in cursor.fetchall()]
    emit('load_history', history, to=data['sid'])
    
    # Обновляем список онлайн у всех
    socketio.emit('update_users', list(online_users.values()))

@socketio.on('disconnect')
def on_disconnect():
    from flask import request
    sid = request.sid
    if sid in online_users:
        del online_users[sid]
        socketio.emit('update_users', list(online_users.values()))

@socketio.on('message')
def handle_message(data):
    username = data['username']
    text = data['text']
    time = datetime.now().strftime("%H:%M")
    
    # Сохраняем в БД
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute('INSERT INTO messages (username, text, time) VALUES (?, ?, ?)', (username, text, time))
    
    # Рассылаем всем
    socketio.emit('new_message', {'username': username, 'text': text, 'time': time})

if __name__ == '__main__':
    init_db()
    socketio.run(app, debug=True, port=5000)