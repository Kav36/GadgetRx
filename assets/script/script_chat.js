document.addEventListener('DOMContentLoaded', function() {
  const pusher = new Pusher('a2f11745d379fc8f0ecd', {
      cluster: 'ap2'
  });

  const channel = pusher.subscribe('chat');
  channel.bind('message', function(data) {
      if ((data.sender === currentSender && data.receiver === currentReceiver) || 
          (data.sender === currentReceiver && data.receiver === currentSender)) {
          addMessageToList(data.id, data.sender, data.message, data.attachment);
      }
  });

  channel.bind('delete-message', function(data) {
      const messageElement = document.getElementById(`message-${data.id}`);
      if (messageElement) {
          messageElement.remove();
      }
  });

  document.getElementById('chat-form').addEventListener('submit', function(e) {
      e.preventDefault();
      currentSender = document.getElementById('sender').value;
      currentReceiver = document.getElementById('receiver').value;
      const message = document.getElementById('message').value;
      const attachment = document.getElementById('attachment').files[0];
      const formData = new FormData();
      formData.append('sender', currentSender);
      formData.append('receiver', currentReceiver);
      formData.append('message', message);
      formData.append('attachment', attachment);

      fetch('http://localhost:3000/messages', {
          method: 'POST',
          body: formData
      })
      .then(response => response.json())
      .then(data => {
          document.getElementById('message').value = '';
          document.getElementById('attachment').value = '';
      })
      .catch(error => console.error('Error:', error));
  });

  fetch('/getusername')
      .then(response => response.json())
      .then(data => {
          console.log(data);
          document.getElementById('sender').value = data.username;
          loadMessages();
      })
      .catch(error => console.error('Error fetching sender:', error));

  const receiver = new URLSearchParams(window.location.search).get("shop");
  console.log(receiver);
  if (receiver) {
      document.getElementById("receiver").value = receiver;
      loadMessages();
  }

  function loadMessages() {
      currentSender = document.getElementById('sender').value;
      currentReceiver = document.getElementById('receiver').value;
      fetch(`http://localhost:3000/messages?sender=${currentSender}&receiver=${currentReceiver}`)
          .then(response => response.json())
          .then(messages => {
              const messagesList = document.getElementById('messages');
              messagesList.innerHTML = '';
              messages.forEach(message => {
                  addMessageToList(message.id, message.sender, message.message, message.attachment);
              });
          })
          .catch(error => console.error('Error loading messages:', error));
  }

  function addMessageToList(id, sender, message, attachment) {
      const li = document.createElement('li');
      li.classList.add('list-group-item', 'message-item');
      li.id = `message-${id}`;
      if (sender === currentSender) {
          li.classList.add('message-sender');
      } else {
          li.classList.add('message-receiver');
      }
      const usernameDiv = document.createElement('div');
      usernameDiv.classList.add('message-username');
      usernameDiv.innerText = sender;
      const messageDiv = document.createElement('div');
      messageDiv.classList.add('message-text');
      messageDiv.innerText = message;
      li.appendChild(usernameDiv);
      li.appendChild(messageDiv);

      if (attachment) {
          const attachmentLink = document.createElement('a');
          attachmentLink.classList.add('attachment-link');
          attachmentLink.setAttribute('href', attachment);
          attachmentLink.setAttribute('target', '_blank');
          attachmentLink.innerText = 'Attachment';
          li.appendChild(attachmentLink);
      }

      if (sender === currentSender) {
          const deleteBtn = document.createElement('button');
          deleteBtn.classList.add('btn', 'btn-danger', 'btn-sm', 'delete-btn');
          deleteBtn.innerText = 'Delete';
          deleteBtn.onclick = () => deleteMessage(id);
          li.appendChild(deleteBtn);
      }

      document.getElementById('messages').appendChild(li);
  }

  function deleteMessage(id) {
      fetch(`http://localhost:3000/messages/${id}`, {
          method: 'DELETE'
      })
      .then(response => response.text())  // Change from .json() to .text()
      .then(text => {
          if (text === 'OK') {
              const messageElement = document.getElementById(`message-${id}`);
              if (messageElement) {
                  messageElement.remove();
              }
          }
      })
      .catch(error => console.error('Error:', error));
  }
});