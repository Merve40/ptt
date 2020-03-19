var express = require('express');
const session = require('express-session');
var browserify = require('browserify-middleware');
const uuid = require('uuid');
var bodyParser = require('body-parser');
var http = require('http');
var websocketServer = require('ws');
var cors = require('cors');
var helmet = require('helmet');
var fs = require('fs');
const ipfilter = require('express-ipfilter').IpFilter;

////////////////////////////////////////////////////////////////////

var blacklisted = ['49.89.0.0/16', '46.119.174.102', '185.136.159.215', '3.16.81.199', '51.79.28.114', '46.166.173.6'];

var port = process.env.PORT || 8383;
var hostname = '0.0.0.0';

var cfg = {
    ssl: false,
    ssl_key: __dirname +'/ssl/server.key',
    ssl_cert: __dirname+'/ssl/server.crt'
};

http = ( cfg.ssl ) ? require('https') : require('http');

var channels = {};
var users = {};
var sockets = {};

var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(cors());
app.use(helmet());

app.use(ipfilter(blacklisted));

app.use(function(req, res, next) {
    if (blacklisted.indexOf(req.ip) > -1){    
        res.status(403).end('You have been blacklisted!');

    }else{
        next();
    }
});

var server;

if(cfg.ssl){
    server = http.createServer({
            cert: fs.readFileSync(cfg.ssl_cert, 'utf8'),
            key: fs.readFileSync(cfg.ssl_key, 'utf8')
        }, app);
}else{
    server = http.createServer(app);
}

const wss = new websocketServer.Server({
    path: '/wss',
    server
});

app.get('/bundle.js', browserify(['web-audio-stream/writable']));

app.get('/login', function(req, res) {
    const id = uuid.v4();
    while(id == undefined){ // sometimes id is undefined for some reason
        id = uuid.v4();
    }
    
    res.send({ result: 'OK', message: 'Session updated', id });
});


app.delete('/logout', function(request, response) {
    request.session.destroy(function() {
        response.send({ result: 'OK', message: 'Session destroyed' });
    });
});

app.get('/subscribe', (req, res)=>{
    var channel = req.query.channel;
    var id = req.query.id;
    
    if(id){
        subscribe(id, channel);
        res.send('OK');
    }else{
        res.status(404).send("User does not have an id!");
    }    
});
     
wss.on('connection', (ws, req) => {

    ws.isAlive = true;
    var id = req.url.split('=')[1]
    ws.id = id;

    if(ws.id == undefined){
        ws.close(1011, "User is not assigned an id.");
    }

    sockets[ws.id] = ws;

    ws.on('message', message => {

        var channel = users[ws.id];

        if(!channel) return;

        if(message == 'pong'){
            ws.isAlive = true;
        }else{
            try{
                var o = JSON.parse(message);
                if('meta' in o){
                    console.log(`message from= ${ws.id}\tchannel= ${channel}`);
                }
            }catch(e){}

            broadcastEvent(ws.id, channel, message);
        }
    });

    ws.on('close', (code, reason)=>{
        if(code == 1011){
            console.log(`${code}: rejecting user connection. reason=${reason}`);
        }else{
            terminateConnection(ws);
        }       
    });
});

setInterval(() => {
    wss.clients.forEach(ws => {
       
        if (!ws.isAlive && ws.id){
            return terminateConnection(ws);
        } 
        ws.isAlive = false;
        ws.send('ping');
    });
}, 10000);

function terminateConnection(socket){
    delete sockets[socket.id];
    
    if(channels[users[socket.id]]){
        channels[users[socket.id]].delete(socket.id);
    }

    if(socket.id in users){
        delete users[socket.id];
    }
    
    return socket.terminate();
}

function broadcastEvent(sender, channel, payload){
    var users = channels[channel];
   
    users.forEach(usr =>{
        if(usr != sender){
            if(sockets[usr]){
                sockets[usr].send(payload);
            }
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
     

server.listen(port, hostname);
console.log(`Server running at ${hostname}:${port}`);
