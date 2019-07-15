const express = require('express');
const app = express();
const fs = require('fs');
const http = require('http').Server(app);
const io = require('socket.io')(http);

app.get('/', function(req, res) {
    res.render('index.ejs');
});

var isTyping = new Map();
var emoticons = JSON.parse(fs.readFileSync('emoticons.json', 'utf-8'));
var emoji = JSON.parse(fs.readFileSync('emoji.json', 'utf8'));
var customEmoji = JSON.parse(fs.readFileSync('custom-emoji.json', 'utf-8'));

/* Replaces emoticons and :emoji: in a message with emoji image tags. */
function replaceEmoji(msg) {
    // Replace emoticons with :emoji:
    Object.keys(emoticons).forEach(function(k) {
        var v = emoticons[k];
        k = k.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        var re = new RegExp(k, "g");
        msg = msg.replace(re, v);
    });

    var regex = /\:([_a-zA-Z])+\:/g;
    var found = msg.match(regex);
    if(found !== null) {
        found.forEach(function(e) {
            var name = e.replace(/\:/g, '').toLowerCase();
            // Check for unicode emoji.
            if(emoji[name] !== undefined) {
                var imgTag = '<img class="emoji" draggable="false" alt="' + emoji[name].emoji
                    + '" src="https://twemoji.maxcdn.com/v/12.1.2/72x72/' + emoji[name].code + '.png"/>';
                msg = msg.replace(e, imgTag);
            // Check for custom emoji.
            } else if(customEmoji[name] !== undefined) {
                var imgTag = '<img class="emoji" draggable="false" alt="' + e
                    + '" src="' + customEmoji[name].url + '"/>';
                msg = msg.replace(e, imgTag);
            }
        });
    }
    return msg;
}

/* Replaces all instances of $$latex$$ in a message with latex image tags. */
function replaceLatex(msg) {
    var regex = /\$\$(.+)\$\$/g;
    var found = msg.match(regex);
    if(found !== null) {
        found.forEach(function(e) {
            var url = "http://chart.apis.google.com/chart?cht=tx&chf=bg,s,282A36&chco=F1F1F0&chl=" + encodeURIComponent(e);
            var imgTag = '<img src="' + url + '"class="latex" alt="$' + e + '$"/>';
            msg = msg.replace(e, imgTag);
        });
    }
    return msg;
}

/* Finds and runs a command given its arguments. */
function cmdParser(args) {
    return 'command ' + args[0].substring(1) + ' sent.';
}

/* Formats a message into html. */
function formatMessage(socket, content) {
    var time = getTime();
    var message = '<div class="col s9 m10 l11"><b style="color: #' + socket.color + ';">' + socket.username + '</b>: '
        + content + '</div><div id="time" class="col s3 m2 l1">' + time + '</div>';
    return message;
}

/* Generates the "X is typing..." message. */
function generateTypingMessage() {
    var msg = "<i>";
    var numPeople = 0;
    isTyping.forEach(function(v, k) {
        if(v) {
            msg += k + ', ';
            numPeople++;
        }
    });
    msg = msg.substring(0, msg.length - 2);
    if(numPeople > 5) {
        msg = '<i>Many people are typing...</i>';
    }
    else if(numPeople > 1) {
        msg += ' are typing...</i>';
    }
    else {
        msg += ' is typing...</i>'
    }
    return msg;
}

/* Creates a string showing the given time using the format hh:mm. */
function getTime() {
    var today = new Date();
    var hh = today.getHours();
    if(hh < 10) {
        hh = '0' + hh;
    }
    var mm = today.getMinutes();
    if(mm < 10) {
        mm = '0' + mm;
    }
    var time = hh + ':' + mm;
    return time;
}

/* Socket behavior. */
io.sockets.on('connection', function(socket) {
    socket.on('create_user', function(options) {
        socket.username = options.username;
        socket.color = options.color;
        io.emit('is_online', '<div class="col s12">⮞ <i style="color: #' + socket.color + ';">' + socket.username + ' joined the chat.</i></div>');
    });

    socket.on('disconnect', function(username) {
        io.emit('is_online', '<div class="col s12">⮜ <i style="color: #' + socket.color + ';">'  + socket.username + ' left the chat.</i></div>');
    });

    socket.on('chat_message', function(message) {
        // If message is not empty
        if(message.trim() !== '') {
            message = replaceEmoji(message);
            message = replaceLatex(message);
            io.emit('chat_message', formatMessage(socket, message));
        }
    });

    socket.on('command_sent', function(message) {
        var args = message.split(" ");
        // Check for empty command.
        if(args[0] !== '/') {
            var ret = cmdParser(args);
            io.emit('chat_message', formatMessage(socket, ret));
        }
    });

    socket.on('user_typing', function() {
        isTyping.set(socket.username, true);
        var msg = generateTypingMessage();
        io.emit('send_notify', msg);
    });

    socket.on('user_not_typing', function() {
        isTyping.set(socket.username, false);
    });
});

const server = http.listen(8000, function() {
    console.log('listening on *:8000');
});