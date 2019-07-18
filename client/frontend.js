var canPublish = true;
var throttleTime = 200;
var notifyTime = 2000;

var socket = io.connect('http://localhost:8000');

$('#notify').hide();

// Submit text message.
$('#chatForm').submit(function(e){
    e.preventDefault();
    var msg = convertHtmlTags($('#txt').val());
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
    options.username = convertHtmlTags($('#username').val());
    options.color = $('#userColor').val();
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
    options.color = $('#userColorSetting').val();
    socket.emit('user_edit', options);
    $('#settingsModal').modal('close');
    return false;
});

// Open settings modal.
$('#settingsButton').click(function() {
    socket.emit('request_info', {username: null, color: null});
    socket.on('receive_info', function(options) {
        $('#usernameSetting').val(options.username);
        $('#usernameSetting').css('color', options.color);
        $('select.userColorSetting').css('color', options.color);
        $('#settingsModal').modal('open');
    });
});

// Change color of text to match currently selected option.
$('#userColor').change(function() {
    var currentColor = "#" + $('#userColor').val();
    $('select.userColor').css('color', currentColor);
    $('#username').css('color', currentColor);
});

// Change color of text to match currently selected option.
$('#userColorSetting').change(function() {
    var currentColor = "#" + $('#userColorSetting').val();
    $('select.userColorSetting').css('color', currentColor);
    $('#usernameSetting').css('color', currentColor);
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