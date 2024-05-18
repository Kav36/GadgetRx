function signup_shop() {
    const owner_username = document.getElementById("owner_username").value;
    const name = document.getElementById("name").value;
    const shop_email = document.getElementById("shop_email").value;
    const contactnum = document.getElementById("contactnum").value;
    const shop_type = document.getElementById("shop_type").value;
    const shop_des = document.getElementById("shop_des").value;
    const latitude = document.getElementById("latitude").value;
    const longitude = document.getElementById("longitude").value;
    const password = document.getElementById("password").value;
    const otp = document.getElementById("otp").value;

    if (!owner_username || !name || !shop_email || !contactnum || !shop_type || !shop_des || !latitude || !longitude || !password || !otp) {
        alert("One or more fields are empty!");
        return;
    }

    const formData = {
        owner_username: owner_username,
        name: name,
        shop_email: shop_email,
        contactnum: contactnum,
        shop_type: shop_type,
        shop_des: shop_des,
        latitude: latitude,
        longitude: longitude,
        password: password,
        otp: otp
    };

    fetch("http://localhost:3000/signup_shop", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
    })
    .then((response) => {
        return response.json().then((data) => {
            if (!response.ok) {
                throw new Error(data.message || 'Unknown error');
            }
            return data;
        });
    })
    .then((data) => {
        alert(data.message || "Sign up successful!");
        window.location.href = "/login";
    })
    .catch((error) => {
        console.error("Error signing up:", error);
        alert(error.message || "Error signing up. Please try again later.");
    });
}

function sendOTP_shop() {
    const shop_email = document.getElementById("shop_email").value;
    if (shop_email === "") {
        alert("Please enter email to send OTP!");
    } else {
        const formData = {
            email: shop_email
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
                    throw new Error(data.message || 'Unknown error');
                }
                return data;
            });
        })
        .then((data) => {
            alert(data.message || "OTP sent successfully!");
        })
        .catch((error) => {
            console.error("Error sending OTP:", error);
            alert(error.message || "Error sending OTP. Please try again later.");
        });
    }
}

function signup_technician() {
    const shop_email = document.getElementById("shop_email").value;
    const tech_email = document.getElementById("tech_email").value;
    const tech_des = document.getElementById("tech_des").value;
    const shop_type = document.getElementById("shop_type").value;

    if (!shop_email || !tech_email || !tech_des || !shop_type) {
        alert("One or more fields are empty!");
        return;
    }

    const formData = {
        shop_email: shop_email,
        tech_email: tech_email,
        tech_des: tech_des,
        shop_type: shop_type
    };

    fetch("http://localhost:3000/signup_technician", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
    })
    .then((response) => {
        return response.json().then((data) => {
            if (!response.ok) {
                throw new Error(data.message || 'Unknown error');
            }
            return data;
        });
    })
    .then((data) => {
        alert(data.message || "Sign up successful!");
    })
    .catch((error) => {
        console.error("Error signing up:", error);
        alert(error.message || "Error signing up. Please try again later.");
    });
}

function signup_user() {
    const name = document.getElementById("name").value;
    const username = document.getElementById("username").value;
    const email = document.getElementById("email").value;
    const contactnum = document.getElementById("contactnum").value;
    const latitude = document.getElementById("latitude").value;
    const longitude = document.getElementById("longitude").value;
    const password = document.getElementById("password").value;
    const otp = document.getElementById("otp").value;

    if (!name || !username ||!email || !contactnum || !latitude || !longitude || !password || !otp) {
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
        otp: otp
    };

    fetch("http://localhost:3000/signup_user", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
    })
    .then((response) => {
        return response.json().then((data) => {
            if (!response.ok) {
                throw new Error(data.message || 'Unknown error');
            }
            return data;
        });
    })
    .then((data) => {
        alert(data.message);
        window.location.href = "/login";
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
        otp: otp
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
                throw new Error(data.message || 'Unknown error');
            }
            return data;
        });
    })
    .then((data) => {
        alert(data.message || "Password reset successful!");
        window.location.href = "/login";
    })
    .catch((error) => {
        console.error("Error resetting password:", error);
        alert(error.message || "Error resetting password. Please try again later.");
    });
}

function sendOTP_user() {
    const email = document.getElementById("email").value;
    if (email === "") {
        alert("Please enter email to send OTP!");
    } else {
        const formData = {
            email: email
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
                    throw new Error(data.message || 'Unknown error');
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

function sendOTP_user_signup() {
    const email = document.getElementById("email").value;
    if (email === "") {
        alert("Please enter email to send OTP!");
    } else {
        const formData = {
            email: email
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
                    throw new Error(data.message || 'Unknown error');
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