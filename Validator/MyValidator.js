// Validator for unique mobile number 
async function Mobile_Number_Validator(value, db_name) {
        return await db_name.findOne({ Mobile_Number: value }).then(result => {
            if (result) {
                return Promise.reject('This Mobile Number already in use')
            }
        })
    

}
module.exports = Mobile_Number_Validator;