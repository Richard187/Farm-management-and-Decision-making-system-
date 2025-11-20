document.addEventListener('DOMContentLoaded', () => {
    const chatbotToggle = document.querySelector('.chatbot-toggle');
    const chatbotContainer = document.querySelector('.chatbot-container');
    const chatbotClose = document.querySelector('.chatbot-close');
    const chatbotInput = document.querySelector('.chatbot-input input');
    const chatbotSend = document.querySelector('.chatbot-input button');
    const chatbotMessages = document.querySelector('.chatbot-messages');

    const openChat = () => {
        chatbotContainer.style.display = 'flex';
        chatbotToggle.style.display = 'none';
        chatbotInput.focus();
        if (!chatbotMessages.dataset.greeted) {
            addMessage('Hi, I’m AgriBot. I provide AI-powered guidance for crops, animals, fields, and tasks. Try a suggestion below to begin.', 'bot');
            chatbotMessages.dataset.greeted = 'true';
        }
    };

    const closeChat = () => {
        chatbotContainer.style.display = 'none';
        chatbotToggle.style.display = 'block';
    };

    chatbotToggle.addEventListener('click', openChat);
    if (chatbotClose) chatbotClose.addEventListener('click', closeChat);

    const addMessage = (message, sender) => {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', `${sender}-message`);
        messageElement.textContent = message;
        chatbotMessages.appendChild(messageElement);
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    };

    const getChatEndpoint = () => {
        try {
            const origin = window.location.origin;
            if (origin && origin.startsWith('http')) {
                // If served from http(s), try same-origin /api/chat first
                return origin + '/api/chat';
            }
        } catch (e) {}
        // Fallback for file:// or unknown environments
        return 'http://localhost:4000/api/chat';
    };

    const handleUserInput = async () => {
        const message = chatbotInput.value.trim();
        if (message) {
            addMessage(message, 'user');
            chatbotInput.value = '';

            // typing indicator
            const typing = document.createElement('div');
            typing.classList.add('message', 'bot-message');
            typing.textContent = 'Thinking…';
            chatbotMessages.appendChild(typing);
            chatbotMessages.scrollTop = chatbotMessages.scrollHeight;

            try {
                const response = await fetch(getChatEndpoint(), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ message })
                });

                const data = await response.json();
                typing.remove();
                addMessage(data.reply, 'bot');
            } catch (error) {
                console.error('Error communicating with chatbot server:', error);
                typing.remove();
                addMessage('Sorry, I am having trouble connecting. Ensure the backend is running on http://localhost:4000 and try again.', 'bot');
            }
        }
    };

    chatbotSend.addEventListener('click', handleUserInput);
    chatbotInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleUserInput();
        }
    });

    // Do not open by default; user clicks the toggle to open

    // Suggestion chips
    document.querySelectorAll('.suggestion-chip').forEach((chip) => {
        chip.addEventListener('click', () => {
            const msg = chip.getAttribute('data-msg') || chip.textContent;
            chatbotInput.value = msg;
            handleUserInput();
        });
    });

    // Close on ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && chatbotContainer.style.display !== 'none') {
            closeChat();
        }
    });
});