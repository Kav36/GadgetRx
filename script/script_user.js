function signup_user() {
  const name = document.getElementById("name").value;
  const username = document.getElementById("username").value;
  const email = document.getElementById("email1").value;
  const contactnum = document.getElementById("contactnum").value;
  const latitude = document.getElementById("latitude").value;
  const longitude = document.getElementById("longitude").value;
  const password = document.getElementById("password").value;
  const profilePicture = document.getElementById("profilePic").files[0];

  if (!name || !username || !email || !contactnum || !latitude || !longitude || !password|| !profilePicture) {
    alert("One or more fields are empty!");
    return;
  }

  const formData = new FormData();
  formData.append("name", name);
  formData.append("username", username);
  formData.append("email", email);
  formData.append("contactnum", contactnum);
  formData.append("latitude", latitude);
  formData.append("longitude", longitude);
  formData.append("password", password);
  formData.append("profilePic", document.getElementById("profilePic").files[0]);

  fetch("http://localhost:3000/signup_user", {
    method: "POST",
    body: formData
  })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      alert(data.message);
      window.location.href = "http://localhost:3000/signin.html";
    })
    .catch(error => {
      console.error("Error signing up:", error);
      alert("Error signing up. Please check console for details.");
      console.log(error); 
    });
}



function previewImage(event) {
  const input = event.target;
  const preview = document.getElementById("profilePicPreview");

  if (input.files && input.files[0]) {
    const reader = new FileReader();

    reader.onload = function (e) {
      preview.src = e.target.result;
      preview.style.display = "block";
    };

    reader.readAsDataURL(input.files[0]);
  }
}
function verifyOTP_user() {
  const email = document.getElementById("email").value;
  const otp = document.getElementById("otp").value;
  const otpForm = document.getElementById("otpVerificationForm");
  const signupForm = document.getElementById("signupForm");

  if (!otp) {
    alert("One or more fields are empty!");
    return;
  }

  const formData = {
    email: email,
    otp: otp,
  };

  fetch("http://localhost:3000/verify_user", {
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
        } else {
        }
        console.log("Successful response:", data);
        return data;
      });
    })
    .then((data) => {
      if (data.message === "OTP Verification successfully!") {
        otpForm.style.display = "none";
        signupForm.hidden = false;
        signupForm.style.display = "block";
        document.getElementById("email1").value = email;
        alert(data.message);
      } else if (data.message === "Invalid OTP!") {
        alert(data.message);
      }
    })
    .catch((error) => {
      console.error("Error signing up:", error);
      alert(error.message || "Error signing up. Please try again later.");
    });
}
function sendOTP_user_signup() {
  const email = document.getElementById("requestEmail").value;
  const otpForm = document.getElementById("otpRequestForm");
  const signupForm = document.getElementById("otpVerificationForm");
  if (email === "") {
    alert("Please enter email to send OTP!");
  } else {
    const formData = {
      email: email,
    };

    fetch("http://localhost:3000/sendOTP_user_signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    })
      .then((response) => {
        return response.json().then((data) => {
          if (!response.ok) {
            //alert(data.message || "Unknown error");
          }
          return data;
        });
      })
      .then((data) => {
        if (data.message === "OTP sent successfully!") {
          otpForm.style.display = "none";
          signupForm.hidden = false;
          signupForm.style.display = "block";
          document.getElementById("email").value = email;
          alert(data.message);
        } else if (data.message === "Email already exits! Please signin") {
          window.location.href = "http://localhost:3000/signin.html";
          alert(data.message);
        }
      })
      .catch((error) => {
        console.error("Error saving data:", error);
        alert(error.message || "Error sending OTP. Please try again later.");
      });
  }
}
