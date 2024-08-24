function signup_user() {
  const email = document.getElementById("email1").value;
  const password = document.getElementById("password").value;
  console.log("weda ne" + email, password);
  if (!email || !password) {
    alert("One or more fields are empty!");
    return;
  }

  const data = { email: email, password: password };

  fetch("http://localhost:3000/forget_pw", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      alert(data.message);
      window.location.href =
        "http://localhost:3000/signin.html";
    })
    .catch((error) => {
      console.error("Error when changing password:", error);
      alert("Error! Please try again later.");
    });
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

  fetch("http://localhost:3000/verify_user_pw", {
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

    fetch("http://localhost:3000/sendOTP_pw", {
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
        } else if (data.message === "Email not exits! Please signup") {
          window.location.href = "http://localhost:3000/signup_shop.html";
          alert(data.message);
        }
      })
      .catch((error) => {
        console.error("Error saving data:", error);
        alert(error.message || "Error sending OTP. Please try again later.");
      });
  }
}
