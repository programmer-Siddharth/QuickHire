const express = require('express');
const router = express.Router();
const { oneOf, check, body, validationResult } = require('express-validator');
const { Employee_SignUp, Employee_Detail } = require('../Database/Employe_db');
const { Post_Job } = require('../Database/Job_db');
const unique_number = require('../Validator/MyValidator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fetchuser = require('../middleware/fetchuser');
const otp_generator = require('otp-generator');
let JWT_screte = 'Mywebsite';
router.use(express.json());

// This router for signup
router.post('/signup', [
    body('Name').trim().isLength({ min: 3 }).bail().withMessage('Name must contain at least 3 characters').matches('^[a-zA-Z ]+$').withMessage('Name must contain letters only'),
    body('Mobile_Number').trim().isLength({ min: 10, max: 10 }).bail().withMessage('Mobile number should be of 10 digits only').matches('[0-9]{10}').bail().withMessage('Mobile number should contain only digits').custom(value => {
        return unique_number(value, Employee_SignUp)
    }),
    body('Password').isLength({ min: 8, max: 20 }).bail().withMessage('Password length should be 8 to 20 characters only').matches('^[a-zA-Z ]+$').withMessage('Password must contain letters only')],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.json({ errors: errors.array() });
        }
        try {
            const salt = await bcrypt.genSalt(10);
            const hashpassword = await bcrypt.hash(req.body.Password, salt);
            await Employee_SignUp.create({
                Name: req.body.Name,
                Mobile_Number: req.body.Mobile_Number,
                Password: hashpassword,
            }).then((user) => {
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
    });

// This router for Login

router.post('/login', [
    body('Mobile_Number').trim().isLength({ min: 10, max: 10 }).bail().withMessage('Mobile number should be of 10 digits only').matches('[0-9]{10}').bail().withMessage('Mobile number should contain only digits'),
    body('Password').isLength({ min: 8, max: 20 }).bail().withMessage('Password length should be 8 to 20 characters only').matches('^[a-zA-Z ]+$').withMessage('Password must contain letters only')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.json({ errors: errors.array() });
    }
    try {
        const employee = await Employee_SignUp.findOne({ Mobile_Number: req.body.Mobile_Number }).exec();
        if (!employee) {
            return res.json({ param: 'Mobile_Number', message: 'This Mobile number is not registered.Please Sign up first' });
        }
        const password_compare = await bcrypt.compare(req.body.Password, employee.Password);
        if (!password_compare) {
            return res.json({ param: "Password", message: 'Wrong Password' });
        };
        let data = {
            user: {
                id: employee.id
            }
        };
        const authToken = jwt.sign(data, JWT_screte)
        res.json({ authToken: authToken });
    } catch (err) {
        return res.status(500).json({ InternalServerError: true });
    }
})

router.post('/getuser', fetchuser, async (req, res) => {
    const employee_id = req.user.id;
    try {
        const user_data = await Employee_Detail.findOne({ employee_ref: employee_id }).then(async (user) => {
            if (!user) {
                const User = await Employee_SignUp.findById(employee_id).select('-Password');
                return [User, true];
            }
            else {
                const User = user;
                return [User, false];
            }
        })
        if (user_data[0] === null) {
            return res.json({ error: 'Invalid token' });
        };
        const jobpost = await Post_Job.find({})
        res.json({ user_data: user_data[0], complete_profile: user_data[1], user_posts: jobpost });
    } catch (err) {
        return res.status(500).json({ InternalServerError: true });
    }
});

router.put('/updateprofile', fetchuser, [
    body('Name').trim().isLength({ min: 3 }).bail().withMessage('Name must contain at least 3 characters').matches('^[a-zA-Z ]+$').withMessage('Name must contain letters only'),
    body('Age').trim().isNumeric().withMessage('Age must be Number'),
    body('Email').optional({ checkFalsy: true }).isEmail().withMessage('Please give valid Email').normalizeEmail({ gmail_remove_dots: false }),
    body('Education').optional({ checkFalsy: true }).trim(),
    body('Profession').optional({ checkFalsy: true }).trim(),
    body('Experience').optional({ checkFalsy: true }).trim()],
    async (req, res) => {
        const errors = validationResult(req);
        const filter = { employee_ref: req.user.id };
        if (!errors.isEmpty()) {
            return res.json({ errors: errors.array() })
        }
        try {
            await Employee_Detail.findOneAndUpdate(filter, {
                Name: req.body.Name,
                Mobile_Number: req.body.Mobile_Number,
                Age: req.body.Age,
                Email: req.body.Email,
                Education: req.body.Education,
                Profession: req.body.Profession,
                Experience: req.body.Experience
            }, { new: true, upsert: true }).then(user => {
                res.json({ user });
            })
        } catch (err) {
            return res.status(500).json({ InternalServerError: true });
        }
    });

router.post('/apply', fetchuser, async (req, res) => {
    const employee_id = req.user.id;
    const jobpost_id = req.body.job_id;
    try {
        const jobpost = await Post_Job.findById(jobpost_id);
        const employeedetail = await Employee_Detail.findOne({ employee_ref: employee_id });
        if (jobpost.Applicants.indexOf(employee_id) != -1) {
            jobpost.Applicants.splice(jobpost.Applicants.indexOf(employee_id), 1);
            employeedetail.Applied_Dates.splice(employeedetail.Applied.indexOf(jobpost_id), 1);
            employeedetail.Applied.splice(employeedetail.Applied.indexOf(jobpost_id), 1);
        }
        employeedetail.Applied.push(jobpost_id);
        employeedetail.Applied_Dates.push(new Date().toDateString());
        jobpost.Applicants.push(employee_id);
        employeedetail.save();
        jobpost.save();
        return res.json({ success: true });
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
            const employee = await Employee_SignUp.findOne({ Mobile_Number: req.body.Mobile_Number }).exec();
            if (!employee) {
                return res.json({ param: 'Mobile_Number', message: 'This Mobile number is not registered.Please Sign up first' });
            }
            else {
                const otp = otp_generator.generate(5, { upperCaseAlphabets: false, lowerCaseAlphabets: false, specialChars: false })
                res.json({ otp })
                console.log(otp)
            }
        } catch (err) {
            return res.status(500).json({ InternalServerError: true });
        }

    })

router.post('/changepassword', [body('Password').isLength({ min: 8, max: 20 }).bail().withMessage('Password Length Must be 8 to 20 characters only').matches('^[a-zA-Z ]+$').withMessage('Password must contain letters only')],
    async (req, res) => {
        const errors = validationResult(req);
        const filter = { Mobile_Number: req.body.Mobile_Number };
        if (!errors.isEmpty()) {
            return res.json({ errors: errors.array() })
        }
        try {
            const salt = await bcrypt.genSalt(10);
            const hashpassword = await bcrypt.hash(req.body.Password, salt);
            await Employee_SignUp.findOneAndUpdate(filter, {
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