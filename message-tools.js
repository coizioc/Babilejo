var fs = require('fs');

try {
    exports.emoticons = JSON.parse(fs.readFileSync('emoticons.json', 'utf-8'));
    console.log("Loaded " + Object.keys(exports.emoticons).length + " emoticons.");
} catch(e) {
    console.log("emoticons.json not found. No emoticons were loaded.");
    exports.emoticons = {};
}

try {
    exports.emoji = JSON.parse(fs.readFileSync('emoji.json', 'utf8'));
    console.log("Loaded " + Object.keys(exports.emoji).length + " emoji.");
} catch(e) {
    console.log("emoji.json not found. No emoji were loaded.");
    exports.emoji = {};
}

try {
    exports.customEmoji = JSON.parse(fs.readFileSync('custom-emoji.json', 'utf-8'));
    console.log("Loaded " + Object.keys(exports.customEmoji).length + " custom emoji.");
} catch(e) {
    console.log("custom-emoji.json not found. No custom emoji were loaded.");
    exports.customEmoji = {};
}


/* Replaces emoticons and :emoji: in a message with emoji image tags. */
exports.replaceEmoji = function(msg) {
    // Replace emoticons with :emoji:
    Object.keys(exports.emoticons).forEach(function(k) {
        var v = exports.emoticons[k];
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
            if(exports.emoji[name] !== undefined) {
                var imgTag = '<img class="emoji" draggable="false" alt="' + exports.emoji[name].emoji
                    + '" src="https://twemoji.maxcdn.com/v/12.1.2/72x72/' + exports.emoji[name].code + '.png"/>';
                msg = msg.replace(e, imgTag);
            // Check for custom emoji.
            } else if(exports.customEmoji[name] !== undefined) {
                var imgTag = '<img class="emoji" draggable="false" alt="' + e
                    + '" src="' + exports.customEmoji[name].url + '"/>';
                msg = msg.replace(e, imgTag);
            }
        });
    }
    return msg;
}

/* Replaces all instances of $$latex$$ in a message with latex image tags. */
exports.replaceLatex = function(msg) {
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

/* Adds Markdown-style formatting to a message. */
exports.replaceMarkdown = function(msg) {
    var bold = {regex: /\*\*(.+)\*\*/g, remove: /\*\*/g, tagBegin: '<b>', tagFinal: '</b>'};
    var italics = {regex: /\*(.+)\*/g, remove: /\*/g, tagBegin: '<i>', tagFinal: '</i>'};
    var underscore = {regex: /\*(.+)\*/g, remove: /\_\_/g, tagBegin: '<u>', tagFinal: '</u>'};
    var strikethrough = {regex: /\*(.+)\*/g, remove: /~~/g, tagBegin: '<s>', tagFinal: '</s>'};
    var spoiler = {regex: /\*(.+)\*/g, remove: /\|\|/g, tagBegin: '<span class="spoiler">', tagFinal: '</span>'};
    var greentext = {regex: /\*(.+)\*/g, remove: null, tagBegin: '<span style="color: #789922">', tagFinal: '</span>'};
    var formats = [bold, italics, underscore, strikethrough, spoiler, greentext];

    formats.forEach(function(format) {
        var found = msg.match(format.regex);
        if(found !== null) {
            found.forEach(function(match) {
                if(format.remove !== null) {
                    match = match.replace(format.remove, '');
                }
                var tag = format.tagBegin + match + format.tagFinal;
                msg = msg.replace(match, tag);
            });
        }
    });
    return msg;
}

/* Parses urls from a message and returns them as an array. */
exports.replaceUrls = function(msg) {
    var regex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
    var found = msg.match(regex);
    if(found !== null) {
        found.forEach(function(e) {
            var aTag = '<a href="' + e + '">' + e + '</a>';
            msg = msg.replace(e, aTag);
        });
    }
    return msg;
}

/* Formats a message into html. */
exports.formatMessage = function(socket, content) {
    var time = getTime();
    var message = '<div class="col s9 m10 l11"><b style="color: #' + socket.color + ';">' + formatUsername(socket) + '</b>: '
        + content + '</div><div id="time" class="col s3 m2 l1">' + time + '</div>';
    return message;
}

exports.formatJoinMessage = function(socket, disconnect) {
    var msg = '<div class="col s12">';
    if(!disconnect) {
        msg += '⮞ <i style="color: #' + socket.color + ';">' + formatUsername(socket) + ' has entered the chat.</i></div>';
    } else {
        msg += '⮜ <i style="color: #' + socket.color + ';">' + formatUsername(socket) + ' has left the chat.</i></div>';
    }
    return msg;
}

/* Generates the "X is typing..." message. */
exports.generateTypingMessage = function(isTyping) {
    var msg = "<i>";
    var numPeople = 0;
    isTyping.forEach(function(v, k) {
        if(v) {
            msg += formatUsername(k) + ', ';
            numPeople++;
        }
    });
    msg = msg.substring(0, msg.length - 2);
    if(numPeople > 3) {
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

exports.createEmbed = function(url, it) {
    var embed = '<div class="col s12"><div class="card horizontal"><div class="card-image"><img src="' + it.image +
        '"></div><div class="card-content"><p><b><a href="' + url + '">' + it.title + '</a></b>: ' + it.description + '</p></div></div></div>';
    return embed;
}

/* Parses urls from a message and returns them as an array. */
exports.parseUrls = function(msg) {
    var regex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
    var found = msg.match(regex);
    if(found !== null) {
        return found;
    } else {
        return [];
    }
}

/* Formats the socket's username to username#discriminator. */
function formatUsername(socket) {
    return socket.username + "#" + socket.id.padStart(4, '0');
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