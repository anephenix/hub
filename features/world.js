// Dependencies
import { setWorldConstructor } from "@cucumber/cucumber";
import puppeteer from "puppeteer";
import { scope } from "./support/scope.js";
import { hub, messages, server } from "./support/server/index.js";

class World {
	constructor() {
		scope.host = "http://localhost:3000";
		scope.messages = messages;
		scope.hub = hub;
		scope.api = server;
		scope.driver = puppeteer;
		scope.context = {};
	}
}

setWorldConstructor(World);
