var Writable = require('web-audio-stream/writable');

(function() {
    const messages = document.querySelector('#messages');
    const wsButton = document.querySelector('#wsButton');
    const logout = document.querySelector('#logout');
    const login = document.querySelector('#login');
    const channel = document.querySelector('#channel');
    const sendMsg = document.querySelector('#send');
    const recPlay = document.querySelector('#rec-play');
    const audio = document.querySelector('audio');
    
    var q = [];

    var writable;
    var context;


    function showMessage(message) {
      messages.textContent += `\n${message}`;
      messages.scrollTop = messages.scrollHeight;
    }
  
    function handleResponse(response) {
      return response.ok
        ? response.json().then((data) => JSON.stringify(data, null, 2))
        : Promise.reject(new Error('Unexpected response'));
    }
  
    login.onclick = function() {
      fetch('/login', { method: 'POST', credentials: 'same-origin' })
        .then(handleResponse)
        .then(showMessage)
        .catch(function(err) {
          showMessage(err.message);
        });
    };
  
    logout.onclick = function() {
      fetch('/logout', { method: 'DELETE', credentials: 'same-origin' })
        .then(handleResponse)
        .then(showMessage)
        .catch(function(err) {
          showMessage(err.message);
        });
    };

    channel.onclick = () => { 
        fetch('/subscribe?channel=test', {method: 'GET', credentials: 'same-origin'})
        .then(showMessage)
        .catch(err =>{
            showMessage(err.message);
        });
    };

    let ws;
  
    wsButton.onclick = function() {
        if (ws) {
            ws.onerror = ws.onopen = ws.onclose = null;
            ws.close();
        }

        ws = new WebSocket(`ws://${location.host}`);
        ws.binaryType = 'arraybuffer';

        ws.onerror = function() {
            showMessage('WebSocket error');
        };
        ws.onopen = function() {
            showMessage('WebSocket connection established');
        };
        ws.onclose = function() {
            showMessage('WebSocket connection closed');
        };

        
        

        ws.onmessage = (e)=>{
            console.log(e.data);
            if(e.data == 'started'){
                context = new (window.AudioContext || window.webkitAudioContext)();
              
                writable = Writable(context.destination, {
                    context: context,
                    channels: 2,
                    sampleRate: context.sampleRate,
                
                    //BUFFER_MODE, SCRIPT_MODE, WORKER_MODE (pending web-audio-workers)
                    //mode: Writable.BUFFER_MODE        -> buggy: does not work
                
                    //disconnect node if input stream ends
                    autoend: false
                });

            }else if(e.data == 'stopped'){
                
            }else{

                context.decodeAudioData(e.data, (buffer)=>{
                    console.log(buffer);
                    writable.write(buffer); 
                });
                showMessage(e.data);
            }            
        }
    };

    sendMsg.onclick = () =>{
        ws.send("Hello World");   
    }

    /**
     * Audio Recording
     */
    const recordAudio = () => {
        return new Promise(resolve => {
            navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                const mediaRecorder = new MediaRecorder(stream);
                const audioChunks = [];
        
                mediaRecorder.addEventListener("dataavailable", event => {
                    audioChunks.push(event.data);
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
                    
                    return new Promise(resolve => {
                        clearInterval(interval);            
                        mediaRecorder.stop();
                    });
                };
        
                resolve({ start, stop });
            });
        });
    };

    
    recPlay.onclick = () =>{
        recordAudio()
        .then(rec =>{
            rec.start();
        
            setTimeout(async () => {
                rec.stop();
                ws.send('ended');
            }, 5000);
        });        
    }


    function onStarted(){
        /*
        audio.src = '/test/stream';
        audio.play().then(_=>{

        }).catch(err=>{
            console.log(err);
        });

        fetch('/test/stream', { method: 'POST', credentials: 'same-origin' })
            .then((res)=>{
                console.log(res);
                audio.src = URL.createObjectURL(res);
            })
            .catch(function(err) {
                console.log(err);
            });*/

        
        audio.src = '/stream/test.ogg';
        audio.play().then(_ =>{
            console.log("playing..");
        }).catch(err=>{
            console.log(err);
        });
        
        //setTimeout(handleAudioStream,1500);
    }

    function handleAudioStream(){
        audio.src = q.shift();
        audio.play().then(_ =>{
            console.log("autoplay started");
        }).catch(err =>{
            console.log(err);
        });

        audio.addEventListener('ended', (e)=>{
            console.log("audio ended!");
            if(q.length > 0){
                audio.src = q.shift();
                audio.play().then(_ =>{
                    console.log("autoplay continues");
                }).catch(err =>{
                    console.log(err);
                });
            }
        });
    }

  })();