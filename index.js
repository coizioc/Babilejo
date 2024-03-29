const express = require('express');
const app = express();
const path = require('path');
const http = require('http').Server(app);
const io = require('socket.io')(http);
const grabity = require('grabity');

const cmds = require('./cmds');
const msgtools = require('./message-tools');

app.use(express.static(path.join(__dirname, 'client')));
app.get('/', function(req, res) {
    res.render('index.ejs');
});

var numUsers = 0;

var clients = {};

/* Finds and runs a command given its arguments. */
function cmdParser(args) {
    var cmdName = args[0].substring(1);
    if(cmds[cmdName] !== undefined) {
        return cmds[cmdName](args);
    }
}

/* Socket behavior. */
io.sockets.on('connection', function(socket) {
    socket.on('user_create', function(options) {
        numUsers++;
        socket.username = options.username;
        socket.id = numUsers.toString();
        socket.color = options.color;
        clients[socket.id] = {socket: socket, isTyping: false}
        io.emit('is_online', msgtools.formatJoinMessage(socket));
    });

    socket.on('user_edit', function(options) {
        for(let [k, v] of Object.entries(options)) {
            socket[k] = v;
        }
    });

    socket.on('disconnect', function(username) {
        if(socket.username !== undefined) {
            io.emit('is_online', msgtools.formatJoinMessage(socket, true));
        }
    });

    socket.on('chat_message', function(message) {
        // If message is not empty
        if(message.trim() !== '') {
            var unformattedMsg = message;

            message = msgtools.replaceUrls(message);
            message = msgtools.replaceMarkdown(message);
            message = msgtools.replaceEmoji(message);
            message = msgtools.replaceLatex(message);
            
            io.emit('chat_message', msgtools.formatMessage(socket, message));

            var urls = msgtools.parseUrls(unformattedMsg);
            urls.forEach(function(url) {
                if(url.includes('youtube.com/watch?v=')) {
                    let embed = msgtools.createVideoEmbed(url);
                    io.emit('send_embed', embed);
                }
                else {
                    (async () => {
                        try {
                            let it = await grabity.grabIt(url);
                            let embed = msgtools.createEmbed(url, it);
                            io.emit('send_embed', embed);
                        } catch(e) {
                            if(e instanceof RangeError) {
                                let embed = msgtools.createMediaEmbed(url);
                                io.emit('send_embed', embed);
                            }
                            else {
                                console.log(e);
                            }
                        }
                    })();
                }
            });
        }
    });

    socket.on('command_sent', function(message) {
        var args = message.split(" ");
        // Check for empty command.
        if(args[0] !== '/') {
            var ret = '<div class="col s12">' + cmdParser(args) + '</div>';
            io.emit('chat_message', ret);
        }
    });

    socket.on('user_typing', function() {
        clients[socket.id].isTyping = true;
        var msg = msgtools.generateTypingMessage(clients);
        io.emit('send_notify', msg);
    });

    socket.on('user_not_typing', function() {
        clients[socket.id].isTyping = false;
    });

    socket.on('request_info', function(options) {
        for(let [k, v] of Object.entries(options)) {
            options[k] = socket[k];
        }
        socket.emit('receive_info', options);
    });
});

const server = http.listen(8000, function() {
    console.log('listening on *:8000');
});