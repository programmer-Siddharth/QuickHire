const mongoose = require('mongoose');
// const mongoURI = 'mongodb://localhost:27017/'
// 'mongodb+srv://Siddharth_G:Password@cluster0.q0kq1u8.mongodb.net/?retryWrites=true&w=majority';
const ConnectToMongo = async () => {
    try {
        await mongoose.connect(`${process.env.URI}`, () => {
            console.log('Connected to Database');
        })
    }
    catch (error) {
        console.log(error);
    }
}

module.exports = ConnectToMongo;