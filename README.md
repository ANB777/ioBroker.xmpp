![Logo](admin/xmpp.svg)
# ioBroker.xmpp

> :warning: This is a very early version tested only in my dev environment and supposably not save for production use. 
> Use at your own risk and don't expect support by me please! I'm still learning iobroker adapter development myself.

[![NPM version](https://img.shields.io/npm/v/iobroker.xmpp.svg)](https://www.npmjs.com/package/iobroker.xmpp)
[![Downloads](https://img.shields.io/npm/dm/iobroker.xmpp.svg)](https://www.npmjs.com/package/iobroker.xmpp)
![Number of Installations](https://iobroker.live/badges/xmpp-installed.svg)
![Current version in stable repository](https://iobroker.live/badges/xmpp-stable.svg)

[![NPM](https://nodei.co/npm/iobroker.xmpp.svg?downloads=true)](https://nodei.co/npm/iobroker.xmpp/)

**Tests:** ![Test and Release](https://github.com/ANB777/ioBroker.xmpp/workflows/Test%20and%20Release/badge.svg)

## xmpp adapter for ioBroker

A XMPP Client that interconnects iobroker with your XMPP server. Send messages to your account or trigger actions by messages to this bot.

### How to use

This adapter can be used in different ways:

- Send messages to the jid you set up in adapter config to receive them in iobroker objects tree.
  This way you can use messages as trigger for events in script adapter.
- Send messages right to the adapter using sendTo commandd to receive them as xmpp messages.
  You can even select recipients.
  WIP: callbacks will be supported in the future – hopefully. ;)

### sendTo Example code
```javascript
	// will send the message 'test' to all your configured users checked for *all messages*
	sendTo('xmpp.0', 'test');
	// will send the message 'This is a message to a specific jid' to *iob@your.xmpp*
	sendTo('xmpp.0', 'send', {message: 'This is a message to a specific jid', to: 'iob@your.xmpp'});
	// As above but send to more than one jid at the same time. Notice: This will not create a multi user chat.
	sendTo('xmpp.0', 'send', {message: 'This is a message to more than one jid', recipients: ['io-test@example.com', 'iob@your.xmpp']});
```

## Changelog
<!--
	Placeholder for the next version (at the beginning of the line):
	### **WORK IN PROGRESS**
-->

### **WORK IN PROGRESS**
* (ANB777) initial release

## License
MIT License

Copyright (c) 2022 ANB777 <iobroker.xmpp@txtng.eu>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
