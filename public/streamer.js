function Streamer(config){

    var q = [];
    var audioConfig = config;
    var playing;
    var waiting;
    var audio;
   
    init();

    function init(){
        playing = false;
        waiting = false;

        /*
        audio = new Audio();
        audio.onabort = (err)=>{
            audio.src = q.shift();
            audio.load();
            console.log(err);
        };
        audio.onerror = (err)=>{
            console.log(err);
        };
        audio.onended = (event)=>{
            console.log("onwaiting");
            console.log(audio.readyState);
            if(q.length > 0){
                audio.load();
                audio.src = q.shift();
            }else{
                waiting = true;
            }                
        }*/
    }

    function addChuck(chunk){
        var opts = {
            numChannels: audioConfig.channels, 
            sampleRate: audioConfig.sampleRate,
            bytesPerSample: audioConfig.encoding / 8
        };
        var wavBuffer = toWav(opts, chunk);
        var url = URL.createObjectURL(new Blob([wavBuffer]));
        //console.log(url);
        q.push(new Audio(url));
    }

    function play(chunk){
        addChuck(chunk);
        if(!playing){
            setTimeout(stream, 1000);
        }else if(waiting){
            stream();
        }        
    }

    function stream(){
        var a = q.shift();
        a.onended = function(e){
            if(q.length > 0){
                var ad = q.shift();
                ad.onended = this;
                ad.play();
            }else{
                waiting = true;
            }
        }
        a.play();

        /*
        if(!playing){
            audio.onloadeddata = (e)=>{
                console.log(e);
                audio.play();
                waiting = false;
            }
            console.log("playing!");
            playing = true;
        }*/
    }

    function stop(){
        init();
    }

    return{
        play,
        stop     
    }
}