const fs = require('fs');
const nodemon = require('nodemon');

const logFilePath = 'path/to/your/application/log/file.log'; // Specify the path to your application log file
const errorPattern = /ER_BAD_NULL_ERROR|ERR_HTTP_HEADERS_SENT/; // Customize the error pattern as needed

fs.watchFile(logFilePath, () => {
    const logContent = fs.readFileSync(logFilePath, 'utf8');
    if (errorPattern.test(logContent)) {
        console.log('Detected error in log file. Restarting nodemon...');
        nodemon.restart();
    }
});
