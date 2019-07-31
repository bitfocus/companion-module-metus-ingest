var tcp           = require('../../tcp');
var instance_skel = require('../../instance_skel');
var actions       = require('./actions');
var feedback      = require('./feedback');
var instance_api  = require('./internalAPI');

var debug;
var log;

/**
 * Companion instance class for the Metus Ingets software.
 *
 * @extends instance_skel
 * @since 1.1.0
 * @author Jeffrey Davidsz <jeffrey.davidsz@vicreo.eu>
 */

class instance extends instance_skel {

	/**
	* Create an instance.
	*
	* @param {EventEmitter} system - the brains of the operation
	* @param {string} id - the instance ID
	* @param {Object} config - saved user configuration parameters
	* @since 1.1.0
	*/
	constructor(system, id, config) {
		super(system, id, config);

		this.stash        = [];
		this.command      = null;
		this.activeEncoders = [];
		this.encoders     = [];
		this.CHOICES_LIST = [];

		Object.assign(this, {
			...actions,
			...feedback,
			...instance_api
		});

		this.actions(); // export actions
	}

	/**
	 * Setup the actions.
	 *
	 * @param {EventEmitter} system - the brains of the operation
	 * @access public
	 * @since 1.1.0
	 */
	actions(system) {
		this.setActions(this.getActions());
	}

	/**
	 * Executes the provided action.
	 *
	 * @param {Object} action - the action to be executed
	 * @access public
	 * @since 1.0.0
	 */
	action(action) {
		var cmd;
		var opt = action.options;

		switch (action.action) {
			case 'load':
				cmd = 'Load /"'+ opt.path + '/"';
				break;

			case 'start':
				cmd = "start \"Encoder " + opt.encoderID + "\"";
				break;

			case 'stop':
				cmd = "stop \"Encoder " + opt.encoderID + "\"";
				break;

			case 'start_all':
				cmd = 'start';
				break;

			case 'stop_all':
				cmd = 'stop';
				break;

			case 'split':
				cmd = 'split';
				break;

			case 'list':
				cmd = 'list';
				this.encoders = [];
				break;
		}

		if (cmd !== undefined) {
			if (this.socket !== undefined && this.socket.connected) {
				debug('sending ', cmd, "to ", this.config.host);
				this.socket.send(cmd +"\x0d\x0a");
			}
		}
	}

	/**
	 * Creates the configuration fields for web config.
	 *
	 * @returns {Array} the config fields
	 * @access public
	 * @since 1.1.0
	 */
	config_fields() {

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
				regex: this.REGEX_IP
			},
			{
				type: 'textinput',
				id: 'port',
				label: 'port number',
				width: 12,
				default: '32106',
				regex: this.REGEX_PORT
			}
		]
	}

	/**
	 * Clean up the instance before it is destroyed.
	 *
	 * @access public
	 * @since 1.1.0
	 */
	destroy() {
		if (this.socket !== undefined) {
			this.socket.destroy();
		}

		debug("destroy", this.id);
	}

	/**
	 * Main initialization function called once the module
	 * is OK to start doing things.
	 *
	 * @access public
	 * @since 1.1.0
	 */
	init() {
		debug = this.debug;
		log = this.log;

		this.initFeedbacks();
		this.checkFeedbacks('encoder_started');

		this.init_tcp();
	}

	/**
	 * INTERNAL: use setup data to initalize the tcp socket object.
	 *
	 * @access protected
	 * @since 1.0.0
	 */
	init_tcp() {
		var receivebuffer = '';

		if (this.socket !== undefined) {
			this.socket.destroy();
			delete this.socket;
		}

		if (this.config.port === undefined) {
			this.config.port = 32106;
		}

		if (this.config.host) {
			this.socket = new tcp(this.config.host, this.config.port);

			this.socket.on('status_change', (status, message) => {
				this.status(status, message);
			});

			this.socket.on('error', (err) => {
				this.debug("Network error", err);
				this.log('error',"Network error: " + err.message);
			});

			this.socket.on('connect', () => {
				this.debug("Connected");
				//Whem we have connection get all encoders
				this.sendGetEncodersCommand();
			});

			// separate buffered stream into lines with responses
			this.socket.on('data', (chunk) => {
				var i = 0, line = '', offset = 0;
				receivebuffer += chunk;

				while ( (i = receivebuffer.indexOf('\n', offset)) !== -1) {
					line = receivebuffer.substr(offset, i - offset);
					offset = i + 1;
					this.socket.emit('receiveline', line.toString());
				}
				receivebuffer = receivebuffer.substr(offset);
			});

			this.socket.on('receiveline', (line) => {
				//console.log('line: '+ line);
				if (line.startsWith('Encoder')) {
					//List of encoders
					var encoderName = line.slice(0,10).trim();
					this.processInformation('addEncoder', encoderName)
				}

				else if (line.match(/stopped/gi) && line.match(/OK: OK:/gi)) {
					//stopped an encoder
					var encoderName = line.slice(line.indexOf('Encoder') + 9,line.indexOf('has') - 2);
					this.processInformation('stopped', encoderName);
				}

				else if (line.match(/started/gi) && line.match(/OK:/gi)) {
					//started an encoder
					var encoderName = line.slice(line.indexOf('Encoder') + 9,line.indexOf('has') - 2);
					this.processInformation('started', encoderName);
				}

				else {
					this.debug("weird response from ingest", line, line.length);
				}
			});

		}
	}

	/**
	 * INTERNAL: initialize feedbacks.
	 *
	 * @access protected
	 * @since 1.1.0
	 */
	initFeedbacks() {
		// feedbacks
		var feedbacks = this.getFeedbacks();

		this.setFeedbackDefinitions(feedbacks);
	}

	/**
	 * INTERNAL: Routes incoming data to the appropriate function for processing.
	 *
	 * @param {string} key - the command/data type being passed
	 * @param {Object} data - the collected data
	 * @access protected
	 * @since 1.0.0
	 */
	processInformation(key,data) {
		if (key === 'addEncoder') {
			this.encoders.push(data);
		} else if (key === 'started') {
			this.activeEncoders.push(data.slice(8).trim());
			this.checkFeedbacks('encoder_started');
		}
		else if (key === 'stopped') {
			//this.activeEncoder = parseInt(data.slice(8).trim());
			this.activeEncoders.splice(this.activeEncoders.indexOf(parseInt(data.slice(8).trim())), 1);
			this.checkFeedbacks('encoder_started');
		} else {
			// TODO: find out more
		}
		// after data proccesed
		this.setupChoices();
		this.actions();
		this.initFeedbacks();
	}

	/**
	 * INTERNAL: use model data to define the choices for the dropdowns.
	 *
	 * @access protected
	 * @since 1.1.0
	 */
	setupChoices() {

		this.CHOICES_LIST = [];

		for(var key = 0; key < this.encoders.length; key++) {
			this.CHOICES_LIST.push( { id: key+1, label: this.encoders[key].toString() } );
		}

	}

	/**
	 * Process an updated configuration array.
	 *
	 * @param {Object} config - the new configuration
	 * @access public
	 * @since 1.1.0
	 */
	updateConfig(config) {
		var resetConnection = false;

		if (this.config.host != config.host)
		{
			resetConnection = true;
		}

		this.config = config;

		this.actions();
		this.initFeedbacks();
		this.encoders = [];

		if (resetConnection === true || this.socket === undefined) {
			this.init_tcp();
		}
	}

}

exports = module.exports = instance;
