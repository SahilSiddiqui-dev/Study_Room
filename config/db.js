const mongoose = require('mongoose');

const connectDB = async() => {
    if(!process.env.MONGO_URI){
        console.log('Connection string is missing');
        process.exit(1);
    }
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log('Successfully connected to the database', conn.connection.host);
    }
    catch(err) {
        console.error('Not able to connect to the Database');
        process.exit(1);
    }

}
module.exports = connectDB;
