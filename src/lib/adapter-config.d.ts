// This file extends the AdapterConfig type from "@types/iobroker"

// Augment the globally declared type ioBroker.AdapterConfig
declare global {
	namespace ioBroker {
		interface AdapterConfig {
			hostname: text;
			port: integer;
			tls: string;
			username: string;
			password: string;
			users: UsersConfig[];
		}
		interface UsersConfig {
			jid: string;
			allow_messages: boolean;
			allow_subscribe: boolean;
			send_all_messages: boolean;
		}
	}
}

// this is required so the above AdapterConfig is found by TypeScript / type checking
export {};
