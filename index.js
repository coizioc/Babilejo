const express = require('express');
const app = express();
const path = require('path');
const http = require('http').Server(app);
const io = require('socket.io')(http);
const grabity = require("grabity");

const msgtools = require('./message-tools');

app.use(express.static(path.join(__dirname, 'client')));
app.get('/', function(req, res) {
    res.render('index.ejs');
});

var numUsers = 0;

// key: socket, value: true/false for whether that user is typing.
var isTyping = new Map();

/* Finds and runs a command given its arguments. */
function cmdParser(args) {
    return 'command ' + args[0].substring(1) + ' sent.';
}

/* Socket behavior. */
io.sockets.on('connection', function(socket) {
    socket.on('create_user', function(options) {
        numUsers++;
        socket.username = options.username;
        socket.id = numUsers.toString();
        socket.color = options.color;
        io.emit('is_online', msgtools.formatJoinMessage(socket));
    });

    socket.on('disconnect', function(username) {
        if(socket.username !== undefined) {
            io.emit('is_online', msgtools.formatJoinMessage(socket, true));
        }
    });

    socket.on('chat_message', function(message) {
        // If message is not empty
        if(message.trim() !== '') {
            message = msgtools.replaceEmoji(message);
            message = msgtools.replaceLatex(message);
            var urls = msgtools.parseUrls(message);
            urls.forEach(function(e) {
                (async () => {
                    let it = await grabity.grabIt(e);
    
                    let embed = msgtools.createEmbed(e, it);
                    io.emit('send_embed', embed);
                })();
            })
            message = msgtools.replaceUrls(message);
            
            io.emit('chat_message', msgtools.formatMessage(socket, message));
        }
    });

    socket.on('command_sent', function(message) {
        var args = message.split(" ");
        // Check for empty command.
        if(args[0] !== '/') {
            var ret = cmdParser(args);
            io.emit('chat_message', msgtools.formatMessage(socket, ret));
        }
    });

    socket.on('user_typing', function() {
        isTyping.set(socket, true);
        var msg = msgtools.generateTypingMessage(isTyping);
        io.emit('send_notify', msg);
    });

    socket.on('user_not_typing', function() {
        isTyping.set(socket, false);
    });
});

const server = http.listen(8000, function() {
    console.log('listening on *:8000');
});