var message = document.querySelector('#message');
var button = document.querySelector('#btn-record');

showMessage("Connecting to server..");

ptt.connect().then((connection)=>{
    showMessage("Connection established!");

    /**
     * connects to channel 'test' for demonstration purposes
     */
    connection.subscribe("test")
        .then(response=>{
            connection.bind(button);
            
            showMessage("Subscribed to channel 'test'");
        }).catch(err=>{
            showMessage("Could not subscribe!");
            showMessage(JSON.stringify(err));
        });
    
}).catch(err=>{
    showMessage("Connection failed!");
    showMessage(JSON.stringify(err));
});

function showMessage(msg){
    message.textContent += `\n${msg}`;
}
