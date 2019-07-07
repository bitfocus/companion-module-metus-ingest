module.exports = {

	/**
	 * INTERNAL: returns the desired input object.
	 *
	 * @param {number} id - the input to fetch
	 * @returns {Object} the desired input object
	 * @access protected
	 * @since 1.1.0
	 */

	sendGetEncodersCommand() {
		this.encoders = [];
		if (this.socket !== undefined && this.socket.connected) {
			console.log('sending request to '+ this.config.host);
			this.socket.send("list\x0d\x0a");
		}
	}
}
