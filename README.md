# Node Wifi Location

Find a current location by surrounding WiFi and Google Map API.
A port of wifi_location(https://github.com/shokai/wifi_location) to Node.js.

## Install

    npm install wifi_location

## Sample code

    var wifiLocation = require('wifi_location')
    
    wifiLocation.wifiTowers(function(err, val) {
        console.log(err, val)
    })
    
    wifiLocation.location(function(err, val) {
        console.log(err, val)
    })

## License

Apache License Version 2.0

## See more

https://github.com/shokai/wifi_location
http://shokai.org/blog/archives/6399
http://blog.64p.org/entry/2012/07/21/082209
http://unknownplace.org/memo/2012/07/21/1/

