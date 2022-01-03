var NEAT = NEAT || {};

// this class represents the agents that are going to evolve
NEAT.Entity = function(object) {

	// consider making a "this" context check

	if (object instanceof NEAT.Genome) {

		// if the input object is a genome, simply make our genome equal to it
		this.genome = object;
	} else if (object instanceof NEAT.Population) {

		/*
		if the input object is a population, create a basic initial genome, 
		as we are the frist generation in this population
		*/

		var id = 1;
		var nodeGenes = [];
		var genes = [];

		// create the bias node with an id of 0
		nodeGenes.push(new NEAT.NodeGene(0, NEAT.nodeTypes.BIAS));

		// create all the input gene nodes
		for (var i = 0; i < object.inputCount; i++) {
			var nodeGene = undefined;

			// create an input node gene whose id is in the range 1 - inputCount (0 is always going to be the bias node)
			nodeGene = new NEAT.NodeGene(id, NEAT.nodeTypes.INPUT);

			// push it to the nodeGenes array
			nodeGenes.push(nodeGene);

			// increment the id
			id++;
		}

		// create the output node genes
		for (var i = 0; i < object.outputCount; i++) {
			var nodeGene = new NEAT.NodeGene(id, NEAT.nodeTypes.OUTPUT);
			nodeGenes.push(nodeGene);
			id++;
		}

		// for every input node...
		for(var i = 0; i < nodeGenes.length; i++) {
			var inNodeGene = nodeGenes[i];
			if (inNodeGene.type === NEAT.nodeTypes.OUTPUT) continue;

			// loop over output node and...
			for(var j = 0; j < nodeGenes.length; j++) {
				var outNodeGene = nodeGenes[j];

				/*
				if this node is equal to inNodeGene, 
				or if it is an input / bias node, 
				or by random chance, 
				skip making this connection
				*/
				if (Math.random() > object.initialConnectivity ||
					outNodeGene === inNodeGene ||
					outNodeGene.type === NEAT.nodeTypes.INPUT ||
					outNodeGene.type === NEAT.nodeTypes.BIAS) continue;

				// make the connection gene if none of the conditions above were met
				var gene = new NEAT.Gene(inNodeGene, outNodeGene, (Math.random() * 2 - 1) * 5, false, true);
				genes.push(gene);
			}
		}

		// create the genome
		this.genome = new NEAT.Genome(nodeGenes, genes, object);
	} else {
		return;
	}

	this.brain = new NEAT.Network(this.genome);

	// calculate the depth of the network 
	this.brain.calculateDepth();

	this.fitness = 0;
};

// feeds an input array to this entity's brain, each index corresponds to an input node
NEAT.Entity.prototype.feedSensoryInputs = function(inputArray) {

	// for every input given...
	for (var i = 0; i < inputArray.length; i++) {
		var input = inputArray[i];

		/*
		the id of the input node we are going to activate
		we add 1 because we don't want to activate the 
		bias node, whose id is always going to be 0
		*/
		var id = i + 1;

		// if the input is not a number, don't feed it to the network
		if(typeof input !== "number" || Number.isNaN(input)) {
			console.log("WARNING: attempted to input a value that is not a number at index " + i);
			continue;
		}

		// feed the activation to the coorisponding input node 
		this.brain.feedInput(id, inputArray[i]);
	}
	return this;
};

// make a new entity with this genome but mutated
NEAT.Entity.prototype.createChild = function() {
	return new NEAT.Entity(this.genome.clone().mutate());
};