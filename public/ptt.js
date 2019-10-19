/**
 * Push-to-Talk object.
 */
const ptt = (function(){

    var websocket;
    var audiostream;
    var button;
    var id;

    return{
        connect : function(){
            const subscribe = (channel)=>{
                return fetch(`/subscribe?channel=${channel}&id=${id}`, {method: 'GET'});
            };

            /**
             * Binds UI button to ptt.
             * @param {HTMLElement} btn 
             */
            const bind = (btn)=>{
                button = btn;
                audiostream.getRecorder().then(recorder =>{
                    
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
                    var player;
                    var url = `wss://${location.host}/wss?id=${id}`;
                    websocket = new PTTWebsocket(url, "arraybuffer");
                    audiostream = new AudioStream(websocket, {});
                    
                    websocket.addEventListener('open', event =>{
                        resolve({subscribe, bind});
                    });

                    websocket.addEventListener('error', event =>{
                        reject(event);
                    });

                    websocket.addEventListener('reconnect', socket=>{
                        console.log("web-socket reconnected!");
                    });

                    websocket.addEventListener('started', event =>{
                        if(button){
                            button.disabled = true;
                        }
                    });

                    websocket.addEventListener('stopped', event =>{
                        if(button){
                            button.disabled = false;
                        }
                        player.stop();
                    });

                    websocket.addEventListener('metadata', metadata=>{
                        player = audiostream.getNewPlayer(metadata);
                    });

                    websocket.addEventListener('binary', buffer=>{
                        player.play(buffer);
                    });

                }).catch(function(err) {
                    reject(err);
                });
            });
        }
    }
})();