var NEAT = NEAT || {};

// a population of entities
NEAT.Population = function(config) {
	// check if the user used the "new" keyword, if not, force it
	if (!(this instanceof NEAT.Population)) return new NEAT.Population(config);

	if (typeof config !== "object") {
		console.log("failed to construct NEAT.Population, didn't recieve a config object");
		return;
	}

	function castToObject(value) {
		if (typeof value !== "object") {
			return {};
		} else {
			return value;
		}
	}

	function checkIfNum(value, replacement) {
		if (typeof value !== "number" || Number.isNaN(value)) {
			return replacement;
		} else {
			return value;
		}
	}

	config.mutation = castToObject(config.mutation);

	config.mutation.weight = castToObject(config.mutation.weight);

	// weight mutation parameters
	this.mutateWeightsProb = checkIfNum(config.mutation.weight.probability, 0.8);
	this.mutationPower = checkIfNum(config.mutation.weight.power, 2.5);
	this.weightCap = checkIfNum(config.mutation.weight.cap, 8);
	this.randomizeWeightProb = checkIfNum(config.mutation.weight.randomizeProb, 0.1);

	config.mutation.node = castToObject(config.mutation.node);

	// node mutation parameters
	this.mutateNodeProb = checkIfNum(config.mutation.node.probability, 0.03);
	this.randomNodeSelection = checkIfNum(config.mutation.node.random, false);
	this.randomSplitGeneTries = checkIfNum(config.mutation.node.randomTries, 20);

	config.mutation.connection = castToObject(config.mutation.connection);

	// connection mutation parameters
	this.mutateConnectionProb = checkIfNum(config.mutation.connection.probability, 0.05);
	this.recurrentProb = checkIfNum(config.mutation.connection.recurrentProb, 0);
	this.mutateConnectionTries = checkIfNum(config.mutation.connection.tries, 20);
	this.reenableProb = checkIfNum(config.mutation.connection.reenableProb, 0.025);
	this.toggleEnableProb = checkIfNum(config.mutation.connection.toggleEnableProb, 0.03);

	config.network = castToObject(config.network);

	// network configuration parameters
	this.hiddenAcivationFunc = typeof config.network.hiddenActivation !== "function" ?
		(x) => 1 / (1 + Math.exp(-x)) :
		config.network.hiddenActivation;
	this.initialConnectivity = checkIfNum(config.network.initialConnectivity, 1);
	this.inputCount = checkIfNum(config.network.inputs, 0);
	this.outputCount = checkIfNum(config.network.outputs, 0);

	if (!this.inputCount) {
		console.log("WARNING: NEAT.Population did not recieve a valid input for network input node count");
	}

	if (!this.outputCount) {
		console.log("WARNING: NEAT.Population did not recieve a valid input for network output node count");
	}

	config.population = castToObject(config.population);

	// population parameters
	this.size = checkIfNum(config.population.size, 100);

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

	/*
	initialize the best entity to equal the first entity added, 
	since it is the first generation, and no entities have been evaluated yet, 
	it doesn't matter what the best entity is
	*/
	this.best = this.entities[0];
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

		if (!selected) {
			console.log("ERROR: failed to naturally select an entity, " +
				"make sure entities have valid numerical fitnesses, " +
				"or at least 1 entity has a fitness above 0");
			return;
		}

		// create a child of the selected entity and add it to the next generation
		nextGen[j] = selected.createChild();
	}

	// replace the last generation with this generation
	this.entities = nextGen;

	return this;
};