var NEAT = NEAT || {};
/*
represents the genotype of a network
it has two basic functionalities, to mutate and clone itself
*/
NEAT.Genome = function(nodeGenes, genes, population) {
	// consider making a "this" check, the user might want to manually instantiate genomes
	this.nodeGenes = nodeGenes; // list of node genes
	this.genes = genes; // list of connection genes

	this.population = population; // a refference to the population, only used for user specified mutation parameters

	this.phenotype = undefined; // a refference to the network
};

/*
mutates this genome, does one of three mutations
1. split a connection and add a node inbetween
2. add a new connection, whether it's recurrent or not is specified by the user
3. mutate the weights of the genome
I might make these three separate functions later
*/
NEAT.Genome.prototype.mutate = function(tries) {

	// if we have no genes, don't mutate
	if (this.genes.length === 0) return;

	// if we don't have any node genes, don't mutate
	if (this.nodeGenes.length === 0) return;

	if (Math.random() < this.population.mutateNodeProb) {
		// node mutation
		var splitGene = undefined;
		/*
		pick the gene to split, biasing older genes to minimize the effect of the change 
		in other words, we don't want to split a connection that has been recently added or split
		*/
		for (var i = 0; i < this.genes.length; i++) {
			var gene = this.genes[i];
			// we don't want to split a bias gene, as it would change what node receives the bias
			if (gene.enabled === false || gene.inNodeGene.type === NEAT.nodeTypes.BIAS) continue;
			// 0.7 is a partially arbitrary number
			if (Math.random() < 0.7) {
				splitGene = gene;
				break;
			}
			// just use the last gene if we are at the end of the gene list
			splitGene = gene;
		}

		splitGene.enabled = false;

		var newNodeGene = new NEAT.NodeGene(this.nodeGenes[this.nodeGenes.length - 1].id + 1, NEAT.nodeTypes.HIDDEN);

		// add the new nodeGene to the nodeGenes array
		this.nodeGenes.push(newNodeGene);

		/*
		if the connection split was recurrent, then lable one of the genes as recurrent
		otherwise, if the connection split wasn't recurrent, both new connections are also not recurrent
		the first new connection recieves a weight of 1 to minimize the effect of the mutation
		*/
		var newGene1 = new NEAT.Gene(splitGene.inNodeGene, newNodeGene, 1, splitGene.isRecur, true);
		var newGene2 = new NEAT.Gene(newNodeGene, splitGene.outNodeGene, splitGene.weight, false, true);

		// add the new genes to the genes array
		this.genes.push(newGene1);
		this.genes.push(newGene2);

	} else if (Math.random() < this.population.mutateConnectionProb) {
		// connection mutation
		var recurThresh = this.nodeGenes.length * this.nodeGenes.length;
		var isRecur = false;
		var doRecur = false;
		var nonInputs = [];
		var done = false;
		var attempts = 0;
		var node1 = undefined;
		var node2 = undefined;

		/*
		creat an array of node genes that are not of type INPUT, 
		this is done to ensure we don't have connections leading to input nodes
		when picking two nodes to add a connection between
		*/
		for (var i = 0; i < this.nodeGenes.length; i++) {
			if (this.nodeGenes[i].type !== NEAT.nodeTypes.INPUT) {
				nonInputs.push(this.nodeGenes[i]);
			}
		}

		if (Math.random() < this.population.recurrentProb) doRecur = true;

		while (!done) {
			var index1 = 0;
			var index2 = 0;
			var redo = false;

			if (attempts >= tries) done = true;

			if (doRecur) {
				if (Math.random() < 0.5) {
					// make a recurrent loop
					index1 = Math.floor(Math.random() * nonInputs.length);
					index2 = index1;
				} else {
					/*
					pick randomly
					don't pick from any input node because we can't 
					have a recurrent connection that flows out from a input node (index1)
					and no connection can flow into an input node (index2)
					*/
					index1 = Math.floor(Math.random() * nonInputs.length);
					index2 = Math.floor(Math.random() * nonInputs.length);
				}

				node1 = nonInputs[index1];
				node2 = nonInputs[index2];
			} else {
				/*
				pick randomly
				this time we can choose from INPUT nodes, as these connections aren't recurrent
				note that we only have a chance of picking an INPUT node with the inNode (index1)
				as we don't want connections that lead to input nodes
				*/
				index1 = Math.floor(Math.random() * this.nodeGenes.length);
				index2 = Math.floor(Math.random() * nonInputs.length);

				node1 = this.nodeGenes[index1];
				node2 = nonInputs[index2];
			}

			// check if gene already exists
			for (var i = 0; i < this.genes.length; i++) {
				var currentGene = this.genes[i];
				if (currentGene.inNodeGene === node1 &&
					currentGene.outNodeGene === node2) {
					redo = true;
					break;
				}
			}

			// check if the gene is recurrent
			// var network = new NEAT.Network(this);

			if (redo) {
				attempts++;
			} else {
				done = true;
				this.genes.push(new NEAT.Gene(node1, node2, (Math.random() * 2 - 1) * this.population.mutationPower, isRecur, true));
			}
		}
	} else if (Math.random() < this.population.mutateWeightsProb) {
		// weight mutation
		for (var i = 0; i < this.genes.length; i++) {
			var gene = this.genes[i];
			if (Math.random() < this.population.randomizeWeightProb) {
				// randomize this gene's weight from a range of -mutationPower to +mutationPower
				gene.weight = (Math.random() * 2 - 1) * this.population.mutationPower;
			} else {
				// offset this gene's weight by a number in a range of -mutationPower to +mutationPower
				gene.weight += (Math.random() * 2 - 1) * this.population.mutationPower;
			}
			// cap the weight between a specified range
			if (gene.weight > this.population.weightCap) {
				gene.weight = this.population.weightCap;
			} else if (gene.weight < -this.population.weightCap) {
				gene.weight = -this.population.weightCap;
			}
		}
	}
};

// clone this genome with slight mutation
NEAT.Genome.prototype.clone = function() {
	var nodeGenesCloned = [];
	var genesCloned = [];

	// clone the node gene array
	for (var i = 0; i < this.nodeGenes.length; i++) {
		var nodeGene = this.nodeGenes[i];
		var clonedNodeGene = new NEAT.NodeGene(nodeGene.id, nodeGene.type);
		nodeGenesCloned.push(clonedNodeGene);
	}

	// clone the connection gene array, use the newly cloned node genes for in / out node refferences
	for (var i = 0; i < this.genes.length; i++) {
		var gene = this.genes[i];
		// find the newly cloned in / out node genes using their id's
		var inCloned = nodeGenesCloned.find(nodeGene => nodeGene.id === gene.inNodeGene.id);
		var outCloned = nodeGenesCloned.find(nodeGene => nodeGene.id === gene.outNodeGene.id);
		var clonedGene = new NEAT.Gene(inCloned, outCloned, gene.weight, gene.isRecur, gene.enabled);
		genesCloned.push(clonedGene);
	}

	// create the new genome with the cloned gene arrays
	return new NEAT.Genome(nodeGenesCloned, genesCloned, this.population)
};