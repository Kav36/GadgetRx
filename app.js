const express = require('express');
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
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const fs = require('fs');
const { body, validationResult } = require("express-validator");

dotenv.config();
const config = JSON.parse(fs.readFileSync('./config.json'));
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
app.use(express.static('public'));
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
const generateOTP = () => Math.floor(1000 + Math.random() * 9000);

app.post('/signup_shop', async (req, res) => {
    const { owner_username, name, shop_email, contactnum, shop_type, shop_des, latitude, longitude, password, otp } = req.body;

    try {
        const otpVerification = await verifyOTPFromDatabase(shop_email, otp);

        if (!otpVerification) {
            return res.status(400).send('<script>alert("Invalid OTP!");</script>');
        }

        const userExists = await checkUserExists_person(owner_username);

        if (!userExists) {
            return res.status(400).send('<script>alert("Invalid mail for owner!");</script>');
        }

        const shopExists = await checkUserExistsByEmail_shop(shop_email);

        if (shopExists) {
            return res.status(400).send('<script>alert("Email for shop exsits!");</script>');
        }

        connection.query('INSERT INTO t_shop (owner_username, name, shop_email, contactnum, shop_type, shop_des, latitude, longitude, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)  ON DUPLICATE KEY UPDATE owner_email = VALUES(owner_email), name = VALUES(name), shop_email = VALUES(shop_email), contactnum = VALUES(contactnum), shop_type = VALUES(shop_type), shop_des = VALUES(shop_des), latitude = VALUES(latitude), longitude = VALUES(longitude), password = VALUES(password);', [owner_email, name, shop_email, contactnum, shop_type, shop_des, latitude, longitude, hashedPassword], (err, results) => {
            if (err) {
                console.error('Failed to save shop details:', err);
                return res.status(500).send('<script>alert("Failed to save shop details");</script>');
            }
            console.log('Shop details saved successfully');
            return res.status(200).json({ message: "Sign up successful" });
        });
    } catch (error) {
        console.error('Error during signup:', error);
        return res.status(500).send('<script>alert("Failed to save shop details");</script>');
    }
});

const verifyOTPFromDatabase = (email, otp) => {
    return new Promise((resolve, reject) => {
        connection.query('SELECT * FROM otp_table WHERE email = ? AND otp = ? AND timeout > NOW()', [email, otp], (err, results) => {
            if (err) {
                return reject(err);
            }
            resolve(results.length > 0);
        });
    });
};

const checkUserExistsByEmail_person = (email) => {
    return new Promise((resolve, reject) => {
        connection.query('SELECT email FROM t_user WHERE email = ?', [email], (err, results) => {
            if (err) {
                return reject(err);
            }

            resolve(results.length > 0);
        });
    });
};

const checkUserExists_person = (username) => {
    return new Promise((resolve, reject) => {
        connection.query('SELECT email FROM t_user WHERE username = ?', [username], (err, results) => {
            if (err) {
                return reject(err);
            }

            resolve(results.length > 0);
        });
    });
};

const checkUserExistsByEmail_shop = (email) => {
    return new Promise((resolve, reject) => {
        connection.query('SELECT shop_email FROM t_shop WHERE email = ?', [email], (err, results) => {
            if (err) {
                return reject(err);
            }

            resolve(results.length > 0);
        });
    });
};

app.post('/sendOTP_shop', async (req, res) => {
    const { email } = req.body;

    try {
        const shopExists = await checkUserExistsByEmail_shop(email);
        if (shopExists) {
            return res.status(400).send('<script>alert("Email for shop exsits!");</script>');
        }

        const otp = generateOTP();
        const otpTimeout = new Date();
        otpTimeout.setMinutes(otpTimeout.getMinutes() + 30);

        const mailOptions = {
            from: config.email.user,
            to: email,
            subject: 'One-Time Password (OTP) for Email Verification',
            text: `Dear User,
    
    Thank you for taking the time to verify your email address with us. To proceed with your registration, please use the following One-Time Password (OTP):
    
    OTP: ${otp}
    
    Your security is our priority, and this OTP ensures that only authorized users gain access to our platform. Please enter the OTP within the specified time frame to complete the verification process successfully.
    
    For your security, please do not share this OTP with anyone. Our system is designed to protect your information, and sharing your OTP may compromise your account's security.
    
    If you did not initiate this request, or if you encounter any issues during the verification process, please contact our support team immediately for assistance.
    
    Thank you for choosing us. We look forward to serving you.
    
    Best regards,
    Team GadgetSOS.`
        };

        connection.query('INSERT INTO otp_table (email, otp, timeout) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE otp=VALUES(otp), timeout=VALUES(timeout)', [email, otp, otpTimeout], (err, results) => {
            if (err) {
                console.error('Failed to store OTP in database:', err);
                return res.send('<script>alert("Error occurred! Please try again");</script>');
            }

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error('Failed to send OTP email:', error);
                    return res.send('<script>alert("Failed to send OTP email");</script>');
                }
                console.log('Email sent:', info.response);
                return res.send('<script>alert("OTP sent successfully!");</script>');
            });
        });
    } catch (error) {
        console.error('Error during sending OTP:', error);
        return res.send('<script>alert("Internal Server Error");</script>');
    }
});

app.post('/signup_technician', async (req, res) => {
    const { shop_email, tech_email, tech_des, shop_type } = req.body;

    try {
        const userExists = await checkUserExistsByEmail_person(tech_email);

        if (!userExists) {
            return res.status(400).send('<script>alert("Invalid email for technician!");</script>');
        }

        const shopExists = await checkUserExistsByEmail_shop(shop_email);

        if (!shopExists) {
            return res.status(400).send('<script>alert("Shop email does not exist!");</script>');
        }

        connection.query('INSERT INTO t_technician (shop_email, tech_email, tech_des, shop_type) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE tech_des = VALUES(tech_des), shop_type = VALUES(shop_type); ', [shop_email, tech_email, tech_des, shop_type], (techErr, techResults) => {
            if (techErr) {
                console.error('Failed to save technician details:', techErr);
                return res.status(500).send('<script>alert("Failed to save technician details");</script>');
            }
            console.log('Technician details saved successfully');
            return res.status(200).json({ message: "Sign up successful" });
        });
    } catch (error) {
        console.error('Error during technician signup:', error);
        return res.status(500).send('<script>alert("Failed to save technician details");</script>');
    }
});

app.post('/signup_user', async (req, res) => {
    const { name, username,email, contactnum, latitude, longitude, password, otp } = req.body;

    if (!name || !username ||!email || !contactnum || !latitude || !longitude || !password || !otp) {
        return res.status(400).send('<script>alert("One or more fields are empty!");</script>');
    }

    try {
        const userExists = await checkUserExistsByEmail_person(email);
        if (userExists) {
            return res.status(400).send('<script>alert("Email already exists!");</script>');
        }

        const userExists1 = await checkUserExists_person(username);
        if (userExists) {
            return res.status(400).send('<script>alert("Email already exists!");</script>');
        }
        connection.query('INSERT INTO t_user (name, username, email, contactnum, latitude, longitude, password, otp) VALUES (?, ?, ?, ?, ?, ?, ?,?) ON DUPLICATE KEY UPDATE name = VALUES(name), email = VALUES(email),contactnum = VALUES(contactnum), latitude = VALUES(latitude), longitude = VALUES(longitude), password = VALUES(password), otp = VALUES(otp)', [name, email, contactnum, latitude, longitude, password, otp], (err, results) => {
            if (err) {
                console.error('Failed to save user details:', err);
                return res.status(500).send('<script>alert("Failed to save user details");</script>');
            }
            console.log('User details saved successfully');
            return res.status(200).json({ message: "Sign up successful" });
        });
    } catch (error) {
        console.error('Error during user signup:', error);
        return res.status(500).send('<script>alert("Failed to save user details");</script>');
    }
});

app.post('/sendOTP_user', async (req, res) => {
    const { email } = req.body;

    try {
        const userExists = await checkUserExistsByEmail_person(_email);
        if (!userExists) {
            return res.status(400).send('<script>alert("Invalid mail for owner!");</script>');
        }

        const otp = generateOTP();
        const otpTimeout = new Date();
        otpTimeout.setMinutes(otpTimeout.getMinutes() + 30);

        const mailOptions = {
            from: config.email.user,
            to: email,
            subject: 'One-Time Password (OTP) for Email Verification',
            text: `Dear User,
    
    Thank you for taking the time to verify your email address with us. To proceed with your registration, please use the following One-Time Password (OTP):
    
    OTP: ${otp}
    
    Your security is our priority, and this OTP ensures that only authorized users gain access to our platform. Please enter the OTP within the specified time frame to complete the verification process successfully.
    
    For your security, please do not share this OTP with anyone. Our system is designed to protect your information, and sharing your OTP may compromise your account's security.
    
    If you did not initiate this request, or if you encounter any issues during the verification process, please contact our support team immediately for assistance.
    
    Thank you for choosing us. We look forward to serving you.
    
    Best regards,
    Team GadgetSOS.`
        };

        connection.query('INSERT INTO otp_table (email, otp, timeout) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE otp=VALUES(otp), timeout=VALUES(timeout)', [email, otp, otpTimeout], (err, results) => {
            if (err) {
                console.error('Failed to store OTP in database:', err);
                return res.send('<script>alert("Error occurred! Please try again");</script>');
            }

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error('Failed to send OTP email:', error);
                    return res.send('<script>alert("Failed to send OTP email");</script>');
                }
                console.log('Email sent:', info.response);
                return res.send('<script>alert("OTP sent successfully!");</script>');
            });
        });
    } catch (error) {
        console.error('Error during sending OTP:', error);
        return res.send('<script>alert("Internal Server Error");</script>');
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