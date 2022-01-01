var NEAT = NEAT || {};

// a population of entities
NEAT.Population = function(config) {
	if (!(this instanceof NEAT.Population)) return new NEAT.Population(config);

	// do type checking with every single attribute

	// weight mutation parameters
	this.mutateWeightsProb = config.mutation.weight.probability;
	this.mutationPower = config.mutation.weight.power;
	this.weightCap = config.mutation.weight.cap;
	this.randomizeWeightProb = config.mutation.weight.randomizeProb;

	// node mutation parameters
	this.mutateNodeProb = config.mutation.node.probability;
	this.randomNodeSelection = config.mutation.node.random;
	this.randomSplitGeneTries = config.mutation.node.randomTries;

	// connection mutation parameters
	this.mutateConnectionProb = config.mutation.connection.probability;
	this.recurrentProb = config.mutation.connection.recurrentProb;
	this.mutateConnectionTries = config.mutation.connection.tries;
	this.reenableProb = config.mutation.connection.reenableProb;
	this.toggleEnableProb = config.mutation.connection.toggleEnableProb;

	// network configuration parameters
	this.hiddenAcivationFunc = config.network.hiddenActivation;
	this.initialConnectivity = config.network.initialConnectivity;
	this.inputCount = config.network.inputs;
	this.outputCount = config.network.outputs;

	// population parameters
	this.size = config.population.size;

	this.entities = [];

	this.best = undefined;

	this.highestFitness = 0;

	// initialize population, spawn the first generation
	this.init();
};

// creates an initial generation
NEAT.Population.prototype.init = function() {
	for (var i = 0; i < this.size; i++) {
		this.entities.push(new NEAT.Entity(this));
	}
	return this;
};

// selects an entity, biases entities with higher fitness
NEAT.Population.prototype.naturallySelectEntity = function() {
	var sum = 0;

	// make an array of fitnesses, each fitness is the sum of all before it
	var cumulativeBias = this.entities.map(function(x) {
		sum += x.fitness;
		return sum;
	});

	// randomly pick a value between 0 - all fittness combined
	var choice = Math.random() * sum;

	// get the entity
	for (var i = 0; i < cumulativeBias.length; i++) {
		if (cumulativeBias[i] > choice) return this.entities[i];
	}
};

// get the best preforming entity
NEAT.Population.prototype.updateBestEntity = function() {

	// for ever entity...
	for (var i = 0; i < this.entities.length; i++) {
		var entity = this.entities[i];

		// if its fitness is higher than the highest recored fitness...
		if (entity.fitness > this.highestFitness) {

			// set highest fitness to its fitness
			this.highestFitness = entity.fitness;

			// make it the best preforming entity,
			this.best = entity;
		}
	}
	return this;
};

// makes the next generation of entities
NEAT.Population.prototype.calcNextGen = function() {

	// update the best preforming entity before the next gen
	this.updateBestEntity();

	var nextGen = [];

	// for population size amount of times...
	for (var j = 0; j < this.size; j++) {

		// select better preforming entities
		var selected = this.naturallySelectEntity();

		// create a child of the selected entity and add it to the next generation
		nextGen[j] = selected.createChild();
	}

	// replace the last generation with this generation
	this.entities = nextGen;

	return this;
};