var childProcess = require('child_process')
var request = require('request')

function wifiTowers(opt, callback) {
    if (typeof opt == 'function' && typeof callback == 'undefined') {
        callback = opt
        opt = {}
    }

    switch (opt.platform || process.platform) {
    case 'darwin':
        return osxWifiTowers(opt, callback)
    case 'linux':
        return linuxWifiTowers(opt, callback)
    default:
        return callback(new Error('not supported'))
    }
}

function osxWifiTowers(opt, callback) {
    if (typeof opt == 'function' && typeof callback == 'undefined') {
        callback = opt
        opt = {}
    }

    var cmd = '/System/Library/PrivateFrameworks/Apple80211.framework/Versions/A/Resources/airport -s'
    var f = opt.t ? function(cb) { cb(null, opt.t) } : childProcess.exec.bind(childProcess, cmd)
    f(function(err, val) {
        if (err) {
            return callback(err)
        }
        try {
            callback(err, parseAirportOutput(val).map(function(i) {
                return {
                    ssid: i.SSID,
                    mac_address: i.BSSID,
                    signal_strength: parseInt(i.RSSI, 10)
                }
            }))
        }
        catch(err) {
            callback(err)
        }
    })
}

function parseAirportOutput(text) {
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

function linuxWifiTowers(opt, callback) {
    if (typeof opt == 'function' && typeof callback == 'undefined') {
        callback = opt
        opt = {}
    }

    var cmd = 'iwlist wlan0 scan'
    var f = opt.t ? function(cb) { cb(null, opt.t) } : childProcess.exec.bind(childProcess, cmd)
    f(function(err, val) {
        if (err) {
            return callback(err)
        }
        try {
            callback(err, parseIwlistOutput(val).map(function(i) {
                return {
                    ssid: i.ESSID,
                    mac_address: i.Address,
                    signal_strength: parseInt(i['Signal level'], 10)
                }
            }))
        }
        catch(err) {
            callback(err)
        }
    })
}

function parseIwlistOutput(text) {
    var cells = text.split(/\n\s+Cell \d\d/g).slice(1)
    return cells.map(function(i) {
        var r  = {}
        var k = null
        i.split('\n').forEach(function(j) {
            var rr = j.match(/Address: (.+)/)
            if (rr) {
                r.Address = rr[1].trim()
            }
            else if (j.match(/Quality.+Signal level/)){
                var rrSignal = j.match(/Quality[:=](.+)\s+Signal level[:=](.+)/)
                r.Quality = rrSignal[1].trim()
                r['Signal level'] = rrSignal[2].trim()
                var rrSignalNoise = j.match(/Noise level[:=](.+)/)
                if(rrSignalNoise) r['Noise level'] = rrSignalNoise[1].trim()
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
            wifi_towers: val.map(function(i) {
                return {
                    mac_address: i.mac_address,
                    signal_strength: i.signal_strength,
                    age: 0
                }
            })
        }
        request.post({
            uri: 'http://www.google.com/loc/json',
            json: param
        }, function(err, res, val) {
            callback(err, val && val.location)
        })
    })
}

function test() {
    var fs = require('fs')
    var path = require('path')
    var assert = require('assert')

    var t_osx = fs.readFileSync(path.join(__dirname, 'osx_wifi.txt')).toString()
    var d_osx = parseAirportOutput(t_osx)
    assert.equal(d_osx.length, 24)
    assert.ok(d_osx[0].SSID)
    assert.ok(d_osx[0].BSSID)
    assert.ok(d_osx[0].RSSI)

    var t_linux = fs.readFileSync(path.join(__dirname, 'linux_wifi.txt')).toString()
    var d_linux = parseIwlistOutput(t_linux)
    assert.equal(d_linux.length, 5)
    assert.ok(d_linux[0].Address)
    assert.ok(d_linux[0].ESSID)
    assert.ok(d_linux[0]['Signal level'])

    wifiTowers({ t: t_osx, platform: 'darwin' }, function(err, val) {
        assert.equal(val.length, 24)
        assert.ok(val[0].ssid)
        assert.ok(val[0].mac_address)
        assert.ok(val[0].signal_strength)
    })
    wifiTowers({ t: t_linux, platform: 'linux' }, function(err ,val) {
        assert.equal(val.length, 5)
        assert.ok(val[0].ssid)
        assert.ok(val[0].mac_address)
        assert.ok(val[0].signal_strength)
    })
}

exports.wifiTowers = wifiTowers
exports.osxWifiTowers = osxWifiTowers
exports.parseAirportOutput = parseAirportOutput
exports.linuxWifiTowers = linuxWifiTowers
exports.parseIwlistOutput = parseIwlistOutput
exports.location = location

if (process.argv[1] == __filename) {
    if (/(-t|--test)/.test(process.argv[2])) {
        test()
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
