# Push-to-Talk (in development)

This is a simple push-to-talk implementation based on Websockets. It includes both the server and client implementation.          
It can be used to broadcast voice-messages in real-time to multiple users, that are subscribed to the same channel.      
Usage of this api can be found in <a href="public/index.js">index.js</a>

## Support
Client implementation is only supported on Web-browsers, that provide [AudioContext](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext#Browser_compatibility) 
and [MediaRecorder](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder#Browser_compatibility).
Web-App was tested on Chrome & Firefox (for Desktop & Android).
* does not work in any ios browsers

## Development

This project was implemented using **Node.js**    
* install [npm](https://nodejs.org/en/download) (node package manager) 
* install dependencies in project     
```bash
$ npm install
```      
* run with     
```bash
$ npm start
```


## Testing
As of recently (Oct 2019), Firefox and Chrome prohibited the access to the microphone without **https** connection. 
In order to test full functionality use [localtunnel](https://localtunnel.github.io/www/).

## Demo
https://ptt-demo.herokuapp.com

## Android Integration (in development)
see [PTT for Android](https://github.com/merve40/ptt-android) 

## iOS Integration (in development)
see [PTT for iOS](https://github.com/merve40/ptt-ios)
