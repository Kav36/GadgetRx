const express = require("express");
const mysql = require("mysql");
const bodyParser = require("body-parser");
const session = require("express-session");
const path = require("path");
const multer = require("multer");
const cors = require("cors");
const csvParser = require("csv-parser");
const dotenv = require("dotenv");
const stream = require("stream");
const request = require("request");
const cheerio = require("cheerio");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const fs = require("fs");
const Pusher = require("pusher");
const { body, validationResult } = require("express-validator");

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
    cb(null, "data/uploads/");
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
  res.sendFile(path.join(__dirname, "html/index.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "html/signin.html"));
});

app.get("/signup_user.html", (req, res) => {
  res.sendFile(path.join(__dirname, "html/signup_user.html"));
});

const generateOTP = () => Math.floor(1000 + Math.random() * 9000);

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.send(
      '<script>alert("Please enter email and password!"); window.location.href="/";</script>'
    );
  }

  connection.query(
    "SELECT * FROM t_user WHERE email = ?",
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
      }

      const storedPassword = results[0].password;
      try {
        const passwordMatch = await bcrypt.compare(password, storedPassword);

        if (!passwordMatch) {
          return res.send(
            '<script>alert("Incorrect email or password!"); window.location.href="/login";</script>'
          );
        }

        req.session.loggedin = true;
        req.session.userId = results[0].id; // Store user ID in the session for further use

        return res.redirect("html/dashboard_user.html");
      } catch (bcryptError) {
        console.error("Error comparing passwords:", bcryptError);
        return res.status(500).send("Internal server error");
      }
    }
  );
});

app.post("/signup_shop", async (req, res) => {
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
    otp,
  } = req.body;

  if (
    !owner_username ||
    !shop_name ||
    !name ||
    !shop_email ||
    !contactnum ||
    !shop_type ||
    !shop_des ||
    !latitude ||
    !longitude ||
    !password ||
    !otp
  ) {
    return res.status(400).json({ message: "One or more fields are empty!" });
  }

  try {
    const otpVerification = await verifyOTPFromDatabase(shop_email, otp);
    if (!otpVerification) {
      return res.status(400).json({ message: "Invalid OTP!" });
    }

    const shopExists = await checkUserExistsByEmail_shop(shop_email);
    if (shopExists) {
      return res.status(400).json({ message: "Email already exists!" });
    }

    const userExists1 = await checkUserExists_person(shop_email);
    if (userExists1) {
      return res.status(400).json({ message: "Already used email!" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    connection.query(
      "INSERT INTO t_shop (owner_username, shop_name, name, shop_email, contactnum, shop_type, shop_des, latitude, longitude, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE owner_username = VALUES(owner_username), shop_name = VALUES(shop_name), name = VALUES(name), shop_email = VALUES(shop_email), contactnum = VALUES(contactnum), shop_type = VALUES(shop_type), shop_des = VALUES(shop_des), latitude = VALUES(latitude), longitude = VALUES(longitude), password = VALUES(password);",
      [
        owner_username,
        shop_name,
        name,
        shop_email,
        contactnum,
        shop_type,
        shop_des,
        latitude,
        longitude,
        hashedPassword,
      ],
      (err) => {
        if (err) {
          console.error("Failed to save shop details:", err);
          return res
            .status(400)
            .json({ message: "Failed to save shop details" });
        }
        return res.status(400).json({ message: "Sign up successful" });
      }
    );
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

app.post("/signup_user", async (req, res) => {
  const {
    name,
    username,
    email,
    contactnum,
    latitude,
    longitude,
    password,
    otp,
  } = req.body;

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
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const query = `
            INSERT INTO t_user (name, username, email, contactnum, latitude, longitude, password)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                username = VALUES(username),
                contactnum = VALUES(contactnum),
                latitude = VALUES(latitude),
                longitude = VALUES(longitude),
                password = VALUES(password)
        `;

    connection.query(
      query,
      [name, username, email, contactnum, latitude, longitude, hashedPassword],
      (err, results) => {
        if (err) {
          console.error("Failed to save user details:", err);
          return res
            .status(500)
            .json({ message: "Failed to save user details" });
        }
        return res.status(200).json({ message: "Sign up successful" });
      }
    );
  } catch (error) {
    console.error("Error during user signup:", error);
    return res.status(500).json({ message: "Failed to save user details" });
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

app.post("/forget_pw", async (req, res) => {
  const { email, password, otp } = req.body;

  if (!email || !password || !otp) {
    return res.status(400).json({ message: "One or more fields are empty!" });
  }

  try {
    const userExists = await checkUserExistsByEmail_person(email);
    if (!userExists) {
      return res.status(400).json({ message: "Email does not exist!" });
    }
    const otpVerification = await verifyOTPFromDatabase(email, otp);

    if (!otpVerification) {
      return res.status(400).json({ message: "Invalid OTP!" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const query = `
            UPDATE t_user SET password = ? WHERE email = ?
        `;

    connection.query(query, [hashedPassword, email], (err, results) => {
      if (err) {
        console.error("Failed to update user details:", err);
        return res
          .status(500)
          .json({ message: "Failed to update user details" });
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

// Route to load rating based on person ID and shop ID
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
    "SELECT id, person_id, comment, created_at FROM comments WHERE shop_id = ? ORDER BY created_at DESC";
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
        SELECT t_user.name, t_technician.tech_des, t_technician.tech_qul  
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
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
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

  const query = "SELECT * FROM t_shop WHERE shop_type LIKE ? OR shop_des LIKE ? OR shop_name LIKE ?";
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
      shopsWithDistance = shopsWithDistance.filter(shop => shop.distance <= distance);
    }
    if (!skipRatings) {
      shopsWithDistance = shopsWithDistance.filter(shop => shop.overall_rating >= rating);
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
      latitude: shop.latitude
    });
  });
});

// Create a new appointment
app.post('/appointments', (req, res) => {
  const { username, date_time, description, shop_name } = req.body;

  if (!username || !date_time || !description || !shop_name) {
    res.status(400).json({ error: 'All fields are required' });
    return;
  }

  const checkQuery = 'SELECT * FROM appointments WHERE date_time = ? AND shop_name = ?';
  connection.query(checkQuery, [date_time, shop_name], (err, results) => {
    if (err) {
      console.error('Failed to check for existing appointment:', err);
      res.status(500).json({ error: 'Failed to check for existing appointment', details: err });
      return;
    }

    if (results.length > 0) {
      res.status(400).json({ error: 'Time slot already booked' });
      return;
    }

    const query = 'INSERT INTO appointments (username, date_time, description, shop_name) VALUES (?, ?, ?, ?)';
    connection.query(query, [username, date_time, description, shop_name], (err, result) => {
      if (err) {
        console.error('Failed to create appointment:', err);
        res.status(500).json({ error: 'Failed to create appointment', details: err });
        return;
      }
      res.status(201).json({ id: result.insertId });
    });
  });
});

// Get all appointments with user and shop details
app.get('/appointments', (req, res) => {
  const { date } = req.query;
  let query = 'SELECT * FROM appointments';
  const params = [];

  if (date) {
    query += ' WHERE DATE(date_time) = ?';
    params.push(date);
  }

  connection.query(query, params, (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Failed to fetch appointments', details: err });
      return;
    }
    res.status(200).json(results);
  });
});

// Get all appointments for a specific shop
app.get('/appointments/:shop_name', (req, res) => {
  const { shop_name } = req.params;
  const { date } = req.query;
  let query = 'SELECT * FROM appointments WHERE shop_name = ?';
  const params = [shop_name];

  if (date) {
    query += ' AND DATE(date_time) = ?';
    params.push(date);
  }

  connection.query(query, params, (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Failed to fetch appointments', details: err });
      return;
    }
    res.status(200).json(results);
  });
});

app.delete('/appointments/:username/:shop_name/:eventDateTime', (req, res) => {
    const { username, shop_name, eventDateTime } = req.params;
  
    const deleteQuery = 'DELETE FROM appointments WHERE username = ? AND shop_name = ?';
    
    connection.query(deleteQuery, [username, shop_name, eventDateTime], (err, result) => {
      if (err) {
        console.error('Failed to delete appointment:', err);
        res.status(500).json({ error: 'Failed to delete appointment', details: err });
        return;
      }
      res.status(200).json({ message: 'Appointment deleted successfully' });
    });
  });