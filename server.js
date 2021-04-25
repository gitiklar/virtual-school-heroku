const express = require('express');
const bodyParser = require('body-parser')
const crypto = require('crypto');
const _ = require('lodash');


const app = express();
const publicMessages = [{ message: 'Hello World!', from: 'SYSTEM' }];
const privateMessages = {};

app.use(express.static(__dirname + "/client"));

app.use(bodyParser.json())

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, token");
    next();
});

const users = {};
const sockets = {};

app.post('/login', function(req, res) {
    const user = req.body.username;
    console.log(user);
    crypto.randomBytes(48, function(err, buf) {
        const token = buf.toString('hex');
        users[token] = user;
        res.send({ token: token });
        console.log(`User ${user} Authenticated`);
    });
});

function verifyUser(req, res, next) {
    const token = req.headers.token;
    const user = users[token];
    if (!user) { return next('Access Denied') }
    req.user = user;

    next();
}

app.post('/messages', verifyUser, function(req, res, next) {
    const message = req.body;
    message.from = req.user;
    if (message.to) {
        if (!privateMessages[message.to]) {
            privateMessages[message.to] = [];
        }

        const userMessages = privateMessages[message.to];
        userMessages.push(message);

        for (let socket of sockets[message.to]!==undefined ? sockets[message.to]: []) {
            socket.emit('message', message);
        }
    } else {
        publicMessages.push(message);
        io.emit('message', message);
    }
    res.sendStatus(201);
});

app.get('/messages', verifyUser, function(req, res) {
    const myMessages = privateMessages[req.user] || [];
    res.send(publicMessages.concat(myMessages));
});

const http = require('http').createServer(app);
const socketioOptions = {
  cors: {
    origin: "*",
    allowedHeaders: "*",
    methods: ["GET", "POST"]
  }
};

const io = require('socket.io')(http, socketioOptions);
io.on('connection', function(socket){
    console.log('a user connected');
    socket.on('listen', function(msg) {
        const username = msg.user;
        if (!sockets[username]) {
            sockets[username] = [];
        }
        sockets[username].push(socket);
    });
    socket.on('stop', function(msg) {
        const username = msg.user;
        if (sockets[username]) {
            _.pull(sockets[username], socket);
        }
    });    
});


const PORT = process.env.PORT || 8080;
http.listen(PORT, function() {
    console.log(`listen to PORT: ${PORT}`);
});