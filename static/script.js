// Подключение к серверу через WebSocket (Socket.IO)
const socket = io();

// Элементы DOM
const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username-input');
const messagesContainer = document.getElementById('messages-container');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const usersList = document.getElementById('users-list');
const usersCount = document.getElementById('users-count');

let currentUser = "";

// --- Вход в чат ---
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    currentUser = usernameInput.value.trim();
    
    if (currentUser) {
        // Скрываем экран входа, показываем чат
        loginScreen.classList.remove('active');
        chatScreen.classList.add('active');
        
        // Отправляем событие на сервер
        socket.emit('join', { username: currentUser, sid: socket.id });
        
        // Фокус на поле ввода сообщения
        messageInput.focus();
    }
});

// --- Отправка сообщения ---
messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    
    if (text) {
        socket.emit('message', { username: currentUser, text: text });
        messageInput.value = ''; // Очищаем поле
    }
});

// --- Получение сообщений ---

// 1. Загрузка истории при входе
socket.on('load_history', (history) => {
    messagesContainer.innerHTML = ''; // Очищаем контейнер
    history.forEach(msg => renderMessage(msg));
    scrollToBottom();
});

// 2. Получение нового сообщения в реальном времени
socket.on('new_message', (msg) => {
    renderMessage(msg);
    scrollToBottom();
});

// 3. Обновление списка онлайн-пользователей
socket.on('update_users', (users) => {
    usersList.innerHTML = '';
    usersCount.textContent = users.length;
    
    // Делаем список уникальным (если один юзер с двух вкладок)
    const uniqueUsers = [...new Set(users)];
    
    uniqueUsers.forEach(user => {
        const li = document.createElement('li');
        li.textContent = user;
        usersList.appendChild(li);
    });
});

// --- Вспомогательные функции ---

function renderMessage(msg) {
    const isMyMessage = msg.username === currentUser;
    
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message');
    if (isMyMessage) msgDiv.classList.add('my-message');
    
    msgDiv.innerHTML = `
        <div class="msg-header">
            <span class="msg-author">${msg.username}</span>
            <span class="msg-time">${msg.time}</span>
        </div>
        <div class="msg-text"></div>
    `;
    
    // Защита от XSS (чтобы нельзя было внедрить HTML-теги в сообщение)
    msgDiv.querySelector('.msg-text').textContent = msg.text;
    
    messagesContainer.appendChild(msgDiv);
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}