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

////////////////////////////////////////////////////////////////////


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
app.use(cors());
app.use(helmet());

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
    verifyClient: function(info, done) {
        sessionParser(info.req, {}, () => {
            done(info.req.session.userId);
      });
    },
    path: '/wss',
    server
  });

app.get('/bundle.js', browserify(['web-audio-stream/writable']));

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
    ws.id = req.session.userId;
    sockets[ws.id] = ws;

    ws.on('message', message => {

        var channel = users[ws.id];

        if(!channel) return;

        if(message == 'pong'){
            ws.isAlive = true;
        }else{
            console.log("message from: "+ ws.id);
            broadcastEvent(ws.id, channel, message);
        }
    
    });

    ws.on('close', (code, reason)=>{
        console.log(`lost connection to client=${ws.id}; code=${code}`);
        terminateConnection(ws);
    });
});

setInterval(() => {
    wss.clients.forEach(ws => {
       
        if (!ws.isAlive){
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

    if(oldChannel != channel){
        channels[oldChannel].delete(user);
    }
   
    users[user] = channel;
    channels[channel].add(user);
}
     

server.listen(port, hostname);
console.log(`Server running at ${hostname}:${port}`);
