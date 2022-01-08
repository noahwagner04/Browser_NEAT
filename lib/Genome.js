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

// adds a node on a connection, splitting it into two connections in the process
NEAT.Genome.prototype.mutateAddNode = function(tries) {
	var splitGene = undefined;

	if (this.population.randomNodeSelection) {
		// pick the gene to split randomly, this is a better option for high input networks
		var done = false;
		var attempts = 0;

		while (attempts < tries && !done) {

			// pick the gene randomly
			var randomIndex = Math.floor(Math.random() * this.genes.length);

			// set the split gene to the random gene
			splitGene = this.genes[randomIndex];

			// if the chosen gene is not enabled or it is comming from a bias node, re-pick the gene
			if (splitGene.inNodeGene.type === NEAT.nodeTypes.BIAS || !splitGene.enabled) attempts++;
			else done = true;
		}
	} else {
		/*
		pick the gene to split, biasing older genes to minimize the effect of the change 
		in other words, we don't want to split a connection that has been recently added or split
		*/
		for (var i = 0; i < this.genes.length; i++) {
			var gene = this.genes[i];

			// we don't want to split a bias gene, as it would change what node receives the bias
			if (gene.enabled === false || gene.inNodeGene.type === NEAT.nodeTypes.BIAS) continue;

			/*
			assign the split gene to the current gene
			if the statement below is never true, the split 
			gene will not be undefined
			*/
			splitGene = gene;

			// 0.7 is a partially arbitrary number
			if (Math.random() < 0.7) {
				break;
			}
		}
	}

	if (!splitGene) return;

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
	return this;
};

// adds a connection between two nodes
NEAT.Genome.prototype.mutateAddConnection = function(tries) {
	var recurThresh = this.nodeGenes.length * this.nodeGenes.length;
	var isRecur = false;
	var doRecur = false;
	var nonInputs = [];
	var validNode1Choices = [];
	var done = false;
	var attempts = 0;
	var node1 = undefined;
	var node2 = undefined;

	/*
	this is done to update the phenotype to make 
	the Network.checkRecur func work
	this function is neccessary to properly check if the 
	mutated connection is recurrent or not

	this is also needed for restricting node selection for 
	the in node of the connection being mutated (we dont want
	to pick output nodes that aren't in the network as node1)
	*/
	var network = new NEAT.Network(this);

	// decide if we should make a recurrent connection
	if (Math.random() < this.population.recurrentProb) doRecur = true;

	/*
	if doRecur is false
		create an array of node genes that only 
		excludes OUTPUT nodes that are not in the network 
	if doRecur is true
		create an array of node genes that excludes
		INPUT nodes and OUTPUT nodes that are not in the network

	This is done to prevent mutating a connection with its 
	inNode being an output node that receives no input, and 
	its outNode being some other node
	*/
	for (var i = 0; i < this.nodeGenes.length; i++) {
		var nodeGene = this.nodeGenes[i];

		// if we are mutating a recurrent connection, don't add input or bias nodes
		if (doRecur && (nodeGene.type === NEAT.nodeTypes.INPUT ||
				nodeGene.type === NEAT.nodeTypes.BIAS)) {
			continue;
		}

		// if the node is not an ouput, add it
		if (nodeGene.type !== NEAT.nodeTypes.OUTPUT) {
			validNode1Choices.push(nodeGene);
		} else {

			// only add output nodes that are in the network
			var isInNetwork = !!(network.all.find(node => node.id === nodeGene.id));
			if (isInNetwork) {
				validNode1Choices.push(nodeGene);
			}
		}
	}

	/*
	creat an array of node genes that don't include INPUT or BIAS nodes, 
	this is done to ensure we don't have connections leading to input nodes
	when picking two nodes to add a connection between
	*/
	for (var i = 0; i < this.nodeGenes.length; i++) {
		if (this.nodeGenes[i].type !== NEAT.nodeTypes.INPUT &&
			this.nodeGenes[i].type !== NEAT.nodeTypes.BIAS) {
			nonInputs.push(this.nodeGenes[i]);
		}
	}

	while (!done) {
		var index1 = 0;
		var index2 = 0;
		isRecur = false;

		if (attempts >= tries) {
			done = true;
		} else {
			attempts++;
		}

		if (doRecur) {
			if (Math.random() < 0.5) {

				// make a recurrent loop
				index1 = Math.floor(Math.random() * validNode1Choices.length);
				index2 = index1;
				isRecur = true;
			} else {

				/*
				pick randomly
				don't pick from any input node because we can't 
				have a recurrent connection that flows out from a input node (index1)
				and no connection can flow into an input node (index2)
				*/
				index1 = Math.floor(Math.random() * validNode1Choices.length);

				/*
				if we were to use the nonInputs array for this node, that means we could 
				have a chance of picking an OUTPUT node that isn't apart of the network.
				This mutation would be fine, but it isn't recurrent, so by using the
				validNode1Choices array we are restricting the chances of picking
				non-recurrent connections even further
				*/
				index2 = Math.floor(Math.random() * validNode1Choices.length);
			}

			node1 = validNode1Choices[index1];
			node2 = validNode1Choices[index2];
		} else {

			/*
			pick randomly
			this time we can choose from INPUT or BIAS nodes, as these connections aren't recurrent
			note that we only have a chance of picking an INPUT or BIAS node with the inNode (index1)
			as we don't want connections that lead to INPUT or BIAS nodes
			*/
			index1 = Math.floor(Math.random() * validNode1Choices.length);
			index2 = Math.floor(Math.random() * nonInputs.length);

			node1 = validNode1Choices[index1];
			node2 = nonInputs[index2];
		}

		// check if the gene already exists
		var redo = false;
		for (var i = 0; i < this.genes.length; i++) {
			var currentGene = this.genes[i];

			/*
			when checking if the gene already exists in our gene, we
			ignore if it is enabled or not. If the gene already 
			exists but it is disabled, we simply re-enable it if we 
			want it back in our network
			*/

			if (currentGene.inNodeGene === node1 &&
				currentGene.outNodeGene === node2) {
				redo = true;
				break;
			}
		}

		if (redo) continue;

		// check if the gene is recurrent (only check if we don't already know if the gene is recurrent)
		if (!isRecur) {

			// try to find the coorsiponding network node of node1
			var netNode1 = network.all.find(node => node.id === node1.id);

			/*
			if it doesn't exist, create a temporary network node
			this check is neccesary because this node can be an input node
			that was initialized to be dissconnected from the network
			*/
			if (!netNode1) {
				netNode1 = new NEAT.Node(node1.id, node1.type);
			}

			// try to find the coorsiponding network node of node2
			var netNode2 = network.all.find(node => node.id === node2.id);

			/*
			if it doesn't exist, create a temporary network node
			this check is neccesary because this node can be an output node 
			that was initialized to be dissconnected from the network
			*/
			if (!netNode2) {
				netNode2 = new NEAT.Node(node2.id, node2.type);
			}

			/*
			use the network nodes of the node genes to check 
			if the potential connection between the two is recurrent
			*/
			isRecur = NEAT.Network.checkRecur(netNode1, netNode2, recurThresh);
		}

		if (doRecur && !isRecur) {
			// if we are supposed to mutate a recurrent connection but failed, redo
			continue;
		} else if (!doRecur && isRecur) {
			// if we mutated a recurrent connection but we didn't want one, redo
			continue;
		}

		/*
		we have finally picked a valid gene, 
		finish by adding it to the genome
		*/
		done = true;
		this.genes.push(new NEAT.Gene(node1, node2, (Math.random() * 2 - 1) * this.population.mutationPower, isRecur, true));
	}
	return this;
};

// either perturbs or randomizes the wieghts of genes
NEAT.Genome.prototype.mutateWeights = function() {
	// loop over every gene
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
	return this;
};

// toggles the enable property of a random gene
NEAT.Genome.prototype.mutateToggleEnable = function() {

	// randomly pick the gene to enable / disable
	var randomIndex = Math.floor(Math.random() * this.genes.length);
	var toggleGene = this.genes[randomIndex];

	/*
	if the gene is enabled, we have to meet a few 
	conditions before disabling it, if these conditions 
	are not met then disabling this gene could result in 
	sections of the network being isolated from the rest
	*/
	if (toggleGene.enabled) {

		// true when the in node of the chosen gene has more than 1 outgoing connections
		var firstCondition = false;

		// true when the out node of the chosen gene has more than 1 incomming connections
		var secondCondition = false;

		// for every gene...
		for (var i = 0; i < this.genes.length; i++) {
			var gene = this.genes[i];

			// if the gene is disabled, skip over it (it isn't a part of the network)
			if (!gene.enabled) continue;

			/*
			if we find a gene who has the same in node but not the same out node as the toggleGene... 
			(we check if it has a different out node because that ensures 
			its not the same connection as the chosen toggleGene)
			*/
			if (gene.inNodeGene.id === toggleGene.inNodeGene.id && !firstCondition) {
				if (gene.outNodeGene.id === toggleGene.outNodeGene.id) continue;

				// the first condition is met
				firstCondition = true;
			}

			/*
			if we find a gene who has the same out node but not the same in node as the toggleGene... 
			(we check if it has a different in node because that ensures 
			its not the same connection as the chosen toggleGene)
			*/
			if (gene.outNodeGene.id === toggleGene.outNodeGene.id && !secondCondition) {
				if (gene.inNodeGene.id === toggleGene.inNodeGene.id) continue;

				// the second condition is met
				secondCondition = true;
			}

			// if both conditions are met, it is safe to disable this connection
			if (firstCondition && secondCondition) {
				toggleGene.enabled = false;
				break;
			}
		}
	} else {

		// simply enable a previously disabled connection (no safety checks here)
		toggleGene.enabled = true;
	}
	return this;
};

// re-enable the oldest disabled gene
NEAT.Genome.prototype.mutateReenable = function() {

	// for every gene...
	for (var i = 0; i < this.genes.length; i++) {
		var gene = this.genes[i];

		// if the gene is disabled...
		if (!gene.enabled) {

			// re-enable the gene
			gene.enabled = true;

			// stop re-enabling
			return this;
		}
	}
	return this;
};

/*
mutates this genome, does one of three mutations
1. split a connection and add a node inbetween
2. add a new connection, whether it's recurrent or not is specified by the user
3. mutate the weights of the genome
4. toggle the enable attribute of a connection
5. re-enable the enable attribute of a connection
*/
NEAT.Genome.prototype.mutate = function() {

	// if we don't have any node genes, don't mutate
	if (this.nodeGenes.length === 0) return this;

	if (Math.random() < this.population.mutateNodeProb) {
		// node mutation

		// if we have no genes, don't attempt to add a node
		if (this.genes.length === 0) return this;

		this.mutateAddNode(this.population.randomSplitGeneTries);

	} else if (Math.random() < this.population.mutateConnectionProb) {
		// connection mutation
		this.mutateAddConnection(this.population.mutateConnectionTries);
	} else {

		// weight mutation
		if (Math.random() < this.population.mutateWeightsProb) {
			this.mutateWeights();
		}

		// re-enable mutation
		if (Math.random() < this.population.reenableProb) {
			this.mutateReenable();
		}

		// toggle mutation
		if (Math.random() < this.population.toggleEnableProb) {

			// if we have no genes, don't attempt to toggle
			if (this.genes.length === 0) return this;

			this.mutateToggleEnable();
		}
	}
	return this;
};

// clone this genome
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