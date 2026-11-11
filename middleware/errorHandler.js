const errorHandler = (err, req, res, next) => {
    let statusCode = 500;
    let message = "Internal server error !!";

    if(err.statusCode) {
        statusCode = err.statusCode;
        message = err.message;
    }
    else if(err.name === 'CastError'){
        statusCode = 400;
        message = `Invalid value for field ${err.path}`;
    }
    else if(err.name === 'ValidationError'){
        statusCode = 400;
        message = Object.values(err.errors).map((e) => e.message).join(', ');
    }

    else if(err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        const value = err.keyValue[field];
        statusCode = 400;
        message =  `Duplicate value ${value} for this field ${field} already exists`;
    }

    else {
        console.error(err);
    }

    res.status(statusCode).json({
        success : false,
        message : message
    });

};

module.exports = errorHandler;