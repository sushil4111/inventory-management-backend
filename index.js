const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes')
const excelRoute = require('./routes/excelRoutes');

dotenv.config({});

require("./db/db")
require("./db/exceldb");

const app = express();

app.use(cors({
  origin:"*",
  methods: ["GET", "POST","PATCH","PUT"], 
  credentials:true
}))

app.use(express.json());

app.get('/',async(req,res)=>{
    res.send("Hello inventory backend");
})

//api
app.use('/auth',authRoutes);
app.use('/api',excelRoute);


const PORT = process.env.PORT
app.listen(PORT,()=>{
    console.log(`server is running at port ${PORT}`)
})
// testing completed by sushil and ak