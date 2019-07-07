module.exports = {

		/**
		* Get the available feedbacks.
		*
		* @returns {Object[]} the available feedbacks
		* @access public
		* @since 1.1.0
		*/

		getFeedbacks() {
			var feedbacks = {};
			console.log(this.CHOICES_LIST);
			feedbacks['encoder_started'] = {
				label: 'Change background color if the selected Encoder is running',
				description: 'If the selected encoder is active, change background color of the bank',
				options: [
					{
						type: 'colorpicker',
						label: 'Foreground color',
						id: 'fg',
						default: this.rgb(255,255,255)

					},
					{
						type: 'colorpicker',
						label: 'Background color',
						id: 'bg',
						default: this.rgb(255,0,0)
					},
					{
						type: 'dropdown',
						label: 'Encoder',
						id: 'encoder',
						default: '1',
						choices: this.CHOICES_LIST
					}
				],
				callback: (feedback, bank) => {
					if (this.activeEncoders.includes(feedback.options.encoder.toString())) {
						return {
							color: feedback.options.fg,
							bgcolor: feedback.options.bg
						};
					}
				}
			};

			return feedbacks
		}
}
