var canPublish = true;
var throttleTime = 200;
var notifyTime = 2000;

var socket = io.connect('http://localhost:8000');

var pickrOptions = {
    el: '.color-picker',
    theme: 'nano',
    swatches: [
        '#F1F1F0',
        '#FF5B56',
        '#FF6AC1',
        '#F3F99D',
        '#5AF78E',
        '#57C7FF',
        '#9AEDFE'
    ],
    default: 'F1F1F0',
    lockOpacity: true,
    components: {
        preview: true,
        opacity: false,
        hue: true,
        interaction: {
            hex: true,
            input: true,
            save: true
        }
    }
};

var pickr = Pickr.create(pickrOptions);
pickr.on('save', function(color) {
    $('#username').css('color', '#' + color.toHEXA().join(''));
});

var settingsPickr = Pickr.create(pickrOptions);
settingsPickr.on('save', function(color) {
    $('#usernameSetting').css('color', '#' + color.toHEXA().join(''));
});

$('#notify').hide();

// Submit text message.
$('#chatForm').submit(function(e){
    e.preventDefault();
    var msg = convertHtmlTags($('#txt').val());
    socket.emit('chat_message', msg);
    if(msg.startsWith('/')) {
        socket.emit('command_sent', msg);
    }
    $('#txt').val('');
    return false;
});

// Account creation form submit behavior.
$('#accountCreationForm').submit(function(e){
    e.preventDefault();
    var options = {}
    options.username = convertHtmlTags($('#username').val());
    options.color = RGBtoHEX($('#username').css('color'));
    socket.emit('user_create', options);
    $('#txt').val('');
    $('#createUserModal').modal('close');
    return false;
});

// Account settings form submit behavior.
$('#accountSettingsForm').submit(function(e){
    e.preventDefault();
    var options = {}
    options.username = convertHtmlTags($('#usernameSetting').val());
    options.color = RGBtoHEX($('#usernameSetting').css('color'));
    socket.emit('user_edit', options);
    $('#settingsModal').modal('close');
    return false;
});

// Open settings modal.
$('#settingsButton').click(function() {
    socket.emit('request_info', {username: null, color: null});
    socket.on('receive_info', function(options) {
        settingsPickr.options.default = options.color;
        $('#usernameSetting').val(options.username);
        $('#usernameSetting').css('color', options.color);
        $('#settingsModal').modal('open');
    });
});

// Typing indicator behavior.
$('#chatForm').on('keyup', function(e) {
    e.preventDefault();
    // Check if the enter key has been pressed. If so, don't send
    // notification.
    var keycode = (event.keyCode ? event.keyCode : event.which);
    if(keycode == '13'){
        return false;
    }
    // Update every canPublish milliseconds.
    if(canPublish) {
        socket.emit('user_typing');
        canPublish = false;
        setTimeout(function() {
            canPublish = true;
        }, throttleTime);
        socket.emit('user_not_typing');
    }
});

// Append the chat text message.
socket.on('chat_message', function(msg) {
    $('#messages').append($('<li class="collection-item">').html(msg));
    $("#messages-container").scrollTop($("#messages-container")[0].scrollHeight);
});

// Append the embed.
socket.on('send_embed', function(embed) {
    $('#messages').append($('<li class="collection-item">').html(embed));
    $("#messages-container").scrollTop($("#messages-container")[0].scrollHeight);
});

// Append text if someone is online.
socket.on('is_online', function(username) {
    $('#messages').append($('<li>').html(username));
});

// Show notification text.
socket.on('send_notify', function(msg) {
    $('#notify').html(msg).fadeIn('slow');
    setTimeout(function() {
        $('#notify').fadeOut('slow');
    }, notifyTime);
});

$(document).ready(function() {
    $('.modal').modal();
    $('#createUserModal').modal({
        dismissible: false,
        keyboard: false
    });
    $('#createUserModal').modal('open');
});

// Prevent CSS attacks.
function convertHtmlTags(str) {
    return str.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function RGBtoHEX(rgb) {
    // remove css formatted rgb(r, g, b), then split into an array
    // [r, g, b].
    var a = rgb.split("(")[1].split(")")[0].split(',');
    // Convert each element in the array to a hex string.
    var b = a.map(function(x){
        x = parseInt(x).toString(16);
        return (x.length == 1) ? "0" + x : x;
    });
    return b.join("");
}