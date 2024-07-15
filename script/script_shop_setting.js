function signup_shop() {
  const owner_username = document.getElementById("owner_username").value;
  const shop_name = document.getElementById("shop_name").value;
  const shop_email = document.getElementById("email1").value;
  const name = document.getElementById("name").value;
  const contactnum = document.getElementById("contactnum").value;
  const shop_type = document.getElementById("shop_type").value;
  const shop_des = document.getElementById("shop_des").value;
  const latitude = document.getElementById("latitude").value;
  const longitude = document.getElementById("longitude").value;
  const password = document.getElementById("password").value;
  const profilePicture = document.getElementById("profilePicture").files[0];

  if (
    !owner_username ||
    !shop_name ||
    !shop_email ||
    !name ||
    !contactnum ||
    !shop_type ||
    !shop_des ||
    !latitude ||
    !longitude ||
    !password 
  ) {
    console.log(owner_username, shop_name, shop_email, name, contactnum, shop_type, shop_des, latitude, longitude, password, profilePicture);
    alert("One or more fields are empty!");
    return;
  }

  const formData = new FormData();
  formData.append("owner_username", owner_username);
  formData.append("shop_name", shop_name);
  formData.append("shop_email", shop_email);
  formData.append("name", name);
  formData.append("contactnum", contactnum);
  formData.append("shop_type", shop_type);
  formData.append("shop_des", shop_des);
  formData.append("latitude", latitude);
  formData.append("longitude", longitude);
  formData.append("password", password);
  formData.append("profilePicture", profilePicture);

  fetch("http://localhost:3000/signup_shop1", {
    method: "POST",
    body: formData,
  })
    .then((response) => response.json())
    .then((data) => {
      alert(data.message);
    })
    .catch((error) => {
      console.error("Error signing up:", error);
      alert(error.message || "Error signing up. Please try again later.");
    });
}
function signup_shop1() {
  const shop_name = document.getElementById("shop_name").value;
  const shop_email = document.getElementById("email1").value;

  const formData = new FormData();
  formData.append("shop_name", shop_name);
  formData.append("shop_email", shop_email);

  fetch("http://localhost:3000/signup_shop2", {
    method: "POST",
    body: formData,
  })
    .then((response) => response.json())
    .then((data) => {
      alert("Email Changed Successfully!");
    })
    .catch((error) => {
      console.error("Error signing up:", error);
      alert(error.message || "Error signing up. Please try again later.");
    });
}
function previewPicture(event) {
  const input = event.target;
  if (input.files && input.files[0]) {
    const reader = new FileReader();

    reader.onload = function (e) {
      const previewImg = document.getElementById("preview");
      previewImg.style.display = "block";
      previewImg.src = e.target.result;
    };

    reader.readAsDataURL(input.files[0]);
  }
}

function verifyOTP_shop() {
  const shop_email = document.getElementById("email").value;
  const otp = document.getElementById("otp").value;
  const otpForm = document.getElementById("otpVerificationForm");
  const otpForm1 = document.getElementById("otpRequestForm");
  const signupForm = document.getElementById("signupForm");

  if (!otp) {
    alert("One or more fields are empty!");
    return;
  }

  const formData = {
    shop_email: shop_email,
    otp: otp,
  };

  fetch("http://localhost:3000/verify_shop", {
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
        return data;
      });
    })
    .then((data) => {
      if (data.message === "OTP Verification successfully!") {
        otpForm.style.display = "none";
        otpForm1.hidden = false;
        otpForm1.style.display = "block";
        
        document.getElementById("email1").value = shop_email;
        signup_shop1();
        
      } else if (data.message === "Invalid OTP!") {
        alert(data.message);
      }
    })
    .catch((error) => {
      console.error("Error verifying OTP:", error);
      alert(error.message || "Error verifying OTP. Please try again later.");
    });
}

function sendOTP_shop() {
  const shop_email = document.getElementById("requestEmail").value;
  const otpForm = document.getElementById("otpRequestForm");
  const verificationForm = document.getElementById("otpVerificationForm");

  if (shop_email === "") {
    alert("Please enter email to send OTP!");
  } else {
    const formData = {
      email: shop_email,
    };

    fetch("http://localhost:3000/sendOTP_shop", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    })
      .then((response) => {
        return response.json().then((data) => {
          if (!response.ok) {
            throw new Error(data.message || "Unknown error");
          }
          return data;
        });
      })
      .then((data) => {
        if (data.message === "OTP sent successfully!") {
          otpForm.style.display = "none";
          verificationForm.hidden = false;
          verificationForm.style.display = "block";
          document.getElementById("email").value = shop_email;
          alert(data.message);
        } else if (data.message === "Email already exists!") {
          alert(data.message);
        }
      })
      .catch((error) => {
        console.error("Error sending OTP:", error);
        alert(error.message || "Error sending OTP. Please try again later.");
      });
  }
}
function getShopDetails(shop_name) {
  console.log(shop_name);
  fetch(`http://localhost:3000/shop_details?shop_name=${encodeURIComponent(shop_name)}`)
    .then((response) => response.json())
    .then((data) => {
      if (data.message) {
        alert(data.message);
      } else {
        document.getElementById("owner_username").value = data.owner_username;
        document.getElementById("shop_name").value = data.shop_name;
        document.getElementById("name").value = data.name;
        document.getElementById("requestEmail").value = data.shop_email;
        document.getElementById("email1").value = data.shop_email;
        document.getElementById("contactnum").value = data.contactnum;
        document.getElementById("shop_type").value = data.shop_type;
        document.getElementById("shop_des").value = data.shop_des;
        document.getElementById("latitude").value = data.latitude;
        document.getElementById("longitude").value = data.longitude;
        
        if (data.profilePic) {
          const profilePicElement = document.getElementById("preview");
          profilePicElement.src = data.profilePic;
          profilePicElement.style.display = 'block';
        }
      }
    })
    .catch((error) => {
      console.error("Error fetching shop details:", error);
      alert("Failed to fetch shop details. Please try again later.");
    });
}
