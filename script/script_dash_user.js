function setShopdata_dash(userId) {
  fetch(`http://localhost:3000/setShopdata_dash?user_id=${userId}`)
    .then((response) => response.json())
    .then((data) => {
      if (data.error) {
        console.error("Error:", data.error);
        return;
      }

      const shopList = document.getElementById("shop-list");
      shopList.innerHTML = ""; 

      if (data.data && data.data.length > 0) {
        data.data.forEach(shopData => {
          const shopItem = document.createElement("div");
          shopItem.classList.add("shop-item");
          shopItem.innerHTML = `
            <span>${shopData.name}</span> <span class="badge badge-secondary">${shopData.tech_qul}</span>
          `;
          shopItem.onclick = () => showShopDetails(shopData.shop_username);
          shopList.appendChild(shopItem);
        });
      } else {
        shopList.innerHTML = "No shop found, please sign up";
      }
    })
    .catch((error) => console.error("Error fetching shop data:", error));
} 
function setAppointments(username) {
  fetch(`http://localhost:3000/set_appointments?username=${username}`)
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        console.error("Error:", data.error);
        return;
      }

      const appointmentList = document.getElementById("appointment-list");
      appointmentList.innerHTML = ""; // Clear any existing content

      if (data.data && data.data.length > 0) {
        data.data.forEach(appointment => {
          const appointmentItem = document.createElement("div");
          appointmentItem.classList.add("list-group-item");
          appointmentItem.innerHTML = `
            <h6 class="mb-1">${appointment.name}</h6>
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
  fetch(`http://localhost:3000/get_chat_heads?username=${username}`)
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
          console.log(data.chatHeads);
          const chatHeadDiv = document.createElement("div");
          chatHeadDiv.classList.add("chat-head");
          chatHeadDiv.innerHTML = `<p><strong>${chatHead.shop_name}</strong></p>`;
          chatHeadDiv.onclick = () => showChatDetails(chatHead.shop_username);
          chatContainer.appendChild(chatHeadDiv);
        });
      } else {
        chatContainer.innerHTML = "No chat heads found.";
      }
    })
    .catch(error => console.error("Error fetching chat heads:", error));
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

function handleSubmit(event) {
  event.preventDefault();
  const searchInput = document.getElementById('keyword').value;
  if (!searchInput) {
    alert("Please enter a search keyword");
    return;
  }
  searchShop(searchInput);
}