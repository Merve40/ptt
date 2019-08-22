# Push-to-Talk 

This is a simple push-to-talk implementation based on Websockets.     
It can be used to broadcast voice-messages in real-time to multiple users, that are subscribed to the same channel.      
Usage of this api can be found in <a href="public/index.js">index.js</a>

## Support
Currently this is only supported on Web-browsers, that provide [AudioContext](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext#Browser_compatibility) 
and [MediaRecorder](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder#Browser_compatibility).
Web-App was tested on Chrome & Firefox (Desktop & Android).

## Development

This project was implemented using **Node.js**    
* install [npm](https://nodejs.org/en/download) (node package manager) 
* install dependencies in project `npm install`      



In order to test outside of the network check out [localtunnel](https://localtunnel.github.io/www/)

## Demo
https://ptt-demo.herokuapp.com

## Android Integration
see [PTT for Android](https://github.com/merve40/ptt-android) 
