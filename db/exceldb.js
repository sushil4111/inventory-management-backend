const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

const financePool = mysql.createPool({
  host: process.env.FIN_DB_HOST,     
  user: process.env.FIN_DB_USER,
  password: process.env.FIN_DB_PASS,
  database: process.env.FIN_DB_NAME,                       
});

const testFinanceConnection = async () => {
  try {
    const [rows] = await financePool.promise().query("SELECT NOW()");
    console.log("Excel DB connected:", rows[0]["NOW()"]);
  } catch (error) {
    console.error("Excel DB connection failed:", error);
    process.exit(1);
  }
};

testFinanceConnection();
module.exports = financePool.promise();
