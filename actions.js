module.exports = {

	/**
	* Get the available actions.
	*
	* @returns {Object[]} the available actions
	* @access public
	* @since 1.1.0
	*/

	getActions() {
		var actions = {};

		actions['load'] = {
			label: 'Load project',
			options: [{
					type: 'textinput',
					label: 'path to project',
					id: 'path'
			}]
		};

		actions['start']= {
			label: 'Start encoder',
			options: [{
					type: 'dropdown',
					label: 'choose encoder',
					id: 'encoderID',
					choices: this.CHOICES_LIST
			}]
		};

		actions['stop']= {
			label: 'Stop encoder',
			options: [{
					type: 'dropdown',
					label: 'choose encoder',
					id: 'encoderID',
					choices: this.CHOICES_LIST
			}]
		};

		actions['start_all'] = { label: 'Start all encoders' };

		actions['stop_all'] = { label: 'Stop all encoders' };

		actions['split'] = { label: 'Split all encoders' };

		//actions['list'] = { label: 'Show all encoders' };

		return actions;
	}
}
