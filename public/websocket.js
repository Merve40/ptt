/**
 * Wrapper class for { WebSocket }.
 * 
 * @param {string} url 
 * @param {string} binaryType -> 'blob' or 'arraybuffer'
 */
function Websocket(url, binaryType="blob"){
    this.url = url;
    this.listeners = {};
    this.socketEvents = ['open', 'close', 'error', 'message'];
    
    this.socket = new WebSocket(url);
    this.readyState = this.socket.readyState;
    this.protocol = this.socket.protocol;
    this.extensions = this.socket.extensions;
    this.bufferedAmount = this.socket.bufferedAmount;
    this.binaryType = binaryType;
    this.socket.binaryType = this.binaryType;
    
    var self = this;

    var reconnect = (u) =>{
        var socket = new WebSocket(u);
        socket.binaryType = this.socket.binaryType;

        for (var e in this.socketEvents){
            for(var cb in this.listeners[e]){
                socket.addEventListener(e, cb);
            }
        }
        this.socket.addEventListener('close', closeEvent);
        this.socket = socket;
        this.dispatchEvent('reconnect', this.socket);
    }

    function closeEvent (e){
        if(e.code == 1011){
            console.log(`Could not connect to websocket. reason=${e.reason}`);
        }else{
            reconnect(self.url);
        }
    }

    this.socket.addEventListener('close', closeEvent);    
}

Websocket.prototype.addEventListener = function(event, callback){
    if(this.socketEvents.includes(event)){
        this.socket.addEventListener(event, callback);
    }
    if (!( event in this.listeners )){
        this.listeners[event] = []
    }
    this.listeners[event].push(callback);
}

Websocket.prototype.removeEventListener = function(event, callback){
    if (!( event in this.listeners )){
        return;
    }
    for (var i = 0, l = this.listeners[event].length; i < l; i++) {
        if (this.listeners[event][i] === callback){
            this.listeners[event].splice(i, 1);
            return;
        }
    }
}

Websocket.prototype.dispatchEvent = function(event, data){
    if (!( event in this.listeners )){
        return;
    }
    for(var i=0; i < this.listeners[event].length; i++){
        this.listeners[event][i].call(this, data);
    }
}

Websocket.prototype.send = function(data){
    this.socket.send(data);
}

function PTTWebsocket(url, binaryType="arraybuffer"){
    Websocket.call(this, url, binaryType);
    this.appEvents = ['started', 'stopped']

    var messageEvent = (e) =>{
        if (typeof e.data === "string"){
            
            if(e.data == 'ping'){ // keep-alive
                this.socket.send('pong');
            }else if(this.appEvents.includes(e.data)){
                this.dispatchEvent(e.data, e);
            }else{
                try{
                    var o = JSON.parse(e.data);
                    if('meta' in o){
                        this.dispatchEvent('metadata', o.meta);
                    }else{
                        // do nothing for now!
                    }
                }catch(e){
                    // do nothing!
                }
            }

        }else{
            this.dispatchEvent('binary', e.data);
        }
    }

    this.addEventListener('message', messageEvent);
}

PTTWebsocket.prototype = Object.create(Websocket.prototype);

Object.defineProperty(PTTWebsocket.prototype, 'constructor', { 
    value: PTTWebsocket, 
    enumerable: false, 
    writable: true 
});

