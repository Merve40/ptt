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

streams = {};


app.get('/stream/:channel.ogg', (req, res)=>{
    var channel = users[req.session.userId];
    console.log(users);
    console.log("streaming for channel = "+channel);
   // var inputStream = fs.createReadStream('./output/'+channel+".ogg", {end:false});
    //inputStream.pipe(res);

    /*res.set({
        'Content-Type': 'audio/ogg',
        'Transfer-Encoding': 'chunked'
    });*/
    res.writeHead(200, {
        'Content-Type': 'audio/ogg',
        'Transfer-Encoding': 'chunked'
    });
    
    const handleChunk = (chunk) =>{
        //inputStream.pipe(res);
        var haswritten = res.write(chunk, ()=>{
            console.log("chunk was flushed!");            
        });
        if(!haswritten){
            console.log("waiting for chunk to be flushed!");
            res.once('drain', ()=>{
                console.log("drained!");
            });
        }else{
            console.log("flushed chunk successfully");
        }

        /*res.write('\r\n', (err)=>{
            console.log(err);
        });*/
    };
    streams[channel].event.on('stream', handleChunk);

    streams[channel].event.on('ended', ()=>{
        //inputStream.close();
        console.log("ended stream!");
        //res.send("OK");
        res.end();
        streams[channel].event.removeAllListeners();
    });
});

     
wss.on('connection', (ws, req) => {

    ws.isAlive = true;
    sockets[req.session.userId] = ws;

    ws.on('message', message => {

        var sessionId = req.session.userId;
        //console.log(message);
        var channel = users[sessionId];
        /*
        var fname = "./output/"+channel+".ogg";
        if (fs.existsSync(fname)) {
            fs.truncate(fname, 0, () =>{});
        }*/

        if(message == 'started'){
            var stream = {
                event: new events.EventEmitter()
            };
            streams[channel] = stream;
            broadcastEvent(sessionId, channel, message);
        }else if(message == 'ended'){
            streams[channel].event.emit('ended');
        }else{
            
            streams[channel].event.emit('stream', message);
            var buf = new Uint8Array(message).buffer;
            var dv = new DataView(buf);
            broadcastEvent(sessionId, channel, message);
        }

    });

    ws.on('pong', () => {
        ws.isAlive = true;
    });
});

setInterval(() => {
    wss.clients.forEach(ws => {
        
        if (!ws.isAlive) return ws.terminate();
        
        ws.isAlive = false;
        ws.ping(null, false, true);
    });
}, 10000);

function broadcastEvent(sender, channel, payload){
    var users = channels[channel];
    console.log(users);
    users.forEach(usr =>{
        if(usr != sender){
            //console.log(usr);
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

              
var port = 8383;
var hostname = '0.0.0.0';
server.listen(port, hostname);

/*
server.listen(port, hostname, () => {
    console.log(`Server running at ${hostname}:${port}`);
});
*/

////////////////////////////////////////////////////////////
