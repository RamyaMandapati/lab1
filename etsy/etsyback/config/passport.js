
var constants= require("../config.json");
const passport=require('passport');
var JwtStrategy = require('passport-jwt').Strategy,
    ExtractJwt = require('passport-jwt').ExtractJwt;
const mysql=require('mysql');
var dbConnection=mysql.createPool({
        host :constants.DB.host,
        user : constants.DB.username,
        password : constants.DB.password,
        port : constants.DB.port,
        database : constants.DB.database,
    });
    
    dbConnection.getConnection((err)=>
    {
        if(err)
        {
            throw 'error occured'+ err;
        }
        
    })
module.exports = function(passport) {
console.log("in passport function...")
var opts = {}
opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
opts.secretOrKey = 'CMPE273';

passport.use(new JwtStrategy(opts, function(jwt_payload, callback) {
    console.log("JWT payload:", jwt_payload._email);
    dbConnection.query("SELECT name from login WHERE emailid=? AND active=1", [jwt_payload.emailid], function(err, rowsOfTable){
        if(err || rowsOfTable.length != 1) {
            console.log(err);
            console.log("UnAuthorized User")
            callback("Not valid token", false)
        } else {
            console.log("user is authorized")
            callback(null, jwt_payload);
        }
    })
}));
}

