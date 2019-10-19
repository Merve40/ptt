var message = document.querySelector('#message');
var button = document.querySelector('#btn-record');
var info = document.querySelector("#info-subscribe");
var subscribe = document.querySelector("#btn-subscribe");
var channelInput = document.querySelector("#input-channel");

var channel = "test";

showMessage("Connecting to server..");

ptt.connect().then((connection)=>{
    showMessage("Connection established!");

    connection.bind(button);

    function handleSubscribeSuccess(response){        
        info.textContent = `Subscribed to channel '${channel}'`;
    }

    function handleError(){
        showMessage("Could not subscribe!");
        showMessage(JSON.stringify(err));
    }

    // automatically connects to channel 'test'
    connection.subscribe(channel).then(handleSubscribeSuccess).catch(handleError);

    subscribe.onclick = (e)=>{
        if(channelInput.value.trim().length > 0){
            channel = channelInput.value.trim();
            connection.subscribe(channel).then(handleSubscribeSuccess).catch(handleError);
            channelInput.value = "";
        }
    };
    
}).catch(err=>{
    showMessage("Connection failed!");
    showMessage(JSON.stringify(err));
});

function showMessage(msg){
    message.textContent += `\n${msg}`;
}
