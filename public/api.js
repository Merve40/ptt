var Writable = require('web-audio-stream/writable');

const ptt = (function() {

    var AudioContext = window.AudioContext || window.webkitAudioContext;
    var context = new AudioContext();

    var sampleDuration = 1000;
    var writable;
    var ws;
    var button;
    var id;
    var startedRecording = false;

    var streamer;
  
    const initRecorder = () => {
        return new Promise(resolve => {
            navigator.mediaDevices.getUserMedia({ 
                audio: {
                    sampleRate: 44100,
                    channelCount: 2
                }
            })
            .then(stream => {
                const mediaRecorder = new MediaRecorder(stream);
               
                mediaRecorder.addEventListener("dataavailable", event => {
                    console.log(event.data);
                    new Response(event.data).arrayBuffer().then(buffer =>{

                        // firefox does not support PCM out of the box -> needs to decode audio-data into PCM
                        context.decodeAudioData(buffer, b =>{
                            console.log(b);
                            if(startedRecording){ // sends meta-data first
                                var meta = {
                                    encoding: 32,
                                    sampleRate: b.sampleRate,
                                    channels: b.numberOfChannels,
                                    bufferSize: b.sampleRate * b.numberOfChannels // approximation based on sampleDuration
                                }
                                console.log(meta);
                                ws.send(JSON.stringify({meta}))
                                startedRecording=false;
                                return
                            }
                            var data = b.getChannelData(0).buffer;
                            ws.send(data);
                        })
                    });                    
                });

                var interval;

                var start = () => {
                    ws.send('started');
                    
                    if(mediaRecorder.state == 'recording'){
                        mediaRecorder.stop();
                    }

                    mediaRecorder.start();
                    startedRecording = true;
                    
                    interval = setInterval( () => {
                        //mediaRecorder.requestData();
                        mediaRecorder.stop();
                        mediaRecorder.start();
                    }, sampleDuration);
                                
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
                  
                    var audioConfig;

                    ws.onmessage = (e)=>{
                        var data;
                        try{
                            data = JSON.parse(e.data);
                        }catch(e){}

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

                        }else if(e.data == 'stopped'){
                            
                            if(button){
                                button.disabled = false;
                            }

                            context.close();

                        }else if(data){
                            console.log("receiving..");
                            audioConfig = data.meta;
                            //streamer = new Streamer(audioConfig);
                            
                            context = new AudioContext();
                            writable = Writable(context.destination, {
                                context: context,
                                autoend: true
                            });
                            
                        } else{

                            //streamer.play(e.data);

                            /*
                            var blob = new Blob([wavBuffer]);
                            var audio = new Audio();
                            var u = URL.createObjectURL(blob);
                            console.log(u);
                            audio.src = u;
                            audio.play();
                            */

                           var opts = {
                                numChannels: audioConfig.channels, 
                                sampleRate: audioConfig.sampleRate,
                                bytesPerSample: audioConfig.encoding / 8
                            };

                            var wavBuffer = toWav(opts, e.data);
                            context.decodeAudioData(wavBuffer, audioBuffer =>{
                                writable.write(audioBuffer);
                            });
                            
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