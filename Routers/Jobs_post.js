const express = require('express');
const router = express.Router();
const { Employer_SignUp, Post_Job } = require('../Database/Job_db');
const { Employee_Detail } = require('../Database/Employe_db');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
let JWT_screte = 'Mywebsite';
const fetchuser = require('../middleware/fetchuser');
const unique_number = require('../Validator/MyValidator');
const otp_generator = require('otp-generator');

router.use(express.json());

router.post('/signup', [
    body('Name').trim().isLength({ min: 3 }).bail().withMessage('Name must contain at least 3 characters').matches('^[a-zA-Z ]+$').withMessage('Name must contain letters only'),
    body('Mobile_Number').trim().isLength({ min: 10, max: 10 }).bail().withMessage('Mobile number should be of 10 digits only').matches('[0-9]{10}').bail().withMessage('Mobile number should contain only digits').custom(value => {
        return unique_number(value, Employer_SignUp)
    }),
    body('Password').isLength({ min: 8, max: 20 }).bail().withMessage('Password length should be 8 to 20 characters only').matches('^[a-zA-Z ]+$').withMessage('Password must contain letters only')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.json({ errors: errors.array() });
    }
    try {
        const salt = await bcrypt.genSalt(10);
        const hashpassword = await bcrypt.hash(req.body.Password, salt);
        await Employer_SignUp.create({
            Name: req.body.Name,
            Mobile_Number: req.body.Mobile_Number,
            Password: hashpassword
        }).then((user) => {
            let data = {
                user: {
                    id: user.id
                }
            }
            const authToken = jwt.sign(data, JWT_screte)
            res.json({ authToken });
        });
    }
    catch (err) {
        return res.status(500).json({ InternalServerError: true });
    }
});

router.post('/login', [
    body('Mobile_Number').trim().isLength({ min: 10, max: 10 }).bail().withMessage('Mobile number must be 10 digits').matches('[0-9]{10}').bail().withMessage('Mobile Number should only be digit'),
    body('Password').isLength({ min: 8, max: 20 }).bail().withMessage('Password length should be 8 to 20 characters only').matches('^[a-zA-Z ]+$').withMessage('Password must contain letters only')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.json({ errors: errors.array() });
    }
    try {
        const employer = await Employer_SignUp.findOne({ Mobile_Number: req.body.Mobile_Number }).exec();
        if (!employer) {
            return res.json({ param: 'Mobile_Number', message: 'This Mobile number is not registered.Please Sign up first' });
        }
        let password_compare = await bcrypt.compare(req.body.Password, employer.Password);
        if (!password_compare) {
            return res.json({ param: "Password", message: 'Wrong Password' });
        };
        let data = {
            user: {
                id: employer.id
            }
        };
        const authToken = jwt.sign(data, JWT_screte)
        res.json({ authToken });
    } catch (err) {
        return res.status(500).json({ InternalServerError: true });
    }
})

router.post('/getuser', fetchuser, async (req, res) => {
    const employer_id = req.user.id;
    try {
        const user_data = await Employer_SignUp.findById(employer_id).select('-Password');
        if (user_data === null) {
            return res.json({ error: 'Invalid token' })
        }
        const user_posts = await Post_Job.find({ Employer_ref: employer_id }).select('-Employer_ref')
        return res.json({ user_data: user_data, user_posts: user_posts });
    } catch (err) {
        return res.status(500).json({ InternalServerError: true });
    }
});

router.post('/postjob', fetchuser, [
    body('Company_Name').trim().isLength({ min: 3 }).bail().withMessage('Company Name must contain at least 3 characters'),
    body('Post_Vacant').trim().isLength({ min: 3 }).bail().withMessage('Post Name must contain at least 3 characters'),
    body('Place').trim(),
    body('Salary').trim(),
    body('Education_Required').optional({ checkFalsy: true }),
    body('City').trim().isLength({ min: 3 }).bail().withMessage('City Name must contain at least 3 letters'),
    body('Work_Desc').optional({ checkFalsy:true}).trim().isLength({ max: 120 }).withMessage('Character limit is 120')
], async (req, res) => {
    const errors = validationResult(req);
    const employer_id = req.user.id;
    if (!errors.isEmpty()) {
        return res.json({ errors: errors.array() });
    }
    try {
        await Post_Job.create({
            Employer_ref: employer_id,
            Company_Name: req.body.Company_Name,
            Post_Vacant: req.body.Post_Vacant,
            Mobile_Number: req.body.Mobile_Number,
            Place: req.body.Place,
            Salary: req.body.Salary,
            Education_Required: req.body.Education_Required,
            City: req.body.City,
            Work_Desc: req.body.Work_Desc,
            Date: new Date().toDateString()
        }).then((user) => {
            res.json({ user })
        })
    }
    catch (err) {
        return res.status(500).json({ InternalServerError: true });
    }
})
router.delete('/deletepost', fetchuser, async (req, res) => {
    const post_id = req.body.postid;
    const employer_id = req.user.id;
    let applicants = req.body.applicants;
    try {
        let jobpost = await Post_Job.findById(post_id).select('Applicants');
        jobpost.Applicants.map(async (id) => {
            let employee_detail = await Employee_Detail.findOne({ employee_ref: id }).select('Applied Applied_Dates');
            employee_detail.Applied_Dates.splice(employee_detail.Applied.indexOf(post_id), 1);
            employee_detail.Applied.splice(employee_detail.Applied.indexOf(post_id), 1);
            employee_detail.save();
        })
        applicants = applicants.filter((value) => {
            return value.Company_id != post_id;
        })
        await Post_Job.findByIdAndDelete(post_id);
        const user_posts = await Post_Job.find({ Employer_ref: employer_id })//.select('-Job_Provider_ref');
        return res.json({ user_posts, applicants });
    }
    catch (err) {
        return res.status(500).json({ InternalServerError: true });
    }
})

router.post('/getapplicants', fetchuser, async (req, res) => {
    const employer_id = req.user.id;
    try {
        const jobposts = await Post_Job.find({ Employer_ref: employer_id }, '_id Company_Name Post_Vacant Applicants');
        let applicants = [];
        await Promise.all(jobposts.map(async (post) => {
            let applicants_data = { Company_Name: post.Company_Name, Post_Vacant: post.Post_Vacant, Company_id: post._id }
            return await Promise.all(post.Applicants.map(async (id) => {
                let applicant = await Employee_Detail.findOne({ employee_ref: id });
                let date = applicant.Applied_Dates[applicant.Applied.indexOf(post._id)]
                applicants_data = { ...applicants_data, _id: id, Name: applicant.Name, Age: applicant.Age, Education: applicant.Education, Profession: applicant.Profession, Experience: applicant.Experience, Mobile_Number: applicant.Mobile_Number,Email:applicant.Email, Date: date };
                applicants.push(applicants_data);
                return applicants_data;
            }))
        }))

        return res.json({ applicants });
    }
    catch (err) {
        return res.status(500).json({ InternalServerError: true });
    }
})

router.post('/removeapplicants', fetchuser, async (req, res) => {
    let employer_id = req.user.id;
    let employee_id = req.body.employee_id;
    let jobpost_id = req.body.jobpost_id;
    let applicants = req.body.applicants;
    let applicant_indx = req.body.applicant_indx;
    try {
        const jobpost = await Post_Job.findById(jobpost_id);
        const employeedetail = await Employee_Detail.findOne({ employee_ref: employee_id });
        jobpost.Applicants.splice(jobpost.Applicants.indexOf(employee_id), 1);
        employeedetail.Applied_Dates.splice(employeedetail.Applied.indexOf(jobpost_id), 1);
        employeedetail.Applied.splice(employeedetail.Applied.indexOf(jobpost_id), 1);
        employeedetail.save();
        jobpost.save();

        applicants.splice(applicant_indx, 1);
        return res.json({ applicants });
    }
    catch (err) {
        return res.status(500).json({ InternalServerError: true });
    }
})

router.post('/giveotp', [body('Mobile_Number').trim().not().isEmpty().bail().withMessage('Please Enter Mobile number').isLength({ min: 10, max: 10 }).bail().withMessage('Mobile number should be of 10 digits only').matches('[0-9]{10}').bail().withMessage('Mobile number should contain only digits')],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.json({ errors: errors.array() });
        }
        try {
            const employee = await Employer_SignUp.findOne({ Mobile_Number: req.body.Mobile_Number }).exec();
            if (!employee) {
                return res.json({ param: 'Mobile_Number', message: 'This Mobile number is not registered.Please Sign up first' });
            }
            else {
                const otp = otp_generator.generate(5, { upperCaseAlphabets: false, lowerCaseAlphabets: false, specialChars: false })
                res.json({ otp })
                console.log(otp)
            }
        } catch (error) {
            return res.status(500).json({ InternalServerError: true });
        }
    })

router.post('/changepassword', [body('Password').isLength({ min: 8, max: 20 }).bail().withMessage('Password length should be 8 to 20 characters only').matches('^[a-zA-Z ]+$').withMessage('Password must contain letters only')],
    async (req, res) => {
        const errors = validationResult(req);
        const filter = { Mobile_Number: req.body.Mobile_Number };
        if (!errors.isEmpty()) {
            return res.json({ errors: errors.array() })
        }
        try {
            const salt = await bcrypt.genSalt(10);
            const hashpassword = await bcrypt.hash(req.body.Password, salt);
            await Employer_SignUp.findOneAndUpdate(filter, {
                Password: hashpassword
            }, { new: true }).then(user => {
                let data = {
                    user: {
                        id: user.id
                    }
                };
                const authToken = jwt.sign(data, JWT_screte)
                res.json({ authToken: authToken });
            })
        } catch (err) {
            return res.status(500).json({ InternalServerError: true });
        }
    })



module.exports = router;