const bodyParser = require('body-parser');
const cookieParser=require('cookie-parser');
const multer=require('multer');
const express=require('express');
const app=express(); 
var mysql=require('mysql');
var session= require('express-session');
var cors=require('cors');
app.set("viewengine","ejs");
var saltRounds=10;
var constants= require("./config.json");
app.use(express.json());
app.use(bodyParser.json());
const jwt=require('jsonwebtoken');
const bcrypt=require('bcrypt');

var storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, '../uploads')
    },
    filename: (req, file, cb)=>{
        const mimeExtension={
            'image/jpeg' : '.jpeg',
            'image/jpg' : '.jpg',
            'image/png' : '.png',

        }
        cb(null,file.fieldname +'-'+Date.now()+mimeExtension[file.mimetype]);
    }
})
 
var upload = multer({ 
    storage: storage,
    fileFilter:(req,file,cb)=>{
        if(file.mimetype=='image/jpeg'||
       file.mimetype=='image/jpg'||
       file.mimetype=='image/png'){
       cb(null,true);
}else{
    cb(null,false);
    req.fileError="File format not valid";
} 
}
})

app.use(cors({origin:constants.frontend, 
    methods:['GET','POST'],
    credentials:true}));
    app.use(cookieParser());
    app.use(bodyParser.urlencoded({extended:true}));
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    );
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST,PUT,DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers');
    res.setHeader('Cache-Control', 'no-cache');
    next();
  });
app.use(session({
    key:"userID",
    secret: 'etsyback',
    resave: false,
    saveUninitialized : false,
    duration : 60*60*1000,
    activeDuration : 5*60*1000,
    cookie:{
        expires: 60*60*24,
   
    },
}));
var dbConnection=mysql.createPool({
    host :constants.DB.host,
    user : constants.DB.username,
    password : constants.DB.password,
    port : constants.DB.port,
    database : constants.DB.database,
});
const passport=require('passport');
require('./config/passport');
app.use(passport.initialize());



dbConnection.getConnection((err)=>
{
    if(err)
    {
        throw 'error occured'+ err;
    }
    console.log("pool created");
});

app.post('/register',(req,res)=>{
    
    const username=req.body.username
    const password=req.body.password
    const emailid= req.body.emailid
    bcrypt.hash(password,saltRounds,(err,hash) =>{
    
        if(err){
            console.log(err);
        }
    dbConnection.query("INSERT INTO login (emailid,name,password) VALUES (?,?,?)",
    [emailid,username,hash],
    (err,result) =>{
        console.log(err);
        res.send(result);
    })
    console.log("db insertion");
})
})



 app.get("/login",(req,res)=>{
     if(req.session.user){
         res.send({loggedIn: true, user: req.session.user})
     }
     else{
         res.send({loggedIn:false});
     }
 })   
app.post("/login",(req,res) =>
{
    
    const emailid_login=req.body.emailid;
    const password_login=req.body.password;
    
    dbConnection.query(
        "SELECT * FROM login WHERE emailid= ?" ,
        [emailid_login],
        (err, result) => {

            if(result.length > 0){
                console.log(result);
                
                bcrypt.compare(password_login,result[0].password,(error,response) =>{
                    if(response){
                         const payload={
                            username:result[0].name,
                            id:result[0].id,
                            emailid:result[0].emailid
                        }
                        
                        req.session.user=result;
                        const accessToken=jwt.sign(payload, "CMPE273", { expiresIn : "1d"})
                        
                        res.send(
                            {success: true,
                            
                            token: "Bearer "+accessToken}
                        )
                    }else{
                        res.send({message: "Wrong usename/password combination"});

                    }
                });
            }else{
                res.send({message:"User doesn't exist"});
            }

            
            
        })
        console.log("user found");
  
    
})


var landingpage = require('./src/routes/landingpage.js');
app.get('/protected', passport.authenticate('jwt', {session:false}),(req,res)=>
 res.status(200).send({
     success:true,
     user:{
        email: req.user.name,
        id:req.user.id
     }
 }))
 app.post('/getProducts',(req,res)=>{
     let limit=req.body.limit? parseInt(req.body.limit):100;
     let skip=parseInt(req.body.skip);
    
     dbConnection.query("SELECT * FROM products LIMIT ?,?",[skip,limit],
     (err,result) =>{
         console.log(result);
         if(err){

             res.status(400).json({success:false, err})
         }else{

             res.status(200).json({ success:true, result , postSize:result.length})
         }
     })
 }
 )

 app.post('/getShopName',(req,res) =>{
     let shop_name=req.body.shopname
     console.log(shop_name)
    dbConnection.query("SELECT * FROM products WHERE shopname = ?",
    [shop_name],
    (err,result) => {
        console.log(result);
        if(result.length>0){
            res.json({message:"NotAvailable"})
        }else{
            res.status(200).json({message:"Available"})
        }
    })
 })
 app.post('/addShop',(req,res) =>{
    let shop_name=req.body.shopname
    let emailid="ramya"
    dbConnection.query("UPDATE login SET shopname= ? where emailid=?",[shop_name,emailid],
    (err,result) =>{
        if(err){
            res.send("adding shop failed")
        }
        else{
            res.send("success")
        }
    })
 })

 app.post('/uploadImage',upload.single('files'), (req,res) =>{
    if(!req.file){
        console.log("No file uploaded");
    
    }else{
        console.log(req.file.filename)
        var imgsrc='http://localhost:5000/uploads'+req.file.filename

        console.log(imgsrc);
        dbConnection.query("INSERT INTO products (image) VALUES=? where productid=1001?",[imgsrc],
        (err,result)=>{
            console.log(result);
            if(err){
                res.json({success:false});
            }else{
                res.send({success:true})
            }
        })
    }


 })

//app.use(basePath,landingpage);s
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});



