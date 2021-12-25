var NEAT = NEAT || {};

NEAT.Activations = {
	slope: 4.924273,
	leakiness: 0.01,

	sigmoid: function(x) {
		return 1 / (1 + Math.exp(-(NEAT.Activations.slope * x)));
	},

	linearActivation: function(x) {
		return x;
	},

	binaryStep: function(x) {
		return x < 0 ? 0 : 1;
	},

	TanH: function(x) {
		return (Math.exp(x) - Math.exp(-x)) / (Math.exp(x) + Math.exp(-x));
	},

	ReLU: function(x) {
		return x < 0 ? 0 : x;
	},

	leakyReLU: function(x) {
		return x < 0 ? x * NEAT.Activations.leakiness : x;
	}
};