var tcp = require('../../tcp');
var instance_skel = require('../../instance_skel');
var TelnetSocket = require('../../telnet');
var debug;
var log;


function instance(system, id, config) {
	var self = this;

	// Request id counter
	self.request_id = 0;
	self.login = false;
	// super-constructor
	instance_skel.apply(this, arguments);
	self.status(1,'Initializing');
	self.actions(); // export actions

	return self;
}

instance.prototype.updateConfig = function(config) {
	var self = this;
	self.config = config;
	self.init_tcp();
};

instance.prototype.incomingData = function(data) {
	var self = this;
	debug(data);

	// Match part of the response from unit when a connection is made.
	if (self.login === false && data.match("login")) {
		self.status(self.STATUS_WARNING,'Logging in');
		self.socket.write("login 1234"+ "\n");
	}

	// Match first letter of expected response from unit.
	else if (self.login === false && data.match(" ")) {
		self.login = true;
		self.status(self.STATUS_OK);
		debug("logged in");
	}

	else {
		debug("data nologin", data);
	}
};

instance.prototype.init = function() {
	var self = this;

	debug = self.debug;
	log = self.log;

	self.init_tcp();
};

instance.prototype.init_tcp = function() {
	var self = this;
	var receivebuffer = '';

	if (self.socket !== undefined) {
		self.socket.destroy();
		delete self.socket;
		self.login = false;
	}

	if (self.config.host && self.config.port) {
		self.socket = new TelnetSocket(self.config.host, self.config.port);

		self.socket.on('status_change', function (status, message) {
			if (status !== self.STATUS_OK) {
				self.status(status, message);
			}
		});

		self.socket.on('error', function (err) {
			debug("Network error", err);
			self.log('error',"Network error: " + err.message);
		});

		self.socket.on('connect', function () {
			debug("Connected");
			self.login = false;
		});

		self.socket.on('error', function (err) {
			debug("Network error", err);
			self.log('error',"Network error: " + err.message);
			self.login = false;
		});

		// if we get any data, display it to stdout
		self.socket.on("data", function(buffer) {
			var indata = buffer.toString("utf8");
			if(indata !== undefined) {
				console.log('incomming: '+ indata);
				console.log('incomming2: '+ buffer);
			}
			self.incomingData(indata);
		});

		self.socket.on("iac", function(type, info) {
			// tell remote we WONT do anything we're asked to DO
			if (type == 'DO') {
				socket.write(new Buffer([ 255, 252, info ]));
			}

			// tell the remote DONT do whatever they WILL offer
			if (type == 'WILL') {
				socket.write(new Buffer([ 255, 254, info ]));
			}
		});
	}
};

// Return config fields for web config
instance.prototype.config_fields = function () {
	var self = this;

	return [
		{
			type: 'text',
			id: 'info',
			width: 12,
			label: 'Information',
			value: 'This will establish a telnet connection to the Ingest'
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'IP address',
			width: 12,
			default: '192.168.1.115',
			regex: self.REGEX_IP
		},
		{
			type: 'textinput',
			id: 'port',
			label: 'port number',
			width: 12,
			default: '30000',
			regex: self.REGEX_PORT
		}
	]
};

// When module gets deleted
instance.prototype.destroy = function() {
	var self = this;

	if (self.socket !== undefined) {
		self.socket.destroy();
	}

	debug("destroy", self.id);;
};

instance.prototype.actions = function(system) {
	var self = this;
	var actions = {
		'load': {
			label: 'Load project',
			options: [{
					type: 'textinput',
					label: 'path to project',
					id: 'path'
			}]
		},
		'start': {
			label: 'Start all encoders'
		},
		'stop': {
			label: 'Stop all encoders'
		},
		'split': {
			label: 'Split all encoders'
		},
		'list': {
			label: 'Show all encoders'
		}
	};

	self.setActions(actions);
}

instance.prototype.action = function(action) {

	var self = this;
	var id = action.action;
	var opt = action.options;
	var cmd;

	switch (id) {
		case 'load':
			cmd = 'Load /"'+ opt.path + '/"';
			break;

		case 'start':
			cmd = 'start';
			break;

		case 'stop':
			cmd = 'stop';
			break;

		case 'split':
			cmd = 'split';
			break;

		case 'list':
			cmd = 'list';
			break;

	}

	if (cmd !== undefined) {
			if (self.tcp !== undefined) {
					debug('sending ', cmd, "to", self.tcp.host);
					self.tcp.send(cmd);
			}
	}

	if (cmd !== undefined) {

		if (self.socket !== undefined && self.socket.connected) {
			self.socket.write(cmd+"\n");
		} else {
			debug('Socket not connected :(');
		}

	}
};

instance_skel.extendedBy(instance);
exports = module.exports = instance;
