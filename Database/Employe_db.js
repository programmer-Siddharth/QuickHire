//Here we define employee sing in Schema.

const mongoose = require('mongoose');

const Employee_SignUp_Schema = new mongoose.Schema({
    Name: {
        type: String,
        required: true
    },
    Mobile_Number: {
        type: Number,
        required: true,
        unique: true
    },
    Password: {
        type: String,
        required: true
    },

});

let Employee_Detail_Schema = new mongoose.Schema({
    // Here we are creating employee reference so that we can save details belongs to any particular employee. 
    employee_ref:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Employees'
    },
    Name: {
        type: String,
        required: true
    },
    Mobile_Number: {
        type: Number,
        required: true,
        unique:false
    },
    Age: {
        type: Number,
        required: true
    },
    Email: {
        type: String,
        default:'Not Provided'
    },
    Education: {
        type:String,
        default:'Not Provided'
    },
    Profession: {
            type: String,
            default:'Not Provided'
        },
    Experience: {
            type: String,
            default:'Not Provided'
        },
    Applied:[],
    Applied_Dates:[]
})


module.exports = {
    Employee_SignUp: mongoose.model('Employees', Employee_SignUp_Schema),
    Employee_Detail: mongoose.model('Employees Detail', Employee_Detail_Schema)
};