var fs = require('fs')
var path = require('path')
var assert = require('assert')
var wifiLocation = require(path.join(__dirname, '..', 'lib', 'wifi_location'))

function testParseAirpotOutput(t) {
    var d = wifiLocation.parseAirportOutput(t)
    assert.ok(d.length > 1)
    assert.ok(d.every(function(i) { return i.SSID && i.BSSID && i.RSSI }))
}

function testParseIwlistOutput(t) {
    var d = wifiLocation.parseIwlistOutput(t)
    assert.ok(d.length > 1)
    assert.ok(d.every(function(i) { return i.ESSID && i.Address && i['Signal level'] }))
}

function testWifiTowers(t, platform) {
    wifiLocation.wifiTowers({ t: t, platform: platform }, function(err, val) {
        assert.ok(val.length > 1)
        assert.ok(val.every(function(i) { return i.ssid && i.mac_address && i.signal_strength }))
    })
}

function loadOutputText(file) {
    return fs.readFileSync(path.join(__dirname, file)).toString()
}

testParseAirpotOutput(loadOutputText('osx_airport_output.txt'))
testParseAirpotOutput(loadOutputText('osx_airport_output_ibss.txt'))
testParseIwlistOutput(loadOutputText('linux_iwlist_output.txt'))
testParseIwlistOutput(loadOutputText('linux_iwlist_output_eq.txt'))
testWifiTowers(loadOutputText('osx_airport_output.txt'), 'darwin')
testWifiTowers(loadOutputText('linux_iwlist_output.txt'), 'linux')
testWifiTowers(loadOutputText('linux_iwlist_output_eq.txt'), 'linux')

