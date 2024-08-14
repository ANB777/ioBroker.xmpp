const path = require("path");
const { tests } = require("@iobroker/testing");


function configureAdapter(harness) {
	harness.changeAdapterConfig("xmpp", {

		native: {
			hostname: process.env.CONNECTION_HOSTNAME,
			port: parseInt(process.env.CONNECTION_PORT || "5222"),
			tls: process.env.CONNECTION_TLS,
			username: process.env.CONNECTION_USERNAME,
			password: process.env.CONNECTION_PASSWORD,
			users: JSON.parse(process.env.USERS || "[]")
		}
	});
}

// Run tests
tests.integration(path.join(__dirname, ".."), {
	//            ~~~~~~~~~~~~~~~~~~~~~~~~~
	// This should be the adapter's root directory

	// If the adapter may call process.exit during startup, define here which exit codes are allowed.
	// By default, termination during startup is not allowed.
	allowedExitCodes: [6],

	// To test against a different version of JS-Controller, you can change the version or dist-tag here.
	// Make sure to remove this setting when you're done testing.
	controllerVersion: "latest", // or a specific version like "4.0.1"

	// Define your own tests inside defineAdditionalTests
	defineAdditionalTests({ suite }) {
		// All tests (it, describe) must be grouped in one or more suites. Each suite sets up a fresh environment for the adapter tests.
		// At the beginning of each suite, the databases will be reset and the adapter will be started.
		// The adapter will run until the end of each suite.

		// Since the tests are heavily instrumented, each suite gives access to a so called "harness" to control the tests.
		suite("Test startAdapter() with config", (getHarness) => {
			// For convenience, get the current suite's harness before all tests
			let harness;
			before(() => {
				require("dotenv").config();

				harness = getHarness();

				configureAdapter(harness);
			});

			it("Should work", () => {
				return new Promise((resolve) => {
					// Start the adapter and wait until it has started
					harness.startAdapter();
					resolve(0);
				});
			});
		});

		suite("Test sendTo()", (getHarness) => {
			// For convenience, get the current suite's harness before all tests
			let harness;
			before(() => {
				require("dotenv").config();

				harness = getHarness();

				configureAdapter(harness);
			});

			it("Should work", () => {
				return new Promise((resolve) => {
					// Start the adapter and wait until it has started
					harness.startAdapterAndWait();

					// Perform the actual test:
					harness.sendTo("xmpp.0", "send", {
						to: `${process.env.CONNECTION_HOSTNAME}@${process.env.CONNECTION_USERNAME}`,
						message: "message"
					}, (resp) => {
						console.dir(resp);
						resolve(0);
					});
				});
			});
		});

		// // While developing the tests, you can run only a single suite using `suite.only`...
		// suite.only("Only this will run", (getHarness) => {
		// 	// ...
		// });
		// // ...or prevent a suite from running using `suite.skip`:
		// suite.skip("This will never run", (getHarness) => {
		// 	// ...
		// });
	},
});
