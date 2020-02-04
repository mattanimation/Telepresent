/**
 * Simple express server to host the frontend page
 */
const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 80;

app.use(express.static("public"));
app.use(cors({
    "origin": "*",
    "methods": "GET",
    "preflightContinue": false,
    "optionsSuccessStatus": 204
}));

app.get("/", (req, res) => {
    return res.sendFile("index.html");
});

app.listen(port, () => console.log(`Telepresent Frontend listening on port ${port}!`))

// The signals we want to handle
// NOTE: although it is tempting, the SIGKILL signal (9) cannot be intercepted and handled
var signals = {
    SIGHUP: 1,
    SIGINT: 2,
    SIGTERM: 15
};

// Do any necessary shutdown logic for our application here
const shutdown = (signal, value) => {
    console.log("shutdown!");
    process.exit(128 + value);
    //server.close(() => {
    //    console.log(`server stopped by ${signal} with value ${value}`);
    //    process.exit(128 + value);
    //});
};

// Create a listener for each of the signals that we want to handle
Object.keys(signals).forEach(signal => {
    process.on(signal, () => {
        console.log(`process received a ${signal} signal`);
        shutdown(signal, signals[signal]);
    });
});