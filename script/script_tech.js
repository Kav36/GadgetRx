function signup_technician() {
    const shop_username = document.getElementById("shop_username").value;
    const tech_username = document.getElementById("tech_username").value;
    const tech_des = document.getElementById("tech_des").value;
    const shop_type = document.getElementById("shop_type").value;
  
    if (!shop_username || !tech_username || !tech_des || !shop_type) {
      alert("One or more fields are empty!");
      return;
    }
  
    const formData = {
      shop_username: shop_username,
      tech_username: tech_username,
      tech_des: tech_des,
      shop_type: shop_type,
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
            alert(data.message || "Unknown error");
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