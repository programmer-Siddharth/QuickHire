const express = require('express');
const app = express();
const cors=require('cors');
require('dotenv').config();
const connectTomongo = require('./Database/db.js');
connectTomongo();
const employee=require('./Routers/Employee.js');
const employer=require('./Routers/Jobs_post.js');
app.use(cors())
app.use(express.json())

app.use('/employee',employee);
app.use('/PostJob',employer);

// Creating port;
app.listen(process.env.PORT,()=>{
    console.log(`Server started at port ${process.env.PORT}`);
});