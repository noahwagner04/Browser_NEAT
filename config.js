var config = {

	mutation: {

		node: {
			probability: 0.01,
			random: false,
			randomTries: 20,
		},

		connection: {
			probability: 0.05,
			reenableProb: 0.025,
			toggleEnableProb: 0.03,
			recurrentProb: 0,
			tries: 20,
		},

		weight: {
			probability: 0.8,
			power: 2.5,
			cap: 8,
			randomizeProb: 0.1,
		},
	},

	network: {
		inputs: 3,
		outputs: 1,
		hiddenActivation: NEAT.Activations.leakyReLU,
		initialConnectivity: 1,
	},

	population: {
		size: 150
	},
};