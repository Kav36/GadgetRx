 function setAppointments_shop(username) {
  fetch(`http://localhost:3000/set_appointments_shop?username=${username}`)
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        console.error("Error:", data.error);
        return;
      }

      const appointmentList = document.getElementById("appointment-list");
      appointmentList.innerHTML = ""; 

      if (data.data && data.data.length > 0) {
        data.data.forEach(appointment => {
          const appointmentItem = document.createElement("div");
          appointmentItem.classList.add("list-group-item");
          appointmentItem.innerHTML = `
            <h6 class="mb-1">${appointment.username}</h6>
            <p class="mb-1">${new Date(appointment.date_time).toLocaleString()}</p>
            <small>${appointment.description}</small>
           
          `;
         
          appointmentList.appendChild(appointmentItem);
        });
      } else {
        appointmentList.innerHTML = "No upcoming appointments.";
      }
    })
    .catch(error => console.error("Error fetching appointments:", error));
}

function setChatHeads(username) {
  fetch(`http://localhost:3000/get_chat_heads_shop?username=${username}`)
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        console.error("Error:", data.error);
        return;
      }

      const chatContainer = document.getElementById("chat-container");
      chatContainer.innerHTML = ""; 

      if (data.chatHeads && data.chatHeads.length > 0) {
        data.chatHeads.forEach(chatHead => {
          const chatHeadDiv = document.createElement("div");
          chatHeadDiv.classList.add("chat-head");
          chatHeadDiv.innerHTML = `<p><strong>${chatHead.name1}</strong></p>`;
          chatHeadDiv.onclick = () => showChatDetails(chatHead.username1); // Use username1 here
          chatContainer.appendChild(chatHeadDiv);
        });
      } else {
        chatContainer.innerHTML = "No chat heads found.";
      }
    })
    .catch(error => console.error("Error fetching chat heads:", error));
}
function setShopdata_dash_shop(userId) {
  fetch(`http://localhost:3000/setShopdata_dash_shop?user_id=${userId}`)
    .then((response) => response.json())
    .then((data) => {
      if (data.error) {
        console.error("Error:", data.error);
        return;
      }

      const shopList = document.getElementById("staff-list");
      shopList.innerHTML = ""; 

      if (data.data && data.data.length > 0) {
        data.data.forEach(shopData => {
          const shopItem = document.createElement("div");
          shopItem.classList.add("staff-item");
          shopItem.innerHTML = `
            <span>${shopData.name}</span> 
            <span class="badge badge-secondary">${shopData.tech_qul}</span>
            <button class="delete-btn" onclick="removeStaffItem('${shopData.tech_username}', this)">Remove</button>
          `;
          shopList.appendChild(shopItem);
        });
      } else {
        shopList.innerHTML = "No technician found, please Add";
      }
    })
    .catch((error) => console.error("Error fetching shop data:", error));
}

function removeStaffItem(tech_username, button) {
  fetch(`http://localhost:3000/deleteStaffItem?tech_username=${tech_username}`, {
    method: 'DELETE'
  })
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        console.error("Error:", data.error);
        return;
      }

      const staffItem = button.parentElement;
      staffItem.remove();
      console.log(data.message);
    })
    .catch(error => console.error("Error deleting staff item:", error));
}

function showChatDetails(shopName) {
  window.location.href = "chat.html?shop=" + encodeURIComponent(shopName);
}

function showShopDetails(shopName) {
  window.location.href = 'shop.html?shop=' + encodeURIComponent(shopName);
}
function searchShop(search) {
  window.location.href = 'search_shop.html?search=' + encodeURIComponent(search);
}
