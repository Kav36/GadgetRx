const express = require("express");
const mysql = require("mysql");
const bodyParser = require("body-parser");
const session = require("express-session");
const path = require("path");
const multer = require("multer");
const cors = require("cors");
const dotenv = require("dotenv");
const moment = require('moment');
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const fs = require("fs");
const Pusher = require("pusher");

dotenv.config();
const config = JSON.parse(fs.readFileSync("./config.json"));
const app = express();
const PORT = process.env.PORT;

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

connection.connect((err) => {
  if (err) throw err;
  console.log("Connected to MySQL database");
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

const upload = multer({ storage: storage });

const storage1 = multer.memoryStorage();
const upload1 = multer({ storage: storage1 });

app.set("view engine", "ejs");
app.set("views", __dirname + "/views");

app.use(express.static("uploads"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(bodyParser.json());
app.use(cors());
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/static", express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: "your_secret_key",
    resave: true,
    saveUninitialized: true,
  })
);

function getConnectionFromPool() {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) {
        reject(err);
      } else {
        resolve(connection);
      }
    });
  });
}
app.use("/", express.static(path.join(__dirname, "")));

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});

const transporter = nodemailer.createTransport({
  service: config.email.service,
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
});

const pusher = new Pusher({
  appId: "1802434",
  key: "a2f11745d379fc8f0ecd",
  secret: "765e97839fd85408b5ab",
  cluster: "ap2",
  useTLS: true,
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "signin.html"));
});

app.get("/signup_user.html", (req, res) => {
  res.sendFile(path.join(__dirname, "signup_user.html"));
});



const generateOTP = () => Math.floor(1000 + Math.random() * 9000);

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
    } else {
      res.redirect("/login");
    }
  });
});
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.send(
      '<script>alert("Please enter email and password!"); window.location.href="/";</script>'
    );
  }

  connection.query(
    "SELECT username, password, type FROM t_user WHERE email = ?",
    [email],
    async (error, results) => {
      if (error) {
        console.error("Error executing MySQL query:", error);
        return res.status(500).send("Internal server error");
      }

      if (results.length === 0) {
        connection.query(
          "SELECT shop_name AS username, password FROM t_shop WHERE shop_email = ?",
          [email],
          async (error, results) => {
            if (error) {
              console.error("Error executing MySQL query:", error);
              return res.status(500).send("Internal server error");
            }

            if (results.length === 0) {
              return res.send(
                '<script>alert("User not found!"); window.location.href="/login";</script>'
              );
            } else {
              const storedPassword = results[0].password;
              const username = results[0].username;

              try {
                const passwordMatch = await bcrypt.compare(password, storedPassword);

                if (!passwordMatch) {
                  return res.send(
                    '<script>alert("Incorrect email or password!"); window.location.href="/login";</script>'
                  );
                }

                req.session.loggedin = true;
                req.session.username = username;

                console.log("Logged in as:", username);

                return res.redirect("dashboard_shop.html");
              } catch (bcryptError) {
                console.error("Error comparing passwords:", bcryptError);
                return res.status(500).send("Internal server error");
              }
            }
          }
        );
      } else {
        const storedPassword = results[0].password;
        const username = results[0].username;
        const userType = results[0].type;

        try {
          const passwordMatch = await bcrypt.compare(password, storedPassword);

          if (!passwordMatch) {
            return res.send(
              '<script>alert("Incorrect email or password!"); window.location.href="/login";</script>'
            );
          }

          req.session.loggedin = true;
          req.session.username = username;

          console.log("Logged in as:", username);

          if (userType === 'admin') {
            return res.redirect("admin.html");
          }
          else{
            return res.redirect("dashboard_user.html");
        }
          
        } catch (bcryptError) {
          console.error("Error comparing passwords:", bcryptError);
          return res.status(500).send("Internal server error");
        }
      }
    }
  );
});


app.get("/getusername", (req, res) => {
  if (req.session && req.session.username) {
    const username = req.session.username;
    res.json({ username: username });
  } else {
    res
      .status(401)
      .json({ error: "Unauthorized: No username found in session" });
  }
});

app.post("/signup_shop", upload.single('profilePicture'), async (req, res) => {
  const {
      owner_username,
      shop_name,
      name,
      shop_email,
      contactnum,
      shop_type,
      shop_des,
      latitude,
      longitude,
      password,
  } = req.body;

  if (
      !owner_username || !shop_name || !name || !shop_email || !contactnum ||
      !shop_type || !shop_des || !latitude || !longitude || !password
  ) {
      return res.status(400).json({ message: "One or more fields are empty!" });
  }

  try {
    const shopExists = await checkUserExistsByname_user(shop_email);
    const userExists1 = await checkUserExistsByname_shop(shop_email);
    if (shopExists||userExists1) {
      return res.status(400).json({ message: "Email already exists!" });
    }

      const hashedPassword = await bcrypt.hash(password, 10);
      const profilePicPath = req.file ? req.file.path : null; 
      console.log("Profile pic path:", profilePicPath);

      const query = `
        INSERT INTO t_shop (owner_username, shop_name, name, shop_email, contactnum, shop_type, shop_des, latitude, longitude, password, profilePic)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          owner_username = VALUES(owner_username),
          shop_name = VALUES(shop_name),
          name = VALUES(name),
          shop_email = VALUES(shop_email),
          contactnum = VALUES(contactnum),
          shop_type = VALUES(shop_type),
          shop_des = VALUES(shop_des),
          latitude = VALUES(latitude),
          longitude = VALUES(longitude),
          password = VALUES(password),
          profilePic = COALESCE(VALUES(profilePic), profilePic)
      `;

      connection.query(
          query,
          [owner_username, shop_name, name, shop_email, contactnum, shop_type, shop_des, latitude, longitude, hashedPassword, profilePicPath],
          (err, results) => {
              if (err) {
                  console.error("Failed to save shop details:", err);
                  return res.status(500).json({ message: "Failed to save shop details" });
              }
              return res.status(200).json({ message: "Sign up successful!" });
          }
      );
  } catch (error) {
      console.error("Error during shop signup:", error);
      return res.status(500).json({ message: "Failed to save shop details" });
  }
});
app.post("/signup_shop1", upload.single('profilePicture'), async (req, res) => {
  const {
      owner_username,
      shop_name,
      name,
      shop_email,
      contactnum,
      shop_type,
      shop_des,
      latitude,
      longitude,
      password,
  } = req.body;

  if (
      !owner_username || !shop_name || !name || !shop_email || !contactnum ||
      !shop_type || !shop_des || !latitude || !longitude || !password
  ) {
      return res.status(400).json({ message: "One or more fields are empty!" });
  }

  try {

      const hashedPassword = await bcrypt.hash(password, 10);
      const profilePicPath = req.file ? req.file.path : null; 

      const query = `
        INSERT INTO t_shop (owner_username, shop_name, name, shop_email, contactnum, shop_type, shop_des, latitude, longitude, password, profilePic)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          owner_username = VALUES(owner_username),
          shop_name = VALUES(shop_name),
          name = VALUES(name),
          shop_email = VALUES(shop_email),
          contactnum = VALUES(contactnum),
          shop_type = VALUES(shop_type),
          shop_des = VALUES(shop_des),
          latitude = VALUES(latitude),
          longitude = VALUES(longitude),
          password = VALUES(password),
          profilePic = COALESCE(VALUES(profilePic), profilePic)
      `;

      connection.query(
          query,
          [owner_username, shop_name, name, shop_email, contactnum, shop_type, shop_des, latitude, longitude, hashedPassword, profilePicPath],
          (err, results) => {
              if (err) {
                  console.error("Failed to save shop details:", err);
                  return res.status(500).json({ message: "Failed to save shop details" });
              }
              return res.status(200).json({ message: "Sign up successful!" });
          }
      );
  } catch (error) {
      console.error("Error during shop signup:", error);
      return res.status(500).json({ message: "Failed to save shop details" });
  }
});
app.post("/signup_shop2", upload.single('profilePicture'), async (req, res) => {
  const {
      shop_name,
      shop_email
  } = req.body;


  try {

      const query = `
        INSERT INTO t_shop (shop_name,shop_email)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE
          shop_email = VALUES(shop_email)
      `;

      connection.query(
          query,
          [shop_name, shop_email],
          (err, results) => {
              if (err) {
                  console.error("Failed to save shop details:", err);
                  return res.status(500).json({ message: "Failed to save shop details" });
              }
              return res.status(200).json({ message: "Sign up successful!" });
          }
      );
  } catch (error) {
      console.error("Error during shop signup:", error);
      return res.status(500).json({ message: "Failed to save shop details" });
  }
});

app.get("/shop_details", async (req, res) => {
  const { shop_name } = req.query;

  if (!shop_name) {
    return res.status(400).json({ message: "Shop name is required" });
  }

  try {
    const query = `
      SELECT owner_username, shop_name, name, shop_email, contactnum, shop_type, shop_des, latitude, longitude, profilePic
      FROM t_shop
      WHERE shop_name = ?
    `;

    connection.query(query, [shop_name], (err, results) => {
      if (err) {
        console.error("Failed to fetch shop details:", err);
        return res.status(500).json({ message: "Failed to fetch shop details" });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: "Shop not found" });
      }

      return res.status(200).json(results[0]);
    });
  } catch (error) {
    console.error("Error fetching shop details:", error);
    return res.status(500).json({ message: "Failed to fetch shop details" });
  }
});

app.post("/verify_shop", async (req, res) => {
  const { shop_email, otp } = req.body;

  if (!otp) {
    return res.status(400).json({ message: "One or more fields are empty!" });
  }

  try {
    const otpVerification = await verifyOTPFromDatabase(shop_email, otp);
    const shopExists = await checkUserExistsByEmail_shop(shop_email);
    if (shopExists) {
      return res.status(400).json({ message: "Email already exists!" });
    }

    const userExists1 = await checkUserExists_person(shop_email);
    if (userExists1) {
      return res.status(400).json({ message: "Email already exists!" });
    }

    if (!otpVerification) {
      return res.status(400).json({ message: "Invalid OTP!" });
    } else {
      return res
        .status(200)
        .json({ message: "OTP Verification successfully!" });
    }
  } catch (error) {
    console.error("Error during signup:", error);
    return res.status(400).json({ message: "Failed to save shop details" });
  }
});

const verifyOTPFromDatabase = (email, otp) => {
  return new Promise((resolve, reject) => {
    connection.query(
      "SELECT * FROM otp_table WHERE email = ? AND otp = ? AND timeout > NOW()",
      [email, otp],
      (err, results) => {
        if (err) {
          return reject(err);
        }
        resolve(results.length > 0);
      }
    );
  });
};

const checkUserExistsByEmail_person = (email) => {
  return new Promise((resolve, reject) => {
    connection.query(
      "SELECT email FROM t_user WHERE email = ?",
      [email],
      (err, results) => {
        if (err) {
          return reject(err);
        }

        resolve(results.length > 0);
      }
    );
  });
};

const checkUserExistsByUserName_person = (email) => {
  return new Promise((resolve, reject) => {
    connection.query(
      "SELECT email FROM t_user WHERE username = ?",
      [email],
      (err, results) => {
        if (err) {
          return reject(err);
        }

        resolve(results.length > 0);
      }
    );
  });
};

const checkUserExists_person = (username) => {
  return new Promise((resolve, reject) => {
    connection.query(
      "SELECT email FROM t_user WHERE email = ?",
      [username],
      (err, results) => {
        if (err) {
          return reject(err);
        }

        resolve(results.length > 0);
      }
    );
  });
};

const checkUserExistsByEmail_shop = (email) => {
  return new Promise((resolve, reject) => {
    connection.query(
      "SELECT shop_email FROM t_shop WHERE shop_email = ?",
      [email],
      (err, results) => {
        if (err) {
          return reject(err);
        }

        resolve(results.length > 0);
      }
    );
  });
};

const checkUserExistsByname_user = (email) => {
  return new Promise((resolve, reject) => {
    connection.query(
      "SELECT username FROM t_user WHERE email = ?",
      [email],
      (err, results) => {
        if (err) {
          return reject(err);
        }

        resolve(results.length > 0);
      }
    );
  });
};

const checkUserExistsByname_shop = (email) => {
  return new Promise((resolve, reject) => {
    connection.query(
      "SELECT shop_name FROM t_shop WHERE shop_email = ?",
      [email],
      (err, results) => {
        if (err) {
          return reject(err);
        }

        resolve(results.length > 0);
      }
    );
  });
};

const checkUserExistsByUserName_shop = (email) => {
  return new Promise((resolve, reject) => {
    connection.query(
      "SELECT shop_email FROM t_shop WHERE shop_name = ?",
      [email],
      (err, results) => {
        if (err) {
          return reject(err);
        }

        resolve(results.length > 0);
      }
    );
  });
};

app.post("/sendOTP_shop", async (req, res) => {
  const { email } = req.body;

  try {
    const shopExists = await checkUserExistsByEmail_shop(email);
    if (shopExists) {
      return res.status(400).json({ message: "Email already exists!" });
    }

    const userExists = await checkUserExists_person(email);
    if (userExists) {
      return res.status(400).json({ message: "Email already exists!" });
    }

    const otp = generateOTP();
    const otpTimeout = new Date();
    otpTimeout.setMinutes(otpTimeout.getMinutes() + 30);

    const mailOptions = {
      from: config.email.user,
      to: email,
      subject: "One-Time Password (OTP) for Email Verification",
      text: `Dear User,
    
    Thank you for taking the time to verify your email address with us. To proceed with your registration, please use the following One-Time Password (OTP):
    
    OTP: ${otp}
    
    Your security is our priority, and this OTP ensures that only authorized users gain access to our platform. Please enter the OTP within the specified time frame to complete the verification process successfully.
    
    For your security, please do not share this OTP with anyone. Our system is designed to protect your information, and sharing your OTP may compromise your account's security.
    
    If you did not initiate this request, or if you encounter any issues during the verification process, please contact our support team immediately for assistance.
    
    Thank you for choosing us. We look forward to serving you.
    
    Best regards,
    Team GadgetRx.`,
    };

    connection.query(
      "INSERT INTO otp_table (email, otp, timeout) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE otp=VALUES(otp), timeout=VALUES(timeout)",
      [email, otp, otpTimeout],
      (err, results) => {
        if (err) {
          console.error("Failed to store OTP in database:", err);
          return res
            .status(500)
            .json({ message: "Error occurred! Please try again" });
        }

        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.error("Failed to send OTP email:", error);
            return res
              .status(500)
              .json({ message: "Failed to send OTP email" });
          }
          console.log("Email sent:", info.response);
          return res.status(200).json({ message: "OTP sent successfully!" });
        });
      }
    );
  } catch (error) {
    console.error("Error during sending OTP:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

app.post("/signup_technician", async (req, res) => {
  const { shop_username, tech_username, tech_des, shop_type } = req.body;

  if (!shop_username || !tech_username || !tech_des || !shop_type) {
    return res.status(400).json({ message: "One or more fields are empty!" });
  }

  try {
    const userExists = await checkUserExistsByUserName_person(tech_username);

    if (!userExists) {
      return res.status(400).json({ message: "Invalid id for technician!" });
    }

    const shopExists = await checkUserExistsByUserName_shop(shop_username);

    if (!shopExists) {
      return res.status(400).json({ message: "Shop id does not exist!" });
    }

    connection.query(
      "INSERT INTO t_technician (shop_username, tech_username, tech_des, tech_qul) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE tech_des = VALUES(tech_des), tech_qul = VALUES(tech_qul)",
      [shop_username, tech_username, tech_des, shop_type],
      (techErr, techResults) => {
        if (techErr) {
          console.error("Failed to save technician details:", techErr);
          return res
            .status(500)
            .json({ message: "Failed to save technician details" });
        }
        console.log("Technician details saved successfully");
        return res.status(200).json({ message: "Sign up successful" });
      }
    );
  } catch (error) {
    console.error("Error during technician signup:", error);
    return res
      .status(500)
      .json({ message: "Failed to save technician details" });
  }
});

app.get("/user_details", async (req, res) => {
  const { username } = req.query;

  if (!username) {
    return res.status(400).json({ message: "Username is required" });
  }

  try {
    const query = `
      SELECT name, username, email, contactnum, latitude, longitude, profilePic
      FROM t_user
      WHERE username = ?
    `;

    connection.query(query, [username], (err, results) => {
      if (err) {
        console.error("Failed to fetch user details:", err);
        return res.status(500).json({ message: "Failed to fetch user details" });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      return res.status(200).json(results[0]);
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    return res.status(500).json({ message: "Failed to fetch user details" });
  }
});


app.post('/signup_user', upload.single("profilePic"), async (req, res) => {
  const { name, username, email, contactnum, latitude, longitude, password } = req.body;

  if (!name || !username || !email || !contactnum || !latitude || !longitude || !password) {
    return res.status(400).json({ message: "One or more fields are empty!" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const profilePicPath = req.file ? req.file.path : null; 
    console.log("Profile pic path:", profilePicPath);

    const shopExists = await checkUserExistsByname_user(email);
    const userExists1 = await checkUserExistsByname_shop(email);
    if (shopExists||userExists1) {
      return res.status(400).json({ message: "Email already exists!" });
    }
    
    const query = `
      INSERT INTO t_user (name, username, email, contactnum, latitude, longitude, password, profilePic)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        email = VALUES(email),
        contactnum = VALUES(contactnum),
        latitude = VALUES(latitude),
        longitude = VALUES(longitude),
        password = VALUES(password),
        profilePic = COALESCE(VALUES(profilePic), profilePic)
    `;

    connection.query(
      query,
      [name, username, email, contactnum, latitude, longitude, hashedPassword, profilePicPath],
      (err, results) => {
        if (err) {
          console.error("Failed to save user details:", err);
          return res.status(500).json({ message: "Failed to save user details" });
        }
        return res.status(200).json({ message: "Sign up successful!" });
      }
    );
  } catch (error) {
    console.error("Error during user signup:", error);
    return res.status(500).json({ message: "Failed to save user details" });
  }
});

app.post('/signup_user1', upload.single("profilePic"), async (req, res) => {
  const { name, username, email, contactnum, latitude, longitude, password } = req.body;


  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const profilePicPath = req.file ? req.file.path : null; 
    
    const query = `
      INSERT INTO t_user (name, username, email, contactnum, latitude, longitude, password, profilePic)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        email = VALUES(email),
        contactnum = VALUES(contactnum),
        latitude = VALUES(latitude),
        longitude = VALUES(longitude),
        password = VALUES(password),
        profilePic = COALESCE(VALUES(profilePic), profilePic)
    `;

    connection.query(
      query,
      [name, username, email, contactnum, latitude, longitude, hashedPassword, profilePicPath],
      (err, results) => {
        if (err) {
          console.error("Failed to save user details:", err);
          return res.status(500).json({ message: "Failed to save user details" });
        }
        return res.status(200).json({ message: "Sign up successful!" });
      }
    );
  } catch (error) {
    console.error("Error during user signup:", error);
    return res.status(500).json({ message: "Failed to save user details" });
  }
});

app.post('/signup_user2', upload.single("profilePic"), async (req, res) => {
  const { username, email,} = req.body;


  try {
    const profilePicPath = req.file ? req.file.path : null; 
    
    const query = `
      INSERT INTO t_user (username, email)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE
        email = VALUES(email)
    `;

    connection.query(
      query,
      [username, email],
      (err, results) => {
        if (err) {
          console.error("Failed to save user details:", err);
          return res.status(500).json({ message: "Failed to save user details" });
        }
        return res.status(200).json({ message: "Sign up successful!" });
      }
    );
  } catch (error) {
    console.error("Error during user signup:", error);
    return res.status(500).json({ message: "Failed to save user details" });
  }
});

app.post("/verify_user", async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: "One or more fields are empty!" });
  }

  try {
    const userExists = await checkUserExistsByEmail_person(email);
    if (userExists) {
      return res.status(400).json({ message: "Email already exists!" });
    }

    const shopExists = await checkUserExistsByEmail_shop(email);
    if (shopExists) {
      return res.status(400).json({ message: "Email already exists!" });
    }

    const otpVerification = await verifyOTPFromDatabase(email, otp);
    if (!otpVerification) {
      return res.status(400).json({ message: "Invalid OTP!" });
    } else {
      return res
        .status(200)
        .json({ message: "OTP Verification successfully!" });
    }
  } catch (error) {
    console.error("Error during user signup:", error);
    return res.status(500).json({ message: "Failed to save user details" });
  }
});
app.post("/verify_user_pw", async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: "One or more fields are empty!" });
  }

  try {
    const otpVerification = await verifyOTPFromDatabase(email, otp);
    if (!otpVerification) {
      return res.status(400).json({ message: "Invalid OTP!" });
    } else {
      return res
        .status(200)
        .json({ message: "OTP Verification successfully!" });
    }
  } catch (error) {
    console.error("Error during user signup:", error);
    return res.status(500).json({ message: "Failed to change password" });
  }
});
app.post("/sendOTP_user", async (req, res) => {
  const { email } = req.body;

  try {
    const userExists = await checkUserExistsByEmail_person(email);
    if (!userExists) {
      return res.status(400).json({ message: "Invalid email for owner!" });
    }

    const otp = generateOTP();
    const otpTimeout = new Date();
    otpTimeout.setMinutes(otpTimeout.getMinutes() + 30);

    const mailOptions = {
      from: config.email.user,
      to: email,
      subject: "One-Time Password (OTP) for Email Verification",
      text: `Dear User,
    
    Thank you for taking the time to verify your email address with us. To proceed with your registration, please use the following One-Time Password (OTP):
    
    OTP: ${otp}
    
    Your security is our priority, and this OTP ensures that only authorized users gain access to our platform. Please enter the OTP within the specified time frame to complete the verification process successfully.
    
    For your security, please do not share this OTP with anyone. Our system is designed to protect your information, and sharing your OTP may compromise your account's security.
    
    If you did not initiate this request, or if you encounter any issues during the verification process, please contact our support team immediately for assistance.
    
    Thank you for choosing us. We look forward to serving you.
    
    Best regards,
    Team GadgetRx.`,
    };

    connection.query(
      "INSERT INTO otp_table (email, otp, timeout) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE otp=VALUES(otp), timeout=VALUES(timeout)",
      [email, otp, otpTimeout],
      (err, results) => {
        if (err) {
          console.error("Failed to store OTP in database:", err);
          return res
            .status(500)
            .json({ message: "Error occurred! Please try again" });
        }

        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.error("Failed to send OTP email:", error);
            return res
              .status(500)
              .json({ message: "Failed to send OTP email" });
          }
          console.log("Email sent:", info.response);
          return res.status(200).json({ message: "OTP sent successfully!" });
        });
      }
    );
  } catch (error) {
    console.error("Error during sending OTP:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

app.post("/sendOTP_user_signup", async (req, res) => {
  const { email } = req.body;

  try {
    const userExists = await checkUserExistsByEmail_person(email);
    if (userExists) {
      return res
        .status(400)
        .json({ message: "Email already exits! Please signin" });
    }

    const otp = generateOTP();
    const otpTimeout = new Date();
    otpTimeout.setMinutes(otpTimeout.getMinutes() + 30);

    const mailOptions = {
      from: config.email.user,
      to: email,
      subject: "One-Time Password (OTP) for Email Verification",
      text: `Dear User,
    
    Thank you for taking the time to verify your email address with us. To proceed with your registration, please use the following One-Time Password (OTP):
    
    OTP: ${otp}
    
    Your security is our priority, and this OTP ensures that only authorized users gain access to our platform. Please enter the OTP within the specified time frame to complete the verification process successfully.
    
    For your security, please do not share this OTP with anyone. Our system is designed to protect your information, and sharing your OTP may compromise your account's security.
    
    If you did not initiate this request, or if you encounter any issues during the verification process, please contact our support team immediately for assistance.
    
    Thank you for choosing us. We look forward to serving you.
    
    Best regards,
    Team GadgetRx.`,
    };

    connection.query(
      "INSERT INTO otp_table (email, otp, timeout) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE otp=VALUES(otp), timeout=VALUES(timeout)",
      [email, otp, otpTimeout],
      (err, results) => {
        if (err) {
          console.error("Failed to store OTP in database:", err);
          return res
            .status(500)
            .json({ message: "Error occurred! Please try again" });
        }

        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.error("Failed to send OTP email:", error);
            return res
              .status(500)
              .json({ message: "Failed to send OTP email" });
          }
          console.log("Email sent:", info.response);
          return res.status(200).json({ message: "OTP sent successfully!" });
        });
      }
    );
  } catch (error) {
    console.error("Error during sending OTP:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

app.post("/sendOTP_pw", async (req, res) => {
  const { email } = req.body;

  try {
    const userExists = await checkUserExistsByEmail_person(email);
    if (!userExists) {
      return res
        .status(400)
        .json({ message: "Email not exits! Please signup" });
    }

    const otp = generateOTP();
    const otpTimeout = new Date();
    otpTimeout.setMinutes(otpTimeout.getMinutes() + 30);

    const mailOptions = {
      from: config.email.user,
      to: email,
      subject: "One-Time Password (OTP) for Email Verification",
      text: `Dear User,
    
    Thank you for taking the time to verify your email address with us, please use the following One-Time Password (OTP):
    
    OTP: ${otp}
    
    Your security is our priority, and this OTP ensures that only authorized users gain access to our platform. Please enter the OTP within the specified time frame to complete the verification process successfully.
    
    For your security, please do not share this OTP with anyone. Our system is designed to protect your information, and sharing your OTP may compromise your account's security.
    
    If you did not initiate this request, or if you encounter any issues during the verification process, please contact our support team immediately for assistance.
    
    Thank you for choosing us. We look forward to serving you.
    
    Best regards,
    Team GadgetRx.`,
    };

    connection.query(
      "INSERT INTO otp_table (email, otp, timeout) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE otp=VALUES(otp), timeout=VALUES(timeout)",
      [email, otp, otpTimeout],
      (err, results) => {
        if (err) {
          console.error("Failed to store OTP in database:", err);
          return res
            .status(500)
            .json({ message: "Error occurred! Please try again" });
        }

        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.error("Failed to send OTP email:", error);
            return res
              .status(500)
              .json({ message: "Failed to send OTP email" });
          }
          console.log("Email sent:", info.response);
          return res.status(200).json({ message: "OTP sent successfully!" });
        });
      }
    );
  } catch (error) {
    console.error("Error during sending OTP:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

app.post("/forget_pw", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "One or more fields are empty!" });
  }
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = `
      UPDATE t_user SET password = ? WHERE email = ?
    `;

    connection.query(query, [hashedPassword, email], (err, results) => {
      if (err) {
        console.error("Failed to update user details:", err);
        return res.status(500).json({ message: "Failed to update user details" });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({ message: "Email not found" });
      }

      console.log("User details updated successfully");
      return res.status(200).json({ message: "Password reset successful" });
    });
  } catch (error) {
    console.error("Error during password reset:", error);
    return res.status(500).json({ message: "Failed to reset password" });
  }
});

app.get("/shops", (req, res) => {
  const query = "SELECT * FROM t_shop";

  connection.query(query, (err, results) => {
    if (err) {
      console.error("Error executing MySQL query: " + err.stack);
      return res.status(500).send("Internal Server Error");
    }
    res.json(results);
  });
});

app.get("/get_profilePic", (req, res) => {
  const username = req.query.username;
  const query = "SELECT profilePic FROM t_user WHERE username = ?";

  connection.query(query, [username], (err, results) => {
    if (err) {
      console.error("Error executing MySQL query: " + err.stack);
      return res.status(500).send("Internal Server Error");
    }
    res.json(results);
  });
});


app.get("/load_rating", (req, res) => {
  const { person_id, shop_id } = req.query;
  const sql = "SELECT stars FROM reviews WHERE person_id = ? AND shop_id = ?";
  connection.query(sql, [person_id, shop_id], (err, result) => {
    if (err) {
      console.error("Error fetching data from the database:", err);
      return res.status(500).send({ error: "Error fetching data" });
    }
    if (result.length > 0) {
      res.send({ rating: result[0].stars });
    } else {
      res.send({ rating: null });
    }
  });
});

// Route to save rating based on person ID and shop ID
app.post("/save_rating", (req, res) => {
  const { person_id, shop_id, stars } = req.body;
console.log(person_id, shop_id, stars);
  const sql =
    "INSERT INTO reviews (person_id, shop_id, stars) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE stars = ?";
  connection.query(sql, [person_id, shop_id, stars, stars], (err, result) => {
    if (err) {
      console.error(
        "Error inserting/updating data into the reviews table:",
        err
      );
      return res.status(500).send({ error: "Error saving data" });
    }

    // Calculate overall rating for the shop
    calculateOverallRating(shop_id, (overallRating) => {
      if (overallRating === null) {
        return res
          .status(500)
          .send({ error: "Error calculating overall rating" });
      }

      // Update or insert overall rating in the shop table
      const updateShopSql =
        "INSERT INTO t_shop (shop_name, overall_rating) VALUES (?, ?) ON DUPLICATE KEY UPDATE overall_rating = ?";
      connection.query(
        updateShopSql,
        [shop_id, overallRating, overallRating],
        (err, result) => {
          if (err) {
            console.error(
              "Error updating/inserting overall rating into the shop table:",
              err
            );
            return res
              .status(500)
              .send({ error: "Error saving overall rating" });
          }
          res.send({ success: true });
        }
      );
    });
  });
});

// Function to calculate overall rating for a shop
function calculateOverallRating(shop_id, callback) {
  const sql = "SELECT AVG(stars) AS avg_rating FROM reviews WHERE shop_id = ?";
  connection.query(sql, [shop_id], (err, result) => {
    if (err) {
      console.error("Error calculating overall rating:", err);
      return callback(null);
    }
    const avgRating = result[0].avg_rating || 0; // If there are no reviews, set average rating to 0
    callback(avgRating);
  });
}

// Route to load overall rating for a shop
app.get("/load_overall_rating", (req, res) => {
  const { shop_id } = req.query;

  const sql = "SELECT overall_rating FROM t_shop WHERE shop_name = ?";
  connection.query(sql, [shop_id], (err, result) => {
    if (err) {
      console.error("Error fetching overall rating from the database:", err);
      return res.status(500).send({ error: "Error fetching overall rating" });
    }
    if (result.length > 0) {
      res.send({ overall_rating: result[0].overall_rating });
    } else {
      res.send({ overall_rating: null });
    }
  });
});

// Route to add a new comment
app.post("/comment", (req, res) => {
  const newComment = {
    person_id: req.body.person_id,
    shop_id: req.body.shop_id,
    comment: req.body.comment,
  };

  const query =
    "INSERT INTO comments (person_id, shop_id, comment) VALUES (?, ?, ?)";
  connection.query(
    query,
    [newComment.person_id, newComment.shop_id, newComment.comment],
    (error, results) => {
      if (error) throw error;

      newComment.id = results.insertId;
      newComment.isOwner = true;

      pusher.trigger("flash-comments", "new_comment", newComment);
      res.json(newComment);
    }
  );
});

// Route to get comments for a shop
app.get("/comments/:shop_id", (req, res) => {
  const shopId = req.params.shop_id;
  const personId = req.query.person_id; // Retrieve person_id from query parameters

  if (!shopId) {
    return res.status(400).json({ error: "Shop ID is required." });
  }

  const query =
    "SELECT c.id, c.person_id, c.comment, c.created_at, u.profilePic FROM comments c JOIN t_user u ON c.person_id = u.username WHERE c.shop_id = ? ORDER BY c.created_at DESC";
  connection.query(query, [shopId], (error, results) => {
    if (error) {
      console.error("Error fetching comments:", error);
      return res.status(500).json({ error: "Internal server error." });
    }

    results = results.map((comment) => ({
      ...comment,
      isOwner: comment.person_id == personId,
    }));

    res.json(results);
  });
});

// Route to delete a comment
app.post("/delete-comment", (req, res) => {
  const commentId = req.body.comment_id;
  const personId = req.body.person_id;

  const query = "DELETE FROM comments WHERE id = ? AND person_id = ?";
  connection.query(query, [commentId, personId], (error, results) => {
    if (error) {
      console.error("Error deleting comment:", error);
      return res.status(500).json({ error: "Internal server error." });
    }

    if (results.affectedRows === 0) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    pusher.trigger("flash-comments", "delete_comment", {
      comment_id: commentId,
    });
    res.json({ deleted: true });
  });
});

app.get("/tech", (req, res) => {
  const shopId = req.query.shop_id;
  const query = `
        SELECT t_user.name, t_technician.tech_des, t_technician.tech_qul ,t_user.profilePic 
        FROM t_technician 
        JOIN t_user ON t_technician.tech_username = t_user.username 
        WHERE t_technician.shop_username = ?
    `;

  connection.query(query, [shopId], (err, results) => {
    if (err) {
      console.error("Error executing MySQL query: " + err.stack);
      return res.status(500).send("Internal Server Error");
    }
    res.json(results);
  });
});

const haversine = (lat1, lon1, lat2, lon2) => {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

app.get("/nearest-shops", async (req, res) => {
  const {
    latitude,
    longitude,
    distance,
    rating,
    shopType,
    skipDistanceCheck = "false",
    skipRatingsCheck = "false",
    skipLimit = "false",
  } = req.query;

  const skipDistance = skipDistanceCheck === "true";
  const skipRatings = skipRatingsCheck === "true";
  const limit = skipLimit === "true" ? null : 10;

  const query =
    "SELECT * FROM t_shop WHERE shop_type LIKE ? OR shop_des LIKE ? OR shop_name LIKE ?";
  const params = [`%${shopType}%`, `%${shopType}%`, `%${shopType}%`];
  connection.query(query, params, (err, results) => {
    if (err) {
      console.error("Error querying the database:", err);
      return res.status(500).json({ error: "Database query error" });
    }

    let shopsWithDistance = results.map((shop) => {
      const shopDistance = haversine(
        parseFloat(latitude),
        parseFloat(longitude),
        parseFloat(shop.latitude),
        parseFloat(shop.longitude)
      );

      return { ...shop, distance: shopDistance };
    });

    if (!skipDistance) {
      shopsWithDistance = shopsWithDistance.filter(
        (shop) => shop.distance <= distance
      );
    }
    if (!skipRatings) {
      shopsWithDistance = shopsWithDistance.filter(
        (shop) => shop.overall_rating >= rating
      );
    }

    if (!skipLimit && shopsWithDistance.length > limit) {
      shopsWithDistance = shopsWithDistance.slice(0, limit);
    }

    res.json(shopsWithDistance);
  });
});

app.get("/setShopdata", (req, res) => {
  const { shop_id } = req.query;

  const sql = "SELECT * FROM t_shop WHERE shop_name = ?";
  connection.query(sql, [shop_id], (err, result) => {
    if (err) {
      console.error("Error fetching overall rating from the database:", err);
      return res.status(500).send({ error: "Error fetching overall rating" });
    }

    if (result.length === 0) {
      return res.status(404).send({ error: "Shop not found" });
    }

    const shop = result[0];
    res.json({
      name: shop.name,
      overall_rating: shop.overall_rating,
      contactnum: shop.contactnum,
      shop_email: shop.shop_email,
      longitude: shop.longitude,
      latitude: shop.latitude,
      profilePic: shop.profilePic, 
    });
  });
});

app.get("/setShopdata_dash", (req, res) => {
  const { user_id } = req.query;

  const sql = `
    SELECT 
      t_technician.shop_username, 
      t_technician.tech_qul,
      t_shop.name 
    FROM 
      t_technician 
    INNER JOIN 
      t_shop 
    ON 
      t_technician.shop_username = t_shop.shop_name 
    WHERE 
      t_technician.tech_username = ?
  `;

  connection.query(sql, [user_id], (err, result) => {
    if (err) {
      console.error("Error fetching overall rating from the database:", err);
      return res.status(500).send({ error: "Error fetching overall rating" });
    }

    if (result.length === 0) {
      return res.status(404).send({ error: "Shop not found" });
    }

    res.json({
      data: result,
    });
  });
});

// Create a new appointment
app.post("/appointments", (req, res) => {
  const { username, date_time, description, shop_name } = req.body;

  if (!username || !date_time || !description || !shop_name) {
    res.status(400).json({ error: "All fields are required" });
    return;
  }

  const checkQuery =
    "SELECT * FROM appointments WHERE date_time = ? AND shop_name = ?";
  connection.query(checkQuery, [date_time, shop_name], (err, results) => {
    if (err) {
      console.error("Failed to check for existing appointment:", err);
      res
        .status(500)
        .json({
          error: "Failed to check for existing appointment",
          details: err,
        });
      return;
    }

    if (results.length > 0) {
      res.status(400).json({ error: "Time slot already booked" });
      return;
    }

    const query =
      "INSERT INTO appointments (username, date_time, description, shop_name) VALUES (?, ?, ?, ?)";
    connection.query(
      query,
      [username, date_time, description, shop_name],
      (err, result) => {
        if (err) {
          console.error("Failed to create appointment:", err);
          res
            .status(500)
            .json({ error: "Failed to create appointment", details: err });
          return;
        }
        res.status(201).json({ id: result.insertId });
      }
    );
  });
});

// Get all appointments with user and shop details
app.get("/appointments", (req, res) => {
  const { date } = req.query;
  let query = "SELECT * FROM appointments";
  const params = [];

  if (date) {
    query += " WHERE DATE(date_time) = ?";
    params.push(date);
  }

  connection.query(query, params, (err, results) => {
    if (err) {
      res
        .status(500)
        .json({ error: "Failed to fetch appointments", details: err });
      return;
    }
    res.status(200).json(results);
  });
});

// Get all appointments for a specific shop
app.get("/appointments/:shop_name", (req, res) => {
  const { shop_name } = req.params;
  const { date } = req.query;
  let query = "SELECT * FROM appointments WHERE shop_name = ?";
  const params = [shop_name];

  if (date) {
    query += " AND DATE(date_time) = ?";
    params.push(date);
  }

  connection.query(query, params, (err, results) => {
    if (err) {
      res
        .status(500)
        .json({ error: "Failed to fetch appointments", details: err });
      return;
    }
    res.status(200).json(results);
  });
});

app.delete("/appointments/:username/:shop_name/:dateTime", (req, res) => {
  const { username, shop_name, dateTime } = req.params;

  // Format the dateTime to match the datetime format in the database
  const formattedDateTime = formatEventDateTime(dateTime);

  console.log(username, shop_name, formattedDateTime);

  const deleteQuery =
    "DELETE FROM appointments WHERE username = ? AND shop_name = ? AND date_time = ?";

  connection.query(
    deleteQuery,
    [username, shop_name, formattedDateTime],
    (err, result) => {
      if (err) {
        console.error("Failed to delete appointment:", err);
        return res.status(500).json({
          error: "Failed to delete appointment",
          details: err.message,
        });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      res.status(200).json({ message: "Appointment deleted successfully" });
    }
  );
});

// Helper function to format eventDateTime
function formatEventDateTime(eventDateTime) {
  // Parse the date string using the Date constructor
  const date = new Date(eventDateTime);

  // Check if the date is valid
  if (isNaN(date.getTime())) {
    throw new Error("Invalid date format");
  }

  // Extract the date components in UTC
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");

  // Return the formatted string with UTC components
  return `${year}-${month}-${day} ${hours}:${minutes}:00`;
}





// Helper function to format eventDateTime
function formatEventDateTime(eventDateTime) {
  const date = new Date(eventDateTime);

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}


app.delete("/deleteUser/:username", (req, res) => {
  const username = req.params.username;

  connection.query(
    "DELETE FROM t_user WHERE username = ?",
    [username],
    (err, results) => {
      if (err) {
        console.error("Failed to delete user:", err);
        return res.status(500).send("Failed to delete user!");
      }
      if (results.affectedRows === 0) {
        return res.status(404).send("User not found!");
      }
      console.log("User deleted successfully");
      return res.send("User deleted successfully!");
    }
  );
});

app.get("/retrieve_userAcc", (req, res) => {
  const searchInput = req.query.username;
  console.log("searchInput:", searchInput);
  const retrieveQuery = `SELECT * FROM t_user WHERE username = ?`;

  connection.query(retrieveQuery, [searchInput], (err, results) => {
    if (err) {
      console.error("Error retrieving data:", err);
      res.status(500).json({ error: "Error retrieving data" });
    } else {
      console.log("Data retrieved successfully");
      res.status(200).json(results);
    }
  });
});

// Add message
app.post("/messages", upload.single("attachment"), (req, res) => {
  const { sender, receiver, message } = req.body;
  const attachment = req.file ? `/uploads/${req.file.filename}` : null;

  if (!message && !attachment) {
    return res.status(400).json({ error: "Empty message or attachment received!" });
  }

  const query = "INSERT INTO messages (sender, receiver, message, attachment, `read`) VALUES (?, ?, ?, ?, false)";
  connection.query(query, [sender, receiver, message, attachment], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Database error." });
    }
    const insertedId = result.insertId;
    pusher.trigger("chat", "message", {
      id: insertedId,
      sender: sender,
      receiver: receiver,
      message: message,
      attachment: attachment
    });
    res.json({ id: insertedId });
  });
});

// Get messages
app.get("/messages", (req, res) => {
  const { sender, receiver } = req.query;

  const query = `
    SELECT * FROM messages 
    WHERE (sender = ? AND receiver = ?) OR (sender = ? AND receiver = ?)`;
  connection.query(query, [sender, receiver, receiver, sender], (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

// Get unread messages
app.get("/messages/unread", (req, res) => {
  const { sender, receiver } = req.query;

  const query = `
    SELECT * FROM messages 
    WHERE ((sender = ? AND receiver = ?) OR (sender = ? AND receiver = ?)) AND \`read\` = false`;
  connection.query(query, [sender, receiver, receiver, sender], (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

// Mark messages as read
app.post("/messages/mark-as-read", (req, res) => {
  const { sender, receiver } = req.body;

  const query = `
    UPDATE messages 
    SET \`read\` = true 
    WHERE (sender = ? AND receiver = ?) OR (sender = ? AND receiver = ?)`;
  connection.query(query, [sender, receiver, receiver, sender], (err) => {
    if (err) return res.status(500).json({ error: "Database error." });
    res.json({ success: true });
  });
});

// Delete message
app.delete("/messages/:id", (req, res) => {
  const { id } = req.params;
  const selectQuery = "SELECT attachment FROM messages WHERE id = ?";
  connection.query(selectQuery, [id], (err, results) => {
    if (err) throw err;
    if (results.length > 0 && results[0].attachment) {
      const filePath = path.join(__dirname, results[0].attachment);
      fs.unlink(filePath, (err) => {
        if (err) console.error(err);
      });
    }

    const deleteQuery = "DELETE FROM messages WHERE id = ?";
    connection.query(deleteQuery, [id], (err) => {
      if (err) throw err;
      pusher.trigger("chat", "delete-message", { id: id });
      res.send("OK");
    });
  });
});


app.get("/set_appointments", (req, res) => {
  const username = req.query.username;
  const query = `
      SELECT appointments.username, appointments.shop_name, appointments.date_time, appointments.description, t_shop.name
      FROM appointments
      INNER JOIN t_shop ON t_shop.shop_name = appointments.shop_name
      WHERE appointments.date_time > NOW() AND appointments.username = ?
      ORDER BY appointments.date_time ASC
    `;

  connection.query(query, [username], (err, results) => {
    if (err) {
      console.error("Error fetching appointments:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    res.json({ data: results });
  });
});

app.get("/get_chat_heads", (req, res) => {
  const username = req.query.username;
  const query = `
      SELECT 
      t_shop.shop_name AS shop_username,
        t_shop.name AS shop_name
      FROM messages
      JOIN t_shop ON t_shop.shop_name = 
        CASE 
          WHEN messages.sender = ? THEN messages.receiver 
          ELSE messages.sender 
        END
      WHERE messages.sender = ? OR messages.receiver = ? 
      GROUP BY shop_name 
      ORDER BY MAX(messages.timestamp) DESC
    `;

  connection.query(query, [username, username, username], (err, results) => {
    if (err) {
      console.error("Error fetching chat heads:", err);
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }

    res.json({ chatHeads: results });
  });
});
app.get("/set_appointments_shop", (req, res) => {
  const username = req.query.username;
  const query = `
      SELECT appointments.username, appointments.shop_name, appointments.date_time, appointments.description, t_shop.name
      FROM appointments
      INNER JOIN t_shop ON t_shop.shop_name = appointments.shop_name
      WHERE appointments.date_time > NOW() AND appointments.shop_name = ?
      ORDER BY appointments.date_time ASC
    `;

  connection.query(query, [username], (err, results) => {
    if (err) {
      console.error("Error fetching appointments:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    res.json({ data: results });
  });
});
app.get("/get_chat_heads_shop", (req, res) => {
  const username = req.query.username;
  const query = `
      SELECT 
        t_user.username AS username1,
        t_user.name AS name1
      FROM messages
      JOIN t_user ON t_user.username = 
        CASE 
          WHEN messages.sender = ? THEN messages.receiver 
          ELSE messages.sender 
        END
      WHERE messages.sender = ? OR messages.receiver = ? 
      GROUP BY username1, name1 
      ORDER BY MAX(messages.timestamp) DESC
    `;

  connection.query(query, [username, username, username], (err, results) => {
    if (err) {
      console.error("Error fetching chat heads:", err);
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }
    res.json({ chatHeads: results });
  });
});

app.get("/setShopdata_dash_shop", (req, res) => {
  const { user_id } = req.query;

  const sql = `
      SELECT 
        t_technician.shop_username, 
        t_technician.tech_qul,
        t_technician.tech_username,
        t_user.name 
      FROM 
        t_technician 
      INNER JOIN 
        t_user 
      ON 
        t_technician.tech_username = t_user.username 
      WHERE 
        t_technician.shop_username = ?
    `;

  connection.query(sql, [user_id], (err, result) => {
    if (err) {
      console.error("Error fetching overall rating from the database:", err);
      return res.status(500).send({ error: "Error fetching overall rating" });
    }

    if (result.length === 0) {
      return res.status(404).send({ error: "Shop not found" });
    }

    res.json({
      data: result,
    });
  });
});
app.delete("/deleteStaffItem", (req, res) => {
  const { tech_username } = req.query;

  const sql = `
      DELETE FROM 
        t_technician 
      WHERE 
        tech_username = ?
    `;

  connection.query(sql, [tech_username], (err, result) => {
    if (err) {
      console.error("Error deleting technician from the database:", err);
      return res.status(500).send({ error: "Error deleting technician" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).send({ error: "Technician not found" });
    }

    res.json({
      message: "Technician deleted successfully",
    });
  });
});

app.get('/messages/unread', (req, res) => {
  const { sender, receiver } = req.query;
  
  Message.find({ sender, receiver, read: false }, (err, messages) => {
    if (err) {
      return res.status(500).json({ error: 'Error fetching unread messages' });
    }
    res.json(messages);
  });
});

function getCounts(callback) {
  const query = `
      SELECT 
          (SELECT COUNT(*) FROM t_shop) AS total_shops,
          (SELECT COUNT(*) FROM t_technician) AS total_technicians,
          (SELECT COUNT(*) FROM t_user) AS total_users;
  `;

  connection.query(query, (error, results) => {
      if (error) {
          return callback(error);
      }
      callback(null, results[0]);
  });
}

app.get('/api/counts', (req, res) => {
  getCounts((error, counts) => {
      if (error) {
          console.error('Error fetching counts:', error);
          return res.status(500).json({ error: 'Database error' });
      }
      res.json(counts);
  });
});

// Read appointments
app.get('/admin/appointments', (req, res) => {
  const searchQuery = req.query.search || '';

  const sql = `
    SELECT * FROM appointments
    WHERE username LIKE ? OR shop_name LIKE ? OR description LIKE ?
  `;
  
  connection.query(sql, [`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`], (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

// Create appointment
app.post('/admin/appointments', (req, res) => {
  const { username, shop_name, date_time, description } = req.body;

  const sql = `
    INSERT INTO appointments (username, shop_name, date_time, description)
    VALUES (?, ?, ?, ?)
  `;

  connection.query(sql, [username, shop_name, date_time, description], (err, result) => {
    if (err) {
      res.json({ success: false, message: 'Failed to add appointment' });
      throw err;
    }
    res.json({ success: true, message: 'Appointment added successfully' });
  });
});

app.put('/admin/appointments/:username/:shop_name/:date_time', (req, res) => {
  const { username, shop_name, date_time } = req.params;
  const { description } = req.body;

  //console.log('Received:', { username, shop_name, date_time, description });

  if (!description) {
    return res.status(400).json({ success: false, message: 'Description is required' });
  }

  const formattedDateTime = moment(date_time).format('YYYY-MM-DD HH:mm:ss');

  //console.log('Formatted Date-Time:', formattedDateTime);

  const sql = 'UPDATE appointments SET description = ? WHERE username = ? AND shop_name = ? AND date_time = ?';

  //console.log('Executing SQL:', { sql, parameters: [description, username, shop_name, formattedDateTime] });

  connection.query(sql, [description, username, shop_name, formattedDateTime], (err, results) => {
    if (err) {
      console.error('Error executing SQL:', err.message);
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    res.json({ success: true });
  });  
});

// Delete appointment
app.delete('/admin/appointments/:username/:shop_name/:date_time', (req, res) => {
  const { username, shop_name, date_time } = req.params;

  const formattedDateTime = moment(date_time).format('YYYY-MM-DD HH:mm:ss');

  const sql = 'DELETE FROM appointments WHERE username = ? AND shop_name = ? AND date_time = ?';

  connection.query(sql, [username, shop_name, formattedDateTime], (err, results) => {
    if (err) throw err;
    res.json({ success: true });
  });
});

// Read comments
app.get('/admin/comments', (req, res) => {
  const searchQuery = req.query.search ? `%${req.query.search}%` : '%';
  const sql = `
    SELECT * FROM comments 
    WHERE person_id LIKE ? 
    OR shop_id LIKE ? 
    OR comment LIKE ?
  `;
  connection.query(sql, [searchQuery, searchQuery, searchQuery], (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

// Create comment
app.post('/admin/comments', (req, res) => {
  const { person_id, shop_id, comment } = req.body;
  const sql = 'INSERT INTO comments (person_id, shop_id, comment) VALUES (?, ?, ?)';
  connection.query(sql, [person_id, shop_id, comment], (err, results) => {
    if (err) throw err;
    res.json({ success: true });
  });
});

// Update comment
app.put('/admin/comments/:id', (req, res) => {
  const { id } = req.params;
  const { person_id, shop_id, comment } = req.body;

  if (!person_id || !shop_id || !comment) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  const sql = 'UPDATE comments SET person_id = ?, shop_id = ?, comment = ? WHERE id = ?';
  connection.query(sql, [person_id, shop_id, comment, id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    if (results.affectedRows > 0) {
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, message: 'Comment not found' });
    }
  });
});

// Delete comment
app.delete('/admin/comments/:id', (req, res) => {
  const { id } = req.params;

  const sql = 'DELETE FROM comments WHERE id = ?';
  connection.query(sql, [id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    if (results.affectedRows > 0) {
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, message: 'Comment not found' });
    }
  });
});

// Read messages
app.get('/admin/messages', (req, res) => {
  const search = req.query.search || '';
  const sql = `SELECT * FROM messages WHERE sender LIKE ? OR receiver LIKE ? OR message LIKE ?`;
  const values = [`%${search}%`, `%${search}%`, `%${search}%`];
  
  connection.query(sql, values, (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});


// Create message
app.post('/admin/messages', (req, res) => {
  const { sender, receiver, message } = req.body;
  const sql = 'INSERT INTO messages (sender, receiver, message) VALUES (?, ?, ?)';
  connection.query(sql, [sender, receiver, message], (err, results) => {
      if (err) throw err;
      res.json({ success: true });
  });
});

// Update message
app.put('/admin/messages/:id', (req, res) => {
  const { id } = req.params;
  const { sender, receiver, message } = req.body;
  const sql = 'UPDATE messages SET sender = ?, receiver = ?, message = ? WHERE id = ?';
  connection.query(sql, [sender, receiver, message, id], (err, results) => {
    if (err) throw err;
    if (results.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }
    res.json({ success: true });
  });
});

// Delete message
app.delete('/admin/messages/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM messages WHERE id = ?';
  connection.query(sql, [id], (err, results) => {
    if (err) throw err;
    res.json({ success: true });
  });
});

// Read reviews
app.get('/admin/reviews', (req, res) => {
  const searchQuery = req.query.search || '';
  let sql = 'SELECT * FROM reviews';

  if (searchQuery) {
    sql += ' WHERE person_id LIKE ? OR shop_id LIKE ?';
  }

  connection.query(sql, [`%${searchQuery}%`, `%${searchQuery}%`], (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});


// Create a new review
app.post('/admin/reviews', (req, res) => {
  const { person_id, shop_id, stars, comment } = req.body;
  const sql = 'INSERT INTO reviews (person_id, shop_id, stars, comment) VALUES (?, ?, ?, ?)';
  connection.query(sql, [person_id, shop_id, stars, comment], (err, result) => {
    if (err) throw err;
    res.json({ success: true });
  });
});

// Update an existing review
app.put('/admin/reviews/:person_id/:shop_id', (req, res) => {
  const { person_id, shop_id } = req.params;
  const { stars, comment } = req.body;
  const sql = 'UPDATE reviews SET stars = ?, comment = ? WHERE person_id = ? AND shop_id = ?';
  connection.query(sql, [stars, comment, person_id, shop_id], (err, result) => {
    if (err) throw err;
    res.json({ success: true });
  });
});

// Delete a review
app.delete('/admin/reviews/:person_id/:shop_id', (req, res) => {
  const { person_id, shop_id } = req.params;
  const sql = 'DELETE FROM reviews WHERE person_id = ? AND shop_id = ?';
  connection.query(sql, [person_id, shop_id], (err, result) => {
    if (err) throw err;
    res.json({ success: true });
  });
});

// Read shops
app.get('/admin/shops', (req, res) => {
  let sql = 'SELECT * FROM t_shop';
  const params = [];

  if (req.query.shop_name) {
    sql += ' WHERE shop_name LIKE ?';
    params.push(`%${req.query.shop_name}%`);
  } else if (req.query.owner_username) {
    sql += ' WHERE owner_username LIKE ?';
    params.push(`%${req.query.owner_username}%`);
  }

  connection.query(sql, params, (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});


// Create a new shop
app.post('/admin/shops', (req, res) => {
  const { owner_username, shop_name, name, shop_email, contactnum, shop_type, shop_des, latitude, longitude} = req.body;

  const sql = `
    INSERT INTO t_shop 
    (owner_username, shop_name, name, shop_email, contactnum, shop_type, shop_des, latitude, longitude) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE 
    name = VALUES(name), 
    shop_email = VALUES(shop_email), 
    contactnum = VALUES(contactnum), 
    shop_type = VALUES(shop_type), 
    shop_des = VALUES(shop_des), 
    latitude = VALUES(latitude), 
    longitude = VALUES(longitude);
`;


  connection.query(sql, [owner_username, shop_name, name, shop_email, contactnum, shop_type, shop_des, latitude, longitude], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    res.json({ success: true });
  });
});


// Update a shop
app.put('/admin/shops/:owner_username/:shop_name', (req, res) => {
  const { owner_username, shop_name } = req.params;
  const { name, shop_email, contactnum, shop_type, shop_des, latitude, longitude, overall_rating, password, profilePic } = req.body;

  const sql = 'UPDATE t_shop SET name = ?, shop_email = ?, contactnum = ?, shop_type = ?, shop_des = ?, latitude = ?, longitude = ?, overall_rating = ?, password = ?, profilePic = ? WHERE owner_username = ? AND shop_name = ?';

  connection.query(sql, [name, shop_email, contactnum, shop_type, shop_des, latitude, longitude, overall_rating, password, profilePic, owner_username, shop_name], (err, results) => {
    if (err) {
      console.error('Error executing SQL:', err.message);
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }
    res.json({ success: true });
  });
});

// Delete a shop
app.delete('/admin/shops/:owner_username/:shop_name', (req, res) => {
  const { owner_username, shop_name } = req.params;

  const sql = 'DELETE FROM t_shop WHERE owner_username = ? AND shop_name = ?';

  connection.query(sql, [owner_username, shop_name], (err, results) => {
    if (err) throw err;
    res.json({ success: true });
  });
});

// Read technicians
app.get('/admin/technicians', (req, res) => {
  const search = req.query.search;
  let sql = 'SELECT * FROM t_technician';
  if (search) {
    sql += ' WHERE tech_username LIKE ? OR shop_username LIKE ?';
  }

  connection.query(sql, [`%${search}%`, `%${search}%`], (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});


// Create a new technician
app.post('/admin/technicians', (req, res) => {
  const { shop_username, tech_username, tech_des, tech_qul } = req.body;
  const sql = 'INSERT INTO t_technician (shop_username, tech_username, tech_des, tech_qul) VALUES (?, ?, ?, ?)';
  connection.query(sql, [shop_username, tech_username, tech_des, tech_qul], (err, results) => {
    if (err) throw err;
    res.json({ success: true });
  });
});

// Update a technician
app.put('/admin/technicians/:tech_username', (req, res) => {
  const { tech_username } = req.params;
  const { shop_username, tech_des, tech_qul } = req.body;

  const sql = 'UPDATE t_technician SET shop_username = ?, tech_des = ?, tech_qul = ? WHERE tech_username = ?';

  connection.query(sql, [shop_username, tech_des, tech_qul, tech_username], (err, results) => {
    if (err) {
      console.error('Error executing SQL:', err.message);
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Technician not found' });
    }
    res.json({ success: true });
  });
});

// Delete a technician
app.delete('/admin/technicians/:tech_username', (req, res) => {
  const { tech_username } = req.params;

  const sql = 'DELETE FROM t_technician WHERE tech_username = ?';

  connection.query(sql, [tech_username], (err, results) => {
    if (err) throw err;
    res.json({ success: true });
  });
});

// Read users
app.get('/admin/users', (req, res) => {
  const search = req.query.search || ''; 
  const sql = `
      SELECT * FROM t_user
      WHERE name LIKE ? 
      OR username LIKE ? 
      OR email LIKE ? 
      OR contactnum LIKE ? 
      OR type LIKE ?
  `;
  const searchTerm = `%${search}%`;

  connection.query(sql, [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm], (err, results) => {
      if (err) throw err;
      res.json(results);
  });
});


// Create a new user
app.post('/admin/users', (req, res) => {
  const { name, username, email, contactnum, latitude, longitude, password, profilePic } = req.body;
  const sql = 'INSERT INTO t_user (name, username, email, contactnum, latitude, longitude, password, profilePic) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
  connection.query(sql, [name, username, email, contactnum, latitude, longitude, password, profilePic], (err, results) => {
    if (err) throw err;
    res.json({ success: true });
  });
});

// Update a user
app.put('/admin/users/:username', (req, res) => {
  const { username } = req.params;
  const { name, email, contactnum, latitude, longitude, password, profilePic } = req.body;

  const sql = 'UPDATE t_user SET name = ?, email = ?, contactnum = ?, latitude = ?, longitude = ?, password = ?, profilePic = ? WHERE username = ?';

  connection.query(sql, [name, email, contactnum, latitude, longitude, password, profilePic, username], (err, results) => {
    if (err) {
      console.error('Error executing SQL:', err.message);
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true });
  });
});

// Delete a user
app.delete('/admin/users/:username', (req, res) => {
  const { username } = req.params;

  const sql = 'DELETE FROM t_user WHERE username = ?';

  connection.query(sql, [username], (err, results) => {
    if (err) throw err;
    res.json({ success: true });
  });
});
