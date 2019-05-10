var tcp = require('../../tcp');
var instance_skel = require('../../instance_skel');
var debug;
var log;


function instance(system, id, config) {
	var self = this;

	// super-constructor
	instance_skel.apply(this, arguments);
	self.actions(); // export actions
	return self;
}

instance.prototype.updateConfig = function(config) {
	var self = this;
	self.config = config;

	if (self.tcp !== undefined) {
		self.tcp.destroy();
		delete self.tcp;
	}
	// Listener port 10001
	if (self.config.host !== undefined) {
		self.tcp = new tcp(self.config.host, self.config.port);

		self.tcp.on('status_change', function (status, message) {
			self.status(status, message);
		});

		self.tcp.on('error', function (message) {
			// ignore for now
		});
	}
};

instance.prototype.init = function() {
	var self = this;

	debug = self.debug;
	log = self.log;

	self.status(self.STATUS_UNKNOWN);

	if (self.config.host !== undefined) {
		self.tcp = new tcp(self.config.host, self.config.port);

		self.tcp.on('status_change', function (status, message) {
			self.status(status, message);
		});

		self.tcp.on('error', function () {
			// Ignore
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
			value: 'This will establish a connection to the Ingest'
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'IP address',
			width: 12,
			default: '192.168.0.115',
			regex: self.REGEX_IP
		},
		{
			type: 'textinput',
			id: 'port',
			label: 'port number',
			width: 12,
			default: '32106',
			regex: self.REGEX_PORT
		}
	]
};

// When module gets deleted
instance.prototype.destroy = function() {
	var self = this;

		if (self.tcp !== undefined) {
			self.tcp.destroy();
		}
		debug("destroy", self.id);
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
		}/*,
		'list': {
			label: 'Show all encoders'
		}*/
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
			console.log("Send: "+cmd);
			self.tcp.send(cmd +"\x0d\x0a");
		}
	}
};

instance_skel.extendedBy(instance);
exports = module.exports = instance;
