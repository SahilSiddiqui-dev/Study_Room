require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const PORT = process.env.PORT || 3000;
const app = express();

const startServer = () => {
    connectDB();
    app.listen(PORT, () => {
        console.log(`server started at ${PORT}`);
    })
}

app.use('/', (req, res) => {
    res.status(200).json({
        message : "Welcome back sahil server is healthy !!!"
    })
})

startServer();
