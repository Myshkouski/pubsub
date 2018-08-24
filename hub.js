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

class Hub {
  constructor(options = {}) {
    this._channelNames = {}
    this._subscriptions = {}
    this._muted = {}

    this._separator = options.separator || DEFAULT_SEPARATOR
    this._linked = options.linked || false

    if (this._linked) {
      this._parentChannelNames = {}
      this._childChannelNames = {}
    }

    var hub = this

    hub._ee = []
    hub._eeChannels = {}
    hub._eeSubscriptionsCount = []
    hub._eeListeningEventNames = []
    hub._eePublishers = []
    hub._eeSubscribers = {}
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
    hub._eeChannels[channelName] = []
    hub._eeSubscribers[channelName] = []
  }

  remove(channelName, removeChildChannels) {
    var hub = this

    channelName = _normalizeChannelName(channelName, hub._separator)
    if (channelName in hub._channelNames) {
      var channelNames = [channelName]
      if (hub._linked && removeChildChannels) {
        var childChannelNames = hub._childChannelNames
        for (var name in childChannelNames) {
          channelNames.push(name)
        }
      }

      for (var nameIndex in channelNames) {
        channelName = channelNames[nameIndex]
        var eventEmitters = [].concat(hub._eeChannels[channelName])
        for (var index in eventEmitters) {
          hub.disconnect(channelName, eventEmitters[index])
        }

        delete hub._channelNames[channelName]
        delete hub._subscriptions[channelName]
        if (this._linked) {
          delete hub._childChannelNames[channelName]
          delete hub._parentChannelNames[channelName]
        }
        delete hub._eeChannels[channelName]
        delete hub._eeSubscribers[channelName]

      }
    }

    return false
  }

  subscribe(channelName, subscriber) {
    var hub = this

    channelName = _normalizeChannelName(channelName, hub._separator)
    if (channelName in hub._channelNames) {
      var subscribers = hub._subscriptions[channelName]

      if (!~subscribers.indexOf(subscriber)) {
        subscribers.push(subscriber)
        return true
      }
    }

    return false
  }

  wait(channelName, subscriber) {
    var hub = this

    function _subscriber() {
      hub.unsubscribe(channelName, _subscriber)
      subscriber.apply(hub, arguments)
    }

    return hub.subscribe(channelName, _subscriber)
  }

  unsubscribe(channelName) {
    var hub = this

    channelName = _normalizeChannelName(channelName, hub._separator)
    if (channelName in hub._channelNames) {
      var subscribers = hub._subscriptions[channelName]
      if (1 in arguments) {
        var subscriber = arguments[1]
        return subscribers.splice(subscribers.indexOf(subscriber), 1)
      } else {
        return subscribers.splice(index, subscribers.length)
      }
    }

    return false
  }

  publish(channelName, applyFilter, ...args) {
    var hub = this

    channelName = _normalizeChannelName(channelName, hub._separator)
    if (channelName in hub._channelNames) {
      var subscribers = [].concat(hub._subscriptions[channelName])

      if (hub._linked) {
        var parentChannels = hub._childChannelNames[channelName]
        for (var parentChannelName in parentChannels) {
          subscribers = subscribers.concat(hub._subscriptions[parentChannelName])
        }
      }

      if (subscribers.length) {
        subscribers = subscribers.filter(subscriber => applyFilter(subscriber))
        // setImmediate(() => {
        for (var index in subscribers) {
          var subscriber = subscribers[index]
          subscriber.call(undefined, ...args)
        }
        // })

        return subscribers.length
      }
    }

    return false
  }

  broadcast(channelName, ...args) {
    return this.publish(channelName, () => true, ...args)
  }

  connect(channelName, eventEmitter, eventNames) {
    eventNames = Object.assign({
      message: 'message',
      broadcast: 'broadcast'
    }, eventNames || {})

    var hub = this

    channelName = _normalizeChannelName(channelName, hub._separator)
    if (channelName in hub._channelNames) {
      var eeSubscriber

      var index = hub._eeChannels[channelName].indexOf(eventEmitter)

      if (!~index) {
        hub._eeChannels[channelName].push(eventEmitter)

        eeSubscriber = function _eeSubscriber(...args) {
          eventEmitter.emit(eventNames.broadcast, channelName, ...args)
        }
      } else {
        eeSubscriber = hub._eeSubscribers[channelName][index]
      }

      var hubIndex = hub._ee.indexOf(eventEmitter)

      if (!~hubIndex) {
        function _eePublisher(channelName, ...args) {
          channelName = _normalizeChannelName(channelName, hub._separator)
          if (channelName in hub._channelNames) {
            var channelIndex = hub._eeChannels[channelName].indexOf(eventEmitter)
            if (~channelIndex) {
              var eeSubscriber = hub._eeSubscribers[channelName][channelIndex]
              hub.publish(channelName, subscriber => subscriber !== eeSubscriber, ...args)
            }
          }
        }

        eventEmitter.on(eventNames.message, _eePublisher)

        hubIndex = hub._ee.length

        hub._ee.push(eventEmitter)
        hub._eeSubscriptionsCount.push(0)
        hub._eeListeningEventNames.push(eventNames.message)
        hub._eePublishers.push(_eePublisher)
      }

      if (!~hub._subscriptions[channelName].indexOf(eeSubscriber)) {
        hub._subscriptions[channelName].push(eeSubscriber)
        hub._eeSubscriptionsCount[hubIndex]++;
        hub._eeSubscribers[channelName].push(eeSubscriber)
      }
    }
  }

  disconnect(channelName, eventEmitter) {
    var hub = this

    channelName = _normalizeChannelName(channelName, hub._separator)
    if (channelName in hub._channelNames) {
      var hubIndex = hub._ee.indexOf(eventEmitter)
      if (~hubIndex) {
        var eeSubscriber = hub._eeSubscribers[channelName][hubIndex]
        hub._subscriptions[channelName].splice(hub._subscriptions[channelName].indexOf(eeSubscriber), 1)
        var channelIndex = hub._eeChannels[channelName].indexOf(eventEmitter)
        hub._eeSubscribers[channelName].splice(channelIndex, 1)

        hub._eeChannels[channelName].splice(channelIndex, 1)
        if (!--hub._eeSubscriptionsCount[hubIndex]) {
          var eePublisher = hub._eePublishers[hubIndex]
          hub._eePublishers.splice(hubIndex, 1)
          hub._eeSubscriptionsCount.splice(hubIndex, 1)
          eventEmitter.removeListener(hub._eeListeningEventNames[hubIndex], eePublisher)
          hub._eeListeningEventNames.splice(hubIndex, 1)
          hub._ee.splice(hubIndex, 1)
        }
      }
    }
  }
}

module.exports = Hub
