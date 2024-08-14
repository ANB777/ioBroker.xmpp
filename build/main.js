"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var utils = __toESM(require("@iobroker/adapter-core"));
var import_client = require("@xmpp/client");
class Xmpp extends utils.Adapter {
  xmpp = (0, import_client.client)();
  xmpp_connected = false;
  stateChange_callbacks = [];
  jids = {
    admin_jids: [],
    allow_messages_from_jids: [],
    allow_subscribe_from_jids: [],
    send_all_messages_to_jids: []
  };
  constructor(options = {}) {
    super({
      ...options,
      name: "xmpp"
    });
    this.on("ready", this.onReady.bind(this));
    this.on("stateChange", this.onStateChange.bind(this));
    this.on("message", this.onMessage.bind(this));
    this.on("unload", this.onUnload.bind(this));
  }
  /**
   * Is called when databases are connected and adapter received configuration.
   */
  async onReady() {
    this.setState("info.connection", false, true);
    this.xmpp_connected = true;
    if ("undefined" === typeof this.config.users || !this.config.users.length) {
      return Promise.reject();
    }
    let users;
    if ("object" === typeof this.config.users) {
      users = Object.values(this.config.users);
    } else {
      users = this.config.users;
    }
    const admin_jids = users.filter((user) => user.admin).map((user) => user.jid);
    const allow_messages_from_jids = users.filter((user) => user.allow_messages).map((user) => user.jid);
    const allow_subscribe_from_jids = users.filter((user) => user.allow_subscribe).map((user) => user.jid);
    const send_all_messages_to_jids = users.filter((user) => user.send_all_messages).map((user) => user.jid);
    this.jids.admin_jids = admin_jids;
    this.jids.allow_messages_from_jids = allow_messages_from_jids;
    this.jids.allow_subscribe_from_jids = allow_subscribe_from_jids;
    this.jids.send_all_messages_to_jids = send_all_messages_to_jids;
    let scheme;
    switch (this.config.tls) {
      case "plain":
      case "starttls":
      default:
        scheme = "xmpp";
        break;
      case "ssl":
        scheme = "xmpps";
        break;
    }
    this.xmpp = (0, import_client.client)({
      service: `${scheme}://${this.config.hostname}:${this.config.port}`,
      domain: this.config.hostname,
      resource: "iobroker+" + (Math.random() + 1).toString(36).substring(5),
      username: this.config.username,
      password: this.config.password
    });
    this.xmpp.on("error", (err) => {
      this.log.error("XMPP error: " + err);
    });
    this.xmpp.on("offline", () => {
      this.setState("info.connection", false, true);
      this.xmpp_connected = false;
      this.log.info("XMPP disconnected");
    });
    this.xmpp.on("stanza", async (stanza) => {
      try {
        const sender_jid = stanza.attrs.from ? (0, import_client.jid)(stanza.attrs.from) : "";
        const sender_resource = sender_jid ? sender_jid.getResource().toString() : "";
        const sender = sender_jid ? sender_jid.bare().toString() : "";
        if (stanza.is("message")) {
          const receiver_jid = (0, import_client.jid)(stanza.attrs.to);
          const receiver = receiver_jid.bare().toString();
          if (allow_messages_from_jids.includes(sender)) {
            const body = stanza.getChildText("body");
            this.setStateAsync("last_message.from.resource", sender_resource, true);
            this.setStateAsync("last_message.from.user", sender, true);
            this.setStateAsync("last_message.to.user", receiver, true);
            this.setStateAsync("last_message.message", body, true);
            const object_last_message = {
              "from.resource": sender_resource,
              "from.user": sender,
              "to.user": receiver,
              "message": body
            };
            this.setStateAsync("last_message.object", JSON.stringify(object_last_message), true);
          }
        } else {
          if (stanza.is("presence")) {
            if (`${this.config.username}@${this.config.hostname}` !== sender) {
            }
          }
        }
      } catch (e) {
        let error;
        if (typeof e === "string") {
          error = e.toUpperCase();
        } else if (e instanceof Error) {
          error = e.message;
        }
        if (error) {
          this.log.error(error);
        }
      }
    });
    this.xmpp.on("online", async () => {
      await this.xmpp.send((0, import_client.xml)("presence"));
      this.setState("info.connection", true, true);
      this.xmpp_connected = true;
      const stanzas = admin_jids.map(
        (address) => (0, import_client.xml)("message", { to: address, type: "chat" }, (0, import_client.xml)("body", {}, "XMPP Adapter is now online"))
      );
      await this.xmpp.sendMany(stanzas).catch(console.error);
    });
    this.xmpp.start().catch(this.log.error);
    await this.setObjectNotExistsAsync("last_message.object", {
      type: "state",
      common: {
        name: "the last received message as json object",
        type: "string",
        role: "json",
        read: true,
        write: false
      },
      native: {}
    });
    await this.setObjectNotExistsAsync("last_message.from.resource", {
      type: "state",
      common: {
        name: "resource of user that send the last received message",
        type: "string",
        role: "text",
        read: true,
        write: false
      },
      native: {}
    });
    await this.setObjectNotExistsAsync("last_message.from.user", {
      type: "state",
      common: {
        name: "user that send the last received message",
        type: "string",
        role: "text",
        read: true,
        write: false
      },
      native: {}
    });
    await this.setObjectNotExistsAsync("last_message.to.user", {
      type: "state",
      common: {
        name: "user the last received message was send to",
        type: "string",
        role: "text",
        read: true,
        write: false
      },
      native: {}
    });
    await this.setObjectNotExistsAsync("last_message.message", {
      type: "state",
      common: {
        name: " text of the last received message",
        type: "string",
        role: "text",
        read: true,
        write: false
      },
      native: {}
    });
  }
  /**
   * Is called when adapter shuts down - callback has to be called under any circumstances!
   */
  onUnload(callback) {
    try {
      this.xmpp.send((0, import_client.xml)("presence", { type: "unavailable" })).then(() => {
        this.xmpp.stop().then(() => {
          callback();
        });
      });
    } catch (e) {
      callback();
    }
  }
  /**
   * Is called if a subscribed state changes
   */
  onStateChange(id, state) {
    if (state) {
      if (state.ack && id === "last_message.object") {
        this.stateChange_callbacks.map(async (fn, i, fns) => {
          var _a, _b;
          const json = (_b = (_a = state.val) == null ? void 0 : _a.toString()) != null ? _b : "null";
          fn(JSON.parse(json));
          delete fns[i];
        });
      }
      this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
    } else {
      this.log.info(`state ${id} deleted`);
    }
  }
  // If you need to accept messages in your adapter, uncomment the following block and the corresponding line in the constructor.
  /**
   * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
   * Using this method requires "common.messagebox" property to be set to true in io-package.json
   */
  onMessage(obj) {
    if (!this.xmpp_connected) {
      this.log.error("XMPP not connected! refusing sendTo");
      return;
    }
    if (typeof obj === "object" && obj.message) {
      if (obj.command === "send") {
        this.log.info("send command");
        let message = "";
        let recipients = this.jids.send_all_messages_to_jids;
        switch (typeof obj.message) {
          case "string":
            message = obj.message;
            break;
          case "object":
            if (typeof obj.message.recipients === "object") {
              recipients = obj.message.recipients;
            } else if (typeof obj.message.to === "string") {
              recipients = [obj.message.to];
            }
            if (typeof obj.message.message === "string") {
              message = obj.message.message;
            }
            break;
        }
        const stanzas = recipients.map(
          (address) => (0, import_client.xml)("message", { to: address, type: "chat" }, (0, import_client.xml)("body", {}, message))
        );
        this.xmpp.sendMany(stanzas).catch(console.error);
        if (obj.callback) {
          this.stateChange_callbacks.push((json_obj) => {
            this.sendTo(obj.from, obj.command, json_obj, obj.callback);
          });
        }
      }
    }
  }
}
if (require.main !== module) {
  module.exports = (options) => new Xmpp(options);
} else {
  (() => new Xmpp())();
}
//# sourceMappingURL=main.js.map
