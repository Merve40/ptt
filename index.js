var express = require('express');
const session = require('express-session');
var browserify = require('browserify-middleware');
const uuid = require('uuid');
var bodyParser = require('body-parser');
var http = require('http');
var websocketServer = require('ws');
var fs = require('fs');
var events = require('events');

////////////////////////////////////////////////////////////////////


var channels = {};
var users = {};
var sockets = {};

const sessionParser = session({
    saveUninitialized: false,
    secret: '$eCuRiTy',
    resave: false
  });

var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(sessionParser);

const server = http.createServer(app);

const wss = new websocketServer.Server({
    verifyClient: function(info, done) {
        sessionParser(info.req, {}, () => {
            done(info.req.session.userId);
      });
    },
    path: '/wss',
    server
  });

app.get('/bundle.js', browserify(['web-audio-stream/writable', 'audio-context']));

app.post('/login', function(req, res) {
    const id = uuid.v4();
    req.session.userId = id;
    res.send({ result: 'OK', message: 'Session updated' });
});
  
app.delete('/logout', function(request, response) {
    request.session.destroy(function() {
        response.send({ result: 'OK', message: 'Session destroyed' });
    });
});

app.get('/subscribe', (req, res)=>{
    var channel = req.query.channel;
    var id = req.session.userId;
    
    subscribe(id, channel);
    res.send('OK');
});
     
wss.on('connection', (ws, req) => {

    ws.isAlive = true;
    sockets[req.session.userId] = ws;

    ws.on('message', message => {

        var sessionId = req.session.userId;
        console.log("message from: "+ sessionId);
        var channel = users[sessionId];

        if(!channel) return;
        
        broadcastEvent(sessionId, channel, message);

    });

    ws.on('pong', () => {
        ws.isAlive = true;
    });
});

setInterval(() => {
    wss.clients.forEach(ws => {
        
        if (!ws.isAlive){
            return ws.terminate();
        } 
        
        ws.isAlive = false;
        ws.ping(null, false, true);
    });
}, 10000);

function broadcastEvent(sender, channel, payload){
    var users = channels[channel];
   
    users.forEach(usr =>{
        if(usr != sender){
            sockets[usr].send(payload);
        }
    });
}

function subscribe(user, channel){
    console.log("subscribing user="+user+" to channel="+channel);

    if(! (channel in channels)){ 
        channels[channel] = new Set();
    }

    var oldChannel = users[user];

    if(user in users && oldChannel != channel){
        channels[oldChannel].delete(user);
    }
   
    users[user] = channel;
    channels[channel].add(user);
}
     
var port = process.env.PORT || 8383;
var hostname = '0.0.0.0';
server.listen(port, hostname);
console.log(`Server running at ${hostname}:${port}`);
