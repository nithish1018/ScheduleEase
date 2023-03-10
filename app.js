/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
const { request } = require('express')
const express = require('express')
const app=express();
app.set("view engine", "ejs");

app.get("/",(request,response)=>{
    response.render("index")
})
// eslint-disable-next-line no-undef
module.exports = app;