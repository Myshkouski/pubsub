var DEFAULT_SEPARATOR = '.'

function _stringifyKeys(array) {
  return array.map(key => key + '')
}

function _filterEmptyKeys(array) {
  return array.filter(key => key.length)
}

function _parseChannelName(string, separator) {
  return _filterEmptyKeys(string.split(separator))
}

function _stringifyChannelName(array, separator) {
  return array.join(separator)
}

function _normalizeChannelName(channelName, separator) {
  if (Array.isArray(channelName)) {
    channelName = _stringifyChannelName(channelName, separator)
  } else {
    if (typeof channelName != 'string') {
      channelName = '' + channelName
    }

    channelName = _stringifyChannelName(_parseChannelName(channelName, separator), separator)
  }

  return channelName
}

function _publish(subscribers, ...args) {
  if (subscribers.length) {
    setImmediate(() => {
      for (var index in subscribers) {
        var subscriber = subscribers[index]
        subscriber.call(undefined, ...args)
      }
    })
  }

  return subscribers.length
}

class Token {
  constructor(hub, channelName, subscriber) {
    this._hub = hub
    this._channelName = channelName
    this._subscriber = subscriber
  }

  get channel() {
    return this._channelName
  }

  broadcast(...args) {
    this._hub.broadcast(this, ...args)
  }

  unsubscribe() {
    this._hub.unsubscribe(this)
  }
}

class Hub {
  static normalizeName() {
    return _normalizeChannelName.apply(this, arguments)
  }

  constructor(options = {}) {
    var hub = this

    hub._channelNames = {}
    hub._subscriptions = {}
    hub._muted = {}

    hub._separator = options.separator || DEFAULT_SEPARATOR
    hub._linked = options.linked || false

    if (hub._linked) {
      hub._parentChannelNames = {}
      hub._childChannelNames = {}
    }

    // hub._ee = []
    // hub._eeChannels = {}
    // hub._eeSubscriptionsCount = []
    // hub._eeListeningEventNames = []
    // hub._eePublishers = []
    // hub._eeSubscribers = {}

    hub._tokens = {}
  }

  create(channelName) {
    var hub = this

    channelName = _normalizeChannelName(channelName, hub._separator)
    if (channelName in hub._subscriptions) {
      return false
    }

    var parsedChannelName = _parseChannelName(channelName, hub._separator)

    if (hub._linked) {
      hub._childChannelNames[channelName] = {}
      hub._parentChannelNames[channelName] = {}
      for (var existedChannelName in hub._channelNames) {
        var existedChannelParsedName = hub._channelNames[existedChannelName]

        var matches = true
        var iterateOver, compareTo
        var parentName, childName
        if (parsedChannelName.length < existedChannelParsedName.length) {
          iterateOver = parsedChannelName
          compareTo = existedChannelParsedName
          parentName = channelName
          childName = existedChannelName
        } else if (existedChannelParsedName.length < parsedChannelName.length) {
          iterateOver = existedChannelParsedName
          compareTo = parsedChannelName
          parentName = existedChannelName
          childName = channelName
        } else {
          continue
        }

        for (var index in iterateOver) {
          if (iterateOver[index] !== compareTo[index]) {
            matches = false
            break
          }
        }

        if (matches) {
          hub._childChannelNames[parentName][childName] = 1
          hub._parentChannelNames[childName][parentName] = 1
        }
      }
    }

    hub._channelNames[channelName] = parsedChannelName
    hub._subscriptions[channelName] = []
    // hub._eeChannels[channelName] = []
    // hub._eeSubscribers[channelName] = []

    hub._tokens[channelName] = []
  }

  remove(channelName) {
    var hub = this

    channelName = _normalizeChannelName(channelName, hub._separator)
    if (channelName in hub._channelNames) {
      var channelNames = [channelName]
      if (hub._linked) {
        var childChannelNames = hub._childChannelNames
        for (var name in childChannelNames) {
          channelNames.push(name)
        }
      }

      for (var nameIndex in channelNames) {
        channelName = channelNames[nameIndex]
        // var eventEmitters = [].concat(hub._eeChannels[channelName])
        // for (var index in eventEmitters) {
        //   hub.disconnect(channelName, eventEmitters[index])
        // }

        var tokens = [].concat(hub._tokens[channelName])
        for (var index in tokens) {
          hub.unsubscribe(token[index])
        }

        delete hub._tokens[channelName]
        delete hub._channelNames[channelName]
        delete hub._subscriptions[channelName]
        if (this._linked) {
          delete hub._childChannelNames[channelName]
          delete hub._parentChannelNames[channelName]
        }
        // delete hub._eeChannels[channelName]
        // delete hub._eeSubscribers[channelName]
      }
    }

    return false
  }

  subscribe(channelName, subscriber) {
    var hub = this

    channelName = _normalizeChannelName(channelName, hub._separator)
    if (channelName in hub._channelNames) {
      var subscribers = hub._subscriptions[channelName]

      const token = new Token(hub, channelName, subscriber)

      subscribers.push(subscriber)
      hub._tokens[channelName].push(token)

      return token
    }

    return null
  }

  wait(channelName, subscriber) {
    var hub = this

    function _subscriber() {
      hub.unsubscribe(channelName, _subscriber)
      subscriber.apply(hub, arguments)
    }

    return hub.subscribe(channelName, _subscriber)
  }

  unsubscribe(token) {
    var hub = this

    if (token._hub === hub) {
      var channelName = token._channelName
      if (channelName in hub._channelNames) {
        var index = hub._subscriptions[channelName].indexOf(token._subscriber)
        if (~index) {
          hub._subscriptions[channelName].splice(index, 1)
          hub._tokens[channelName].splice(index, 1)
          return true
        }
      }
    }

    return false
  }

  broadcast(token, ...args) {
    var hub = this

    if (token && (token._hub === hub)) {
      var channelName = token._channelName

      if (channelName in hub._channelNames) {
        var index = hub._subscriptions[channelName].indexOf(token._subscriber)
        if (~index) {
          var subscribers = [].concat(hub._subscriptions[channelName])
          subscribers.splice(index, 1)

          if (hub._linked) {
            var childChannels = hub._childChannelNames[channelName]
            for (var childChannelName in childChannels) {
              subscribers = subscribers.concat(hub._subscriptions[childChannelName])
            }
          }

          return _publish.call(hub, subscribers, ...args)
        }
      }
    }

    return 0
  }

  publish(channelName, ...args) {
    var hub = this

    channelName = _normalizeChannelName(channelName, hub._separator)
    if (channelName in hub._channelNames) {
      var subscribers = [].concat(hub._subscriptions[channelName])

      if (hub._linked) {
        var childChannels = hub._childChannelNames[channelName]
        for (var childChannelName in childChannels) {
          subscribers = subscribers.concat(hub._subscriptions[childChannelName])
        }
      }

      return _publish.call(hub, subscribers, ...args)
    }

    return 0
  }
}

module.exports = Hub
