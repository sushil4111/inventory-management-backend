const pool = require("../db/db");
const bcrypt = require("bcryptjs");
const jwt = require('jsonwebtoken');

exports.registerUser = async(req,res) =>{
    const { firstName,lastName,userName,email,password,role } = req.body;

    let connection
    try {
        if(!firstName){
            return res.status(400).json({
                message:'Please enter the first name'
            })
        }if(!lastName){
            return res.status(400).json({
                message:'Please enter the last name'
            })
        }if(!userName){
            return res.status(400).json({
                message:'Please enter user name'
            })
        }if(!email){
            return res.status(400).json({
                message:'Please enter your email'
            })
        }if(!password){
            return res.status(400).json({
                message:'Please enter your password'
            })
        }if(!role){
            return res.status(400).json({
                message:'Please enter your role'
            })
        }

        connection = await pool.getConnection()
        //check is the user exists or not
        const [user] = await connection.query(
            "SELECT email FROM users WHERE email = ?",
            [email]
        )
        if(user.length !=0){
            return res.status(409).json({
                message:'User already exists! Please Login'
            })
        }
        //hash the password
        const hashedPassword = await bcrypt.hash(password,10);

        //store in the database
        await connection.query(
            "INSERT INTO users (firstName,lastName,userName,email,password,role_id) VALUES(?,?,?,?,?,?)",
            [firstName,lastName,userName,email,hashedPassword,role]
        )
        return res.status(201).json({
            message: 'User registered successfully'
        });
    } catch (error) {
        console.log('failed to register the new user');
        return res.status(500).json(error.message);
    }finally{
        if (connection) connection.release();
    }
}

exports.loginUser = async(req,res) =>{
    const { email,password,role_id } = req.body;
    let connection

    try {
        if(!email){
            return res.status(404).json({message:'Email is required'})
        }
        if(!password){
            return res.status(404).json({message:'Password is required'});
        }
        if(!role_id){
            return res.status(404).json({message:'Role Id is required'});
        }
        
        connection = await pool.getConnection()
        
        //check if user already exists or not
        const [user] = await connection.query(
            "SELECT id FROM users WHERE email = ? OR role_id = ?",
            [email,role_id]
        )
        if (user.length === 0) {
          return res
            .status(401)
            .json({ message: "Invalid email/mobile or password" });
        }
        const userData = user[0]

        //verify password
        const isPasswordValid = await bcrypt.compare(password,userData.password);
        if (!isPasswordValid) {
          return res
            .status(401)
            .json({ message: "Invalid email/mobile or password" });
        }

        //create jwt token
        const token = jwt.sign(
            {
                id:userData.id,
                email:userData.email,
                role_id:userData.password
            },
            process.env.JWT_SECRET,
            { expiresIn:'24h' }
        )
        res.status(200).json({
            token,
            user:{
                id:userData.id,
                email:userData.email,
                role_id:userData.role_id
            }
        })
    } catch (error) {
        console.log('failed to login the user',error.message);
        return res.status(500).json(error.message);
    }finally{
        if(connection){
            connection.release();
        }
    }
}

