var childProcess = require('child_process')
var request = require('request')

function wifiTowers(callback) {
    try {
        switch (process.platform) {
        case 'darwin':
            return osxWifiTowers(function(err, val) {
                callback(err, osxParse(val))
            })
        case 'linux':
           return linuxWifiTowers(function(err, val) {
               callback(err, linuxParse(val))
           })
        default:
            throw new Error('not supported')
        }
    }
    catch(err) {
        callback(err)
    }
}

function osxWifiTowers(callback) {
    var cmd = '/System/Library/PrivateFrameworks/Apple80211.framework/Versions/A/Resources/airport -s'
    childProcess.exec(cmd, callback)
}

function osxParse(text) {
    var list = text.trim().split('\n').map(function(i) {
        var tmp = i.trim().split(/\s+/)
        if (tmp.length == 8) {
            tmp[tmp.length - 2] = tmp.slice(-2).join(' ')
            return tmp.slice(0, -1)
        }
        return tmp
    })
    return list.slice(1).map(function(i) {
        return [{}].concat(i).reduce(function(r, i, index) {
            r[list[0][index - 1]] = i
            return r
        })
    })
}

function linuxWifiTowers(callback) {
    var cmd = 'iwlist wlan0 scan'
    childProcess.exec(cmd, callback)
}

function linuxParse(text) {
    var cells = text.split(/\n\s+Cell \d\d/g).slice(1)
    return cells.map(function(i) {
        var r  = {}
        var k = null
        i.split('\n').forEach(function(j) {
            var rr = j.match(/Address: (.+)/)
            var rrSignal = j.match(/Quality:(.+)  Signal level:(.+)  Noise level:(.+)/)
            if (rr) {
                r.Address = rr[1].trim()
            }
            else if (rrSignal) {
                r.Quality = rrSignal[1].trim()
                r['Signal level'] = rrSignal[2].trim()
                r['Noise level'] = rrSignal[3].trim()
            }
            else {
                var tmp = j.split(':')
                if (tmp.length == 2) {
                    k = tmp[0].trim()
                    r[k] = tmp[1].trim().replace(/^"/, '').replace(/"$/, '')
                }
                else if (k == 'Bit Rates') {
                    r[k] += ' ' + j.trim()
                }
                else {
                    // skip
                    // console.log('skip',  j)
                }
            }
        })
        return r
    })
}

function filterWifiTowers(wifiTowers) {
    return wifiTowers.map(function(i) {
        return {
            mac_address: (i.mac_address || i.BSSID || i.Address),
            signal_strength: parseInt(i.signal_strength || i.RSSI || i['Signal level'] || -50, 10),
            age: 0
        }
    })
}

function location(opt, callback) {
    if (typeof opt == 'function' && typeof callback == 'undefined') {
        callback = opt
        opt = {}
    }
    var lang = opt.lang || (process.env['LANG'] ? process.env['LANG'].split('.')[0] : 'en_US')
    var f = opt.wifiTowers ? function(cb) { cb(null, opt.wifiTowers) } : wifiTowers
    f(function(err, val) {
        var param = {
            version: '1.1.0',
            host: 'maps.google.com',
            request_address: true,
            address_language: lang,
            wifi_towers: filterWifiTowers(val)
        }
        request.post({
            uri: 'http://www.google.com/loc/json',
            json: param
        }, function(err, res, val) {
            callback(err, val && val.location)
        })
    })
}

function parseTest() {
    var fs = require('fs')
    var path = require('path')
    var assert = require('assert')

    var t_osx = fs.readFileSync(path.join(__dirname, 'osx_wifi.txt')).toString()
    var d_osx = osxParse(t_osx)
    assert.equal(d_osx.length, 24)
    assert.ok(d_osx[0].SSID)
    assert.ok(d_osx[0].BSSID)
    assert.ok(d_osx[0].RSSI)

    var t_linux = fs.readFileSync(path.join(__dirname, 'linux_wifi.txt')).toString()
    var d_linux = linuxParse(t_linux)
    assert.equal(d_linux.length, 5)
    assert.ok(d_linux[0].Address)
    assert.ok(d_linux[0].ESSID)
    assert.ok(d_linux[0]['Signal level'])
}

exports.wifiTowers = wifiTowers
exports.osxWifiTowers = osxWifiTowers
exports.osxParse = osxParse
exports.linuxWifiTowers = linuxWifiTowers
exports.linuxParse = linuxParse
exports.filterWifiTowers = filterWifiTowers
exports.location = location
exports.parseTest = parseTest

if (process.argv[1] == __filename) {
    if (/(-t|--test)/.test(process.argv[2])) {
        parseTest()
    }
    else if (/(-w|--wifi)/.test(process.argv[2])) {
        wifiTowers(function(err, val) {
            if (err) {
                return console.log(err)
            }
            console.log(val)
        })
    }
    else if (/(-l|--location)/.test(process.argv[2])) {
        location(function(err, val) {
            if (err) {
                return console.log(err)
            }
            console.log(val)
        })
    }
}



