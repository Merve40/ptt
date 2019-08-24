var Writable = require('web-audio-stream/writable');

const ptt = (function() {

    var writable;
    var context;
    var ws;
    var button;
    var id;
  
    const initRecorder = () => {
        return new Promise(resolve => {
            navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                const mediaRecorder = new MediaRecorder(stream);
               
                mediaRecorder.addEventListener("dataavailable", event => {
                    ws.send(event.data);
                });

                var interval;

                var start = () => {
                    ws.send('started');
                    
                    if(mediaRecorder.state == 'recording'){
                        mediaRecorder.stop();
                    }

                    mediaRecorder.start();
                    interval = setInterval( () => {
                        mediaRecorder.stop();
                        mediaRecorder.start();
                    }, 1000);            
                };
        
                var stop = () => {                  
                    clearInterval(interval);
                    mediaRecorder.stop();   
                    setTimeout(()=>{
                        ws.send('stopped');
                    }, 1200);
                };
        
                resolve({ start, stop });
            }).catch(err=>{
                console.error(err);
            });
        }).catch(err =>{
            console.error(err);
        });
    };
    
    return{
        connect : function(){

            const subscribe = (channel)=>{
                return fetch(`/subscribe?channel=${channel}&id=${id}`, {method: 'GET'});
            };

            const bind = (btn)=>{
                button = btn;
                initRecorder().then(recorder =>{
                    
                    button.onpointerdown = ()=>{
                        recorder.start();
                    };
    
                    button.onpointerup = ()=>{
                        recorder.stop();
                    };
                });
            };

            return new Promise((resolve, reject) =>{
                fetch('/login', { method: 'GET' })
                .then((r)=>r.json()).then(data=>{
                    id = data.id;
                
                    var reconnect = ()=>{
                        var socket = new WebSocket(`wss://${location.host}/wss?id=${id}`);
                        socket.binaryType = ws.binaryType;
                        socket.onopen = ws.onopen;
                        socket.onerror = ws.onerror;
                        socket.onmessage = ws.onmessage;
                        socket.onclose = ws.onclose;
                        ws = socket;
                    }

                    ws = new WebSocket(`wss://${location.host}/wss?id=${id}`);
                    ws.binaryType = 'arraybuffer';

                    ws.onopen = function(){
                        resolve({subscribe, bind});
                    }

                    ws.onerror = function(e) {
                        reject(e);
                    };

                    ws.onclose = function(e){
                        if(e.code == 1011 || e.code == 1006){
                            var msg = `Could not connect to websocket. reason=${e.reason}`;
                            console.log(msg);
                            reject({error: msg});
                        }else{
                            console.log(e);
                            reconnect();
                        }                
                    }
                    
                    ws.onmessage = (e)=>{
                        if(e.data == 'ping'){
                            ws.send('pong');
                        }else if(e.data == 'started'){

                            if(button){
                                button.disabled = true;
                            }

                            if (context){
                                if(context.state == 'running'){
                                    context.close();
                                }
                            }

                            context = new (window.AudioContext || window.webkitAudioContext)();
                        
                            writable = Writable(context.destination, {
                                context: context,
                                //channels: 2,
                                //sampleRate: context.sampleRate,
                                autoend: true
                            });

                        }else if(e.data == 'stopped'){
                            context.close();

                            if(button){
                                button.disabled = false;
                            }

                        }else{
                            if (context.state == 'running'){
                                context.decodeAudioData(e.data, (buffer)=>{
                                    writable.write(buffer); 
                                });
                            }                            
                        }            
                    }

                    /*
                    setInterval(()=>{
                        if(ws.readyState == 3 || ws.readyState == 2){
                            reconnect();
                        }
                    }, 5000);
                    */
                })
                .catch(function(err) {
                    reject(err);
                });
            });
        }         
    }

})();