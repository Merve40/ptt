var message = document.querySelector('#message');
var button = document.querySelector('#btn-record');

showMessage("Connecting to server..");

ptt.connect().then((connection)=>{
    showMessage("Connection established!");

    connection.subscribe("test")
        .then(response=>{
            connection.bind(button);
            /**
             * connects to channel 'test' for demonstration purposes
             */
            showMessage("Subscribed to channel 'test'");
        }).catch(err=>{
            console.log(err);
            showMessage("Could not subscribe!");
        });
    
}).catch(err=>{
    console.log(err);
    showMessage("Connection failed!");
});

function showMessage(msg){
    message.textContent += `\n${msg}`;
}