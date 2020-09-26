// Dependencies
const { setWorldConstructor } = require('@cucumber/cucumber');
const puppeteer = require('puppeteer');
const scope = require('./support/scope');
const api = require('./support/server');

const World = function () {
	scope.host = 'http://localhost:3000';
	scope.messages = api.messages;
	scope.hub = api.hub;
	scope.api = api.server;
	scope.driver = puppeteer;
	scope.context = {};
};

setWorldConstructor(World);
