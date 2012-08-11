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
    assert.equal(d.length, 5)
    assert.ok(d[0].Address)
    assert.ok(d[0].ESSID)
    assert.ok(d[0]['Signal level'])
}

function testWifiTowers(t, platform) {
    wifiLocation.wifiTowers({ t: t, platform: platform }, function(err, val) {
        assert(val.length > 1)
        assert.ok(val[0].ssid)
        assert.ok(val[0].mac_address)
        assert.ok(val[0].signal_strength)
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

