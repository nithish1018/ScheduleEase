const { request } = require('express')
const express = require('express')
const app=express();
app.set("view engine", "ejs");

app.get("/",(request,response)=>{
    response.render("index")
})
module.exports = app;