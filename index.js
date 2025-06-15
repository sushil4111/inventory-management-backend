const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes')

dotenv.config({});

require("./db/db")
const app = express();

app.use(cors({
  origin:"*",
  methods: ["GET", "POST","PATCH","PUT"], 
  credentials:true
}))

app.use(express.json());

app.post('/',async(req,res)=>{
    res.send("Hello inventory backend");
})

//api
app.use('/auth',authRoutes);


const PORT = process.env.PORT
app.listen(PORT,()=>{
    console.log(`server is running at port ${PORT}`)
})