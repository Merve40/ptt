var Writable = require('web-audio-stream/writable');

const ptt = (function() {

    var writable;
    var context;
    var ws;
  
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
            });
        });
    };
    
    return{
        connect : function(){

            const subscribe = (channel)=>{
                return fetch('/subscribe?channel='+channel, {method: 'GET'});
            };

            const bind = (button)=>{
                initRecorder().then(recorder =>{
                    
                    button.onmousedown = ()=>{
                        recorder.start();
                    };
    
                    button.onmouseup = ()=>{
                        recorder.stop();
                    };
                });
            };

            return new Promise((resolve, reject) =>{
                fetch('/login', { method: 'POST' })
                .then((r)=>{
                    ws = new WebSocket(`wss://${location.host}/wss`);
                    ws.binaryType = 'arraybuffer';

                    ws.onopen = function(){
                        resolve({subscribe, bind});
                    }

                    ws.onerror = function(e) {
                        reject(e);
                    };
                    
                    ws.onmessage = (e)=>{
                        if(e.data == 'started'){
                            context = new (window.AudioContext || window.webkitAudioContext)();
                        
                            writable = Writable(context.destination, {
                                context: context,
                                channels: 2,
                                sampleRate: context.sampleRate,
                                autoend: true
                            });

                        }else if(e.data == 'stopped'){
                            context.close();
                        }else{
                            context.decodeAudioData(e.data, (buffer)=>{
                                writable.write(buffer); 
                            });
                        }            
                    }
                })
                .catch(function(err) {
                    reject(err);
                });
            });
        }         
    }

})();