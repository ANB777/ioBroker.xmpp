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
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var utils = __toESM(require("@iobroker/adapter-core"));
var import_client = require("@xmpp/client");
class Xmpp extends utils.Adapter {
  constructor(options = {}) {
    super({
      ...options,
      name: "xmpp"
    });
    this.xmpp = (0, import_client.client)();
    this.xmpp_connected = false;
    this.stateChange_callbacks = [];
    this.jids = {
      admin_jids: [],
      allow_messages_from_jids: [],
      allow_subscribe_from_jids: [],
      send_all_messages_to_jids: []
    };
    this.on("ready", this.onReady.bind(this));
    this.on("stateChange", this.onStateChange.bind(this));
    this.on("message", this.onMessage.bind(this));
    this.on("unload", this.onUnload.bind(this));
  }
  async onReady() {
    this.setState("info.connection", false, true);
    this.xmpp_connected = true;
    let admin_jids = this.config.users.filter((user) => user.admin).map((user) => user.jid);
    let allow_messages_from_jids = this.config.users.filter((user) => user.allow_messages).map((user) => user.jid);
    let allow_subscribe_from_jids = this.config.users.filter((user) => user.allow_subscribe).map((user) => user.jid);
    let send_all_messages_to_jids = this.config.users.filter((user) => user.send_all_messages).map((user) => user.jid);
    this.jids.admin_jids = admin_jids;
    this.jids.allow_messages_from_jids = allow_messages_from_jids;
    this.jids.allow_subscribe_from_jids = allow_subscribe_from_jids;
    this.jids.send_all_messages_to_jids = send_all_messages_to_jids;
    var scheme;
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
      resource: "iobroker",
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
        const sender_jid = (0, import_client.jid)(stanza.attrs.from);
        const sender_resource = sender_jid.getResource().toString();
        const sender = sender_jid.bare().toString();
        const receiver_jid = (0, import_client.jid)(stanza.attrs.to);
        const receiver = receiver_jid.bare().toString();
        if (stanza.is("message")) {
          if (allow_messages_from_jids.includes(sender)) {
            let body = stanza.getChildText("body");
            this.setStateAsync("last_message.from.resource", sender_resource, true);
            this.setStateAsync("last_message.from.user", sender, true);
            this.setStateAsync("last_message.to.user", receiver, true);
            this.setStateAsync("last_message.message", body, true);
            let object_last_message = {
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
    this.xmpp.on("online", async (address) => {
      await this.xmpp.send((0, import_client.xml)("presence"));
      this.setState("info.connection", true, true);
      this.xmpp_connected = true;
      const stanzas = admin_jids.map(
        (address2) => (0, import_client.xml)("message", { to: address2, type: "chat" }, (0, import_client.xml)("body", {}, "XMPP Adapter is now online"))
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
    this.subscribeStates("testVariable");
    await this.setStateAsync("testVariable", true);
    await this.setStateAsync("testVariable", { val: true, ack: true });
    await this.setStateAsync("testVariable", { val: true, ack: true, expire: 30 });
    let result = await this.checkPasswordAsync("admin", "iobroker");
    this.log.info("check user admin pw iobroker: " + result);
    result = await this.checkGroupAsync("admin", "admin");
    this.log.info("check group user admin group admin: " + result);
  }
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
  onStateChange(id, state) {
    if (state) {
      if (state.ack && id === "last_message.object") {
        this.stateChange_callbacks.map(async (fn, i, fns) => {
          var _a, _b;
          let json = (_b = (_a = state.val) == null ? void 0 : _a.toString()) != null ? _b : "null";
          fn(JSON.parse(json));
          delete fns[i];
        });
      }
      this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
    } else {
      this.log.info(`state ${id} deleted`);
    }
  }
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
