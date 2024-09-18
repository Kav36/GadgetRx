function signup_user1() {
  const name = document.getElementById("name").value;
  const username = document.getElementById("username").value;
  const email = document.getElementById("email").value;
  const contactnum = document.getElementById("contactnum").value;
  const latitude = document.getElementById("latitude").value;
  const longitude = document.getElementById("longitude").value;
  const password = document.getElementById("password").value;
  const otp = document.getElementById("otp").value;

  if (
    !name ||
    !username ||
    !email ||
    !contactnum ||
    !latitude ||
    !longitude ||
    !password ||
    !otp
  ) {
    alert("One or more fields are empty!");
    return;
  }

  const formData = {
    name: name,
    username: username,
    email: email,
    contactnum: contactnum,
    latitude: latitude,
    longitude: longitude,
    password: password,
    otp: otp,
  };

  fetch("http://localhost:3000/signup_user1", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(formData),
  })
    .then((response) => {
      return response.json().then((data) => {
        if (!response.ok) {
          console.error("Server returned an error response:", data);
          throw new Error(data.message || "Unknown error");
        }
        console.log("Successful response:", data);
        return data;
      });
    })
    .then((data) => {
      console.log("Showing success alert with message:", data.message);
      alert(data.message);
    })
    .catch((error) => {
      console.error("Error signing up:", error);
      alert(error.message || "Error signing up. Please try again later.");
    });
}

function forget_pw() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const otp = document.getElementById("otp").value;

  if (!email || !password || !otp) {
    alert("One or more fields are empty!");
    return;
  }

  const formData = {
    email: email,
    password: password,
    otp: otp,
  };

  fetch("http://localhost:3000/forget_pw", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(formData),
  })
    .then((response) => {
      return response.json().then((data) => {
        if (!response.ok) {
          alert(data.message || "Unknown error");
        }
        return data;
      });
    })
    .then((data) => {
      alert(data.message || "Password reset successful!");
    })
    .catch((error) => {
      console.error("Error resetting password:", error);
      alert(
        error.message || "Error resetting password. Please try again later."
      );
    });
}

function sendOTP_user() {
  const email = document.getElementById("email").value;
  if (email === "") {
    alert("Please enter email to send OTP!");
  } else {
    const formData = {
      email: email,
    };

    fetch("http://localhost:3000/sendOTP_user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    })
      .then((response) => {
        return response.json().then((data) => {
          if (!response.ok) {
            alert(data.message || "Unknown error");
          }
          return data;
        });
      })
      .then((data) => {
        alert(data.message);
      })
      .catch((error) => {
        console.error("Error saving data:", error);
        alert(error.message || "Error sending OTP. Please try again later.");
      });
  }
}

function fetchTechData() {
  const shopId = document.getElementById("shop_id").value;

  fetch(`http://localhost:3000/tech?shop_id=${shopId}`)
    .then((response) => {
      return response.json();
    })
    .then((techs) => { 
      const container = document.getElementById("techCards");
      container.innerHTML = "";
      techs.forEach((tech) => {
        const profilePicPath = tech.profilePic ? tech.profilePic.replace(/\\/g, '/') : '../assets/images/products/s4.jpg';
        const card = document.createElement("div");
        card.classList.add("col-md-3");
        card.innerHTML = `
          <div class="card">
              <img src="${profilePicPath}" class="card-img-top" >

              <div class="card-body">
                  <h5 class="card-title">${tech.name}</h5>
                  <span class="badge badge-secondary">${tech.tech_qul}</span>
                  <p class="card-text">${tech.tech_des}</p>
              </div>
          </div>
        `;
        container.appendChild(card);
      });
    })
    .catch((error) => console.error("Error fetching technician data:", error));
}



function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

function loadRating(personId, shopId) {
  $.ajax({
    url: `http://localhost:3000/load_rating?person_id=${personId}&shop_id=${shopId}`,
    method: "GET",
    success: function (response) {
      const rating = response.rating;
      $(".star").prop("checked", false).next("label").removeClass("selected");
      if (rating) {
        $(`input[name="rating"][value="${rating}"]`)
          .prop("checked", true)
          .next("label")
          .addClass("selected");
        $(".myratings")
          .text(rating)
          .css("color", rating < 3 ? "red" : "green");
      } else {
        $(".myratings").text(0).css("color", "black");
      }
    },
    error: function (error) {
      console.error("Error loading rating:", error);
    },
  });
}

function fetchOverallRating(shopId) {
  fetch(`http://localhost:3000/load_overall_rating?shop_id=${shopId}`)
    .then((response) => response.json())
    .then((data) => {
      const ratesElement = document.getElementById("rates");
      if (data.overall_rating !== null) {
        ratesElement.innerHTML = `<strong>${data.overall_rating}</strong>`;
      } else {
        ratesElement.innerHTML = `<strong>0</strong> Rates`; // Default if no rating
      }
    })
    .catch((error) => console.error("Error fetching overall rating:", error));
}
function searchShops() {
  const latitude = document.getElementById("latitude").value || 0;
  const longitude = document.getElementById("longitude").value|| 0;
  const distance = document.getElementById("distance").value||0;
  const rating = document.querySelector('input[name="rating"]:checked').value || 0;
  const shopType = document.getElementById("shopType").value;

  let url = `http://localhost:3000/nearest-shops?latitude=${latitude}&longitude=${longitude}&distance=${distance}&rating=${rating}&shopType=${shopType}`;

  fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((shops) => {
      const container = document.getElementById("shopCards");
      container.innerHTML = "";

      if (shops.length === 0) {
        container.innerText = "No shops found! Please try again with different search criteria.";
        return;
      }

      shops.forEach((shop) => {
        const card = document.createElement("div");
        card.classList.add("col-md-4");

        let ratingHTML = "";
        if ("overall_rating" in shop && !isNaN(Number(shop.overall_rating))) {
          const numericRating = Number(shop.overall_rating);
          ratingHTML = generateStarRating(numericRating);
        } else {
          console.warn(`Invalid overall_rating for shop:`, shop);
          ratingHTML = '<p class="card-text">Rating not available</p>';
        }

        // Assuming `shop.profilePic` contains the URL of the uploaded profile picture
        const profilePic = shop.profilePic || "../assets/images/products/s4.jpg";

        card.innerHTML = `
          <div class="card">
            <img src="${profilePic}" class="card-img-top" alt="...">
            <div class="card-body">
              <h5 class="card-title">${shop.name}</h5>
              ${ratingHTML}
              <p class="card-text">Around ${shop.distance.toFixed(2)} km</p>
              <p class="card-text">${shop.shop_des}</p>
              <a href="#" class="btn btn-primary" onclick="showShopDetails('${shop.shop_name}')">Details</a>
            </div>
          </div>
        `;
        container.appendChild(card);
      });
    })
    .catch((error) => {
      console.error("Error fetching shop data:", error);
      const container = document.getElementById("shopCards");
      container.innerHTML = "Error fetching shop data. Please try again later.";
    });
}


// Function to generate star rating HTML
function generateStarRating(rating) {
  const starsTotal = 5;
  const starPercentage = (rating / starsTotal) * 100;
  const starPercentageRounded = `${Math.round(starPercentage / 10) * 10}%`;

  return `
  <div class="stars-outer">
      <div class="stars-inner" style="width: ${starPercentageRounded};"><i class="fa fa-star" aria-hidden="true"></i><i class="fa fa-star" aria-hidden="true"></i><i class="fa fa-star" aria-hidden="true"></i><i class="fa fa-star" aria-hidden="true"></i><i class="fa fa-star" aria-hidden="true"></i></div>
  </div>
  `;
}

function setShopdata(shopId) {
  fetch(`http://localhost:3000/setShopdata?shop_id=${shopId}`)
    .then((response) => response.json())
    .then((data) => {
      if (data.error) {
        console.error("Error:", data.error);
        return;
      }

      document.getElementById("name").textContent = data.name;
      document.getElementById("rates").textContent = data.overall_rating;
      document.getElementById("phone").textContent = data.contactnum;
      document.getElementById("email").textContent = data.shop_email;
      document.getElementById("profile-pic").src = data.profilePic;

      // Calculate and set address from latitude and longitude using OpenStreetMap's Nominatim API
      fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${data.latitude}&lon=${data.longitude}&format=json`
      )
        .then((response) => response.json())
        .then((geoData) => {
          if (!geoData || !geoData.address) {
            console.error("Error fetching address:", geoData);
            return;
          }

          const address = geoData.display_name;
          const addressInput = document.getElementById("address");
          addressInput.textContent = address;

          // Use Google Maps for the maps URL
          addressInput.addEventListener("click", () => {
            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${data.latitude},${data.longitude}`;
            window.open(mapsUrl, "_blank");
          });
        })
        .catch((error) => console.error("Error fetching address:", error));
    })
    .catch((error) => console.error("Error fetching overall rating:", error));
}



function deactivateAccount(user) {
  event.preventDefault(); // Prevent the default form submission

  const checkbox = document.getElementById("accountActivation");
  if (!checkbox.checked) {
    alert("Please confirm your account deactivation.");
    return false;
  }

  const username = document.getElementById("username").value;

  if (username === "") {
    alert("User Name is required to delete a user!");
    return false;
  }

  fetch(`http://localhost:3000/deleteUser/${username}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.text())
    .then((data) => {
      console.log(data);
      alert(data);
      window.location.href = "http://localhost:3000/";
    })
    .catch((error) => console.error("Error deleting user:", error));

  return false;
}
function rd_userAcc() {
  const usernameInput = document.getElementById("username");
  const username = usernameInput.value.trim(); // Trim whitespace from input

  if (!username) {
    console.error("Error: Username cannot be empty");
    return;
  }

  fetch(
    `http://localhost:3000/retrieve_userAcc?username=${encodeURIComponent(
      username
    )}`
  )
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      console.log("Data retrieved successfully:", data);

      if (Array.isArray(data) && data.length > 0) {
        const item = data[0];
        console.log("Item:", item);

        // Assuming 'item' is an object with properties username, name, email, contactnum, longitude, latitude
        document.getElementById("name").value = item.name || "";
        document.getElementById("email").value = item.email || "";
        document.getElementById("contactnum").value = item.contactnum || "";
        document.getElementById("longitude").value = item.longitude || "";
        document.getElementById("latitude").value = item.latitude || "";
      } else {
        console.error("Error: No data found for username:", username);
        // Clear fields if no data found
        document.getElementById("name").value = "";
        document.getElementById("email").value = "";
        document.getElementById("contactnum").value = "";
        document.getElementById("longitude").value = "";
        document.getElementById("latitude").value = "";
      }
    })
    .catch((error) => {
      console.error("Error retrieving data:", error);
      // Handle errors gracefully, clear fields
      document.getElementById("name").value = "";
      document.getElementById("email").value = "";
      document.getElementById("contactnum").value = "";
      document.getElementById("longitude").value = "";
      document.getElementById("latitude").value = "";
    });
}
