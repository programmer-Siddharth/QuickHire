// Here we define sign up schema for Job provider.

let mongoose = require('mongoose');

let Employer_SignUp_Schema = new mongoose.Schema({
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
    }
})

let Post_Job_Schema = new mongoose.Schema({
    Employer_ref: {
        type:mongoose.Schema.Types.ObjectId,
        ref:'Employers'
    },
    Company_Name: {
        type: String,
        required: true
    },
    Post_Vacant: {
        type: String,
        required: true
    },
    Mobile_Number: {
        type: Number,
        required: true
    },
    Salary: {
        type: String,
        required:true
    },
    Education_Required: {
        type: String,
        default:'Not Provided'
    },
    Place: {
        type: String,
        required: true
    },
    City:{
        type:String,
        required:true
    },
    Work_Desc:{
        type:String,
        default:'Not Provided'
    },
    Applicants:[],
    Date:{
        type:String
    }

})


module.exports = {
    Employer_SignUp: mongoose.model('Employers', Employer_SignUp_Schema),
    Post_Job: mongoose.model('Job Posts',Post_Job_Schema)
}
