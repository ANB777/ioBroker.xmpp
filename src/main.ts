/*
 * Created with @iobroker/create-adapter v2.2.1
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
import * as utils from "@iobroker/adapter-core";

// Load your modules here, e.g.:
// import * as fs from "fs";
import { Client, client, xml, jid } from "@xmpp/client";
// import { log, error, trace } from "console";
// import debug from "@xmpp/debug";


interface jidConfig {
	admin_jids: string[];
	allow_messages_from_jids: string[];
	allow_subscribe_from_jids: string[];
	send_all_messages_to_jids: string[];
}


type MessageCallback = (result?: any) => void | Promise<void>;


class Xmpp extends utils.Adapter {
	xmpp: Client = client();
	xmpp_connected = false;
	stateChange_callbacks: MessageCallback[] = [];
	jids: jidConfig = {
		admin_jids: [],
		allow_messages_from_jids: [],
		allow_subscribe_from_jids: [],
		send_all_messages_to_jids: []
	};

	public constructor(options: Partial<utils.AdapterOptions> = {}) {
		super({
			...options,
			name: "xmpp",
		});
		this.on("ready", this.onReady.bind(this));
		this.on("stateChange", this.onStateChange.bind(this));
		// this.on("objectChange", this.onObjectChange.bind(this));
		this.on("message", this.onMessage.bind(this));
		this.on("unload", this.onUnload.bind(this));
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	private async onReady(): Promise<void> {
		// Initialize your adapter here

		// Reset the connection indicator during startup
		this.setState("info.connection", false, true);
		this.xmpp_connected = true;

		// The adapters config (in the instance object everything under the attribute "native") is accessible via
		// this.log.info("config starttls: " + this.config.tls);
		// this.log.info("config port: " + this.config.port);

	if ("undefined" === typeof this.config.users || !this.config.users.length) {
			return Promise.reject()
		}
		let users
		if ("object" === typeof this.config.users) {
			users = Object.values(this.config.users)
		} else {
			users = this.config.users
		}

		const admin_jids = users
			.filter(user => user.admin)
			.map(user => user.jid)

		const allow_messages_from_jids = users
			.filter(user => user.allow_messages)
			.map(user => user.jid)

		const allow_subscribe_from_jids = users
			.filter(user => user.allow_subscribe)
			.map(user => user.jid)

		const send_all_messages_to_jids = users
			.filter(user => user.send_all_messages)
			.map(user => user.jid)

		this.jids.admin_jids = admin_jids
		this.jids.allow_messages_from_jids = allow_messages_from_jids
		this.jids.allow_subscribe_from_jids = allow_subscribe_from_jids
		this.jids.send_all_messages_to_jids = send_all_messages_to_jids



		let scheme: string;
		switch(this.config.tls) {
			case "plain":
			case "starttls":
			default:
				scheme = "xmpp"
				break;

			case "ssl":
				scheme = "xmpps"
				break;
		}

		this.xmpp = client({
			service: `${scheme}://${this.config.hostname}:${this.config.port}`,
			domain: this.config.hostname,
			resource: "iobroker+" + (Math.random() + 1).toString(36).substring(5),
			username: this.config.username,
			password: this.config.password,
		});

		// debug(this.xmpp, true);

		this.xmpp.on("error", (err) => {
			this.log.error("XMPP error: " + err);
			// error(err);
		});

		this.xmpp.on("offline", () => {
			this.setState("info.connection", false, true);
			this.xmpp_connected = false;
			this.log.info("XMPP disconnected");
			// log("offline");
		});

		this.xmpp.on("stanza", async (stanza) => {
			try {

				// log(stanza.toString())

				const sender_jid = stanza.attrs.from ? jid(stanza.attrs.from) : ""
				const sender_resource = sender_jid ? sender_jid.getResource().toString() : ""
				const sender = sender_jid ? sender_jid.bare().toString() : ""

				// log(sender)


				if (stanza.is("message")) {
					const receiver_jid = jid(stanza.attrs.to)
					const receiver = receiver_jid.bare().toString()

					// log("message")

					if(allow_messages_from_jids.includes(sender)) {
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
						}
						this.setStateAsync("last_message.object", JSON.stringify(object_last_message), true);

						// this.setState("info.connection", true, true);
					}
				} else {
					if (stanza.is("presence")) {
						if(`${this.config.username}@${this.config.hostname}` !== sender) {
							// this.xmpp.send(xml("presence", { type: "subscribe", from: `${this.config.username}@${this.config.hostname}`, to: sender  }));
						}
					}
				}

			} catch(e) {
				let error
		    if (typeof e === "string") {
		        error = e.toUpperCase()
		    } else if (e instanceof Error) {
		        error = e.message
		    }

		    if(error) {
					this.log.error(error)
					// trace();
		    }
			}
		});

		this.xmpp.on("online", async () => {
			// Makes itself available
			await this.xmpp.send(xml("presence"));

			this.setState("info.connection", true, true);
			this.xmpp_connected = true;

			// notify admins when adapter gets online
			const stanzas = admin_jids.map((address) =>
			  xml("message", { to: address, type: "chat" }, xml("body", {}, "XMPP Adapter is now online")),
			);
			await this.xmpp.sendMany(stanzas).catch(console.error);
		});

		this.xmpp.start().catch(this.log.error);





		/*
		For every state in the system there has to be also an object of type state
		Here a simple template for a boolean variable named "testVariable"
		Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
		*/
		await this.setObjectNotExistsAsync("last_message.object", {
			type: "state",
			common: {
				name: "the last received message as json object",
				type: "string",
				role: "json",
				read: true,
				write: false,
			},
			native: {},
		});
		await this.setObjectNotExistsAsync("last_message.from.resource", {
			type: "state",
			common: {
				name: "resource of user that send the last received message",
				type: "string",
				role: "text",
				read: true,
				write: false,
			},
			native: {},
		});
		await this.setObjectNotExistsAsync("last_message.from.user", {
			type: "state",
			common: {
				name: "user that send the last received message",
				type: "string",
				role: "text",
				read: true,
				write: false,
			},
			native: {},
		});
		await this.setObjectNotExistsAsync("last_message.to.user", {
			type: "state",
			common: {
				name: "user the last received message was send to",
				type: "string",
				role: "text",
				read: true,
				write: false,
			},
			native: {},
		});
		await this.setObjectNotExistsAsync("last_message.message", {
			type: "state",
			common: {
				name:" text of the last received message",
				type: "string",
				role: "text",
				read: true,
				write: false,
			},
			native: {},
		});
	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 */
	private onUnload(callback: () => void): void {
		try {
			// Here you must clear all timeouts or intervals that may still be active
			// clearTimeout(timeout1);
			// clearTimeout(timeout2);
			// ...
			// clearInterval(interval1);

			this.xmpp.send(xml("presence", { type: "unavailable" })).then(() => {
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
	private onStateChange(id: string, state: ioBroker.State | null | undefined): void {
		if (state) {
			// The state was changed
			if(state.ack && id === "last_message.object") {
				this.stateChange_callbacks.map(async (fn, i, fns) => {
					const json = state.val?.toString() ?? "null";
					fn(JSON.parse(json));
					delete fns[i];
				});
			}
			this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
		} else {
			// The state was deleted
			this.log.info(`state ${id} deleted`);
		}
	}

	// If you need to accept messages in your adapter, uncomment the following block and the corresponding line in the constructor.
	/**
	 * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
	 * Using this method requires "common.messagebox" property to be set to true in io-package.json
	 */
	private onMessage(obj: ioBroker.Message): void {
		// TODO: retry transmission
		if(!this.xmpp_connected) {
			this.log.error("XMPP not connected! refusing sendTo")
			return;
		}

		// this.log.info("received command" + JSON.stringify(obj));

		// log(obj)
		if (typeof obj === "object" && obj.message) {
			if (obj.command === "send") {
				// e.g. send email or pushover or whatever
				this.log.info("send command");


				let message = ""
				let recipients = this.jids.send_all_messages_to_jids


				switch(typeof obj.message) {
					case "string":
						message = obj.message
						break

					case "object":
						if(typeof obj.message.recipients === "object") {
							recipients =  obj.message.recipients
						} else if(typeof obj.message.to === "string") {
							recipients = [obj.message.to]
						}
						if(typeof obj.message.message === "string") {
							message = obj.message.message
						}
						break
				}

				// send the actual message
				const stanzas = recipients.map((address) =>
				  xml("message", { to: address, type: "chat" }, xml("body", {}, message)),
				);
				this.xmpp.sendMany(stanzas).catch(console.error);



				// Send response in callback if required
				if(obj.callback) {
					this.stateChange_callbacks.push((json_obj: object) => {
						this.sendTo(obj.from, obj.command, json_obj, obj.callback);
					})
				}
			}
		}
	}

}

if (require.main !== module) {
	// Export the constructor in compact mode
	module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new Xmpp(options);
} else {
	// otherwise start the instance directly
	(() => new Xmpp())();
}
