var canPublish = true;
var throttleTime = 200;
var notifyTime = 2000;

var socket = io.connect('http://localhost:8000');

$('#notify').hide();

// Submit text message.
$('#chatForm').submit(function(e){
    e.preventDefault();
    var msg = $('#txt').val();
    if(msg.startsWith('/')) {
        socket.emit('command_sent', msg);
    }
    else {
        socket.emit('chat_message', msg);
    }
    $('#txt').val('');
    return false;
});

// Account creation form submit behavior.
$('#accountCreationForm').submit(function(e){
    e.preventDefault();
    var options = {}
    options.username = $('#username').val();
    options.color = $('#userColor').val();
    socket.emit('create_user', options);
    $('#txt').val('');
    $('#createUserModal').modal('close');
    return false;
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

socket.on('send_embed', function(embed) {
    $('#messages').append($('<li class="collection-item">').html(embed));
    $("#messages-container").scrollTop($("#messages-container")[0].scrollHeight);
})

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