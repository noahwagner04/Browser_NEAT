var NEAT = NEAT || {};

/*
the phenotype of a genome, a basic neural network 
neural networks can have arbitrary connections, 
HIDDEN to HIDDEN, OUTPUT to HIDDEN, loops, recurrent connections, and even OUTPUT to OUTPUT
*/
NEAT.Network = function(genome) {
	// consider making a "this" check, the user might want to manually instantiate neural nets

	// assigning "this" to self to make addNode() and checkIfNodeIDExists() properly refference the instance
	var self = this;
	self.inputs = [];
	self.outputs = [];
	self.all = [];

	self.genotype = genome;
	genome.phenotype = self;

	self.depth = -1;

	// initialize attributes from the specified genome (I might make this it's own function)

	// adds a node to the correct arrays
	function addNode(node) {
		if (node.type === NEAT.nodeTypes.INPUT ||
			node.type === NEAT.nodeTypes.BIAS) {
			self.inputs.push(node);
		} else if (node.type === NEAT.nodeTypes.OUTPUT) {
			self.outputs.push(node);
		}
		self.all.push(node);
	}

	/*
	checks to see if a node with the specified id exists
	returns the node if it exists
	returns undefined if there is no node with the specified id
	*/
	function checkIfNodeIDExists(id) {
		for (var i = 0; i < self.all.length; i++) {
			var node = self.all[i];
			if (id === node.id) {
				return node;
			}
		}
	}

	// for every gene do the following
	for (var i = 0; i < genome.genes.length; i++) {
		var gene = genome.genes[i];

		// ignore the gene if it is disabled
		if (!gene.enabled) continue;

		var inNodeGene = gene.inNodeGene;
		var outNodeGene = gene.outNodeGene;
		var inNode = undefined;
		var outNode = undefined;

		// check to see if the in node gene already has a corresponding node in the network
		inNode = checkIfNodeIDExists(inNodeGene.id);

		// add the in node to the network if it doesn't already exist
		if (!inNode) {
			inNode = new NEAT.Node(inNodeGene.id, inNodeGene.type);
			addNode(inNode);
		}

		// check to see if the out node gene already has a corresponding node in the network
		outNode = checkIfNodeIDExists(outNodeGene.id);

		// add the out node to the network if it doesn't already exist
		if (!outNode) {
			outNode = new NEAT.Node(outNodeGene.id, outNodeGene.type);
			addNode(outNode);
		}

		// finally, add the connection between the nodes to the network
		outNode.addIncomming(inNode, gene.weight, gene.isRecur);
	}

};

/*
activate the network by one time step 
(activation only travels from one neuron to the next)
if there are mutiple hidden nodes, this function will have 
to be activated several times to reach the output nodes
*/
NEAT.Network.prototype.activate = function() {
	/*
	get all the weighted inputs from all the in connections on HIDDEN and OUTPUT nodes
	and add them together to get a sum that is ready to be activated
	*/
	for (var i = 0; i < this.all.length; i++) {
		var node = this.all[i];

		// if the node is an INPUT or BIAS, ignore it
		if (node.type === NEAT.nodeTypes.INPUT ||
			node.type === NEAT.nodeTypes.BIAS) {
			continue;
		}

		// reset the active sum
		node.activeSum = 0;
		var addAmount = 0;

		// add all the weighted inputs
		for (var j = 0; j < node.inConnections.length; j++) {
			var connection = node.inConnections[j];
			addAmount = connection.weight * connection.inNode.output;
			node.activeSum += addAmount;
		}
	}

	// run all the active sums through the activation function
	for (var i = 0; i < this.all.length; i++) {
		var node = this.all[i];

		// ignore INPUT and BIAS nodes
		if (node.type === NEAT.nodeTypes.INPUT ||
			node.type === NEAT.nodeTypes.BIAS) {
			continue;
		}

		// if the node is HIDDEN, use the user specified activation function
		if (node.type === NEAT.nodeTypes.HIDDEN) {
			node.activate(this.genotype.population.hiddenAcivationFunc);
		} else {
			// if the node is an OUTPUT, always use sigmoid
			node.activate(NEAT.Activations.sigmoid);
		}
	}
	return this;
};

// resets every node's activation
NEAT.Network.prototype.reset = function() {
	for (var i = 0; i < this.all.length; i++) {
		var node = this.all[i];
		node.reset();
	}
	return this;
};

/*
inputs an array of input values, mainly used for fully connected networks
as there is no way to specify what node gets what input
*/
NEAT.Network.prototype.feedInputs = function(inputArray) {
	if (!(inputArray instanceof Array)) {
		console.log("Network.feedInputs expects an input array");
		return this;
	}
	for (var i = 0; i < this.inputs.length; i++) {
		if (i >= inputArray.length) return this;
		this.inputs[i].output = inputArray[i];
	}
	return this;
};

/*
used to feed a specific input node an input,
use this function when evolving networks with disconnected inputs
if no node with the specified id is found, no error will occur
*/
NEAT.Network.prototype.feedInput = function(id, activation) {
	if (typeof id !== "number" || typeof activation !== "number") {
		console.log("Network.feedInput expects two numbers: id, and activation");
		return this;
	}
	for (var i = 0; i < this.inputs.length; i++) {
		var node = this.inputs[i];
		if (node.id === id) node.output = activation;
	}
	return this;
};

/*
calculate the depth of this network
the depth of an arbitrarily connected network can be seen 
as the amount of jumps between one neuron to the next to reach the input, 
starting at the output nodes. The largest number of steps it takes to reach 
any input node from any output node is the depth of this network 
(it can be seen as the maximum depth)

This function is used to activate networks "depth" amount of times 
so that all it's outputs have been activated. This is useful for 
classification problems, e.g. solving the XOR gate.
*/
NEAT.Network.prototype.calculateDepth = function() {

	// the amount of steps it took for each output neuron to reach the input layer
	var depths = [];

	// the current "layer" being evaluated
	var currentLayer = [];

	// the next "layer" being evaluated
	var nextLayer = [];

	/*
	NOTE: "layer" is a little misleading. A more accurate definition 
	would be a set of nodes that are equally distant from an output node 
	(i.e. INPUT nodes can be in the same "layer" as HIDDEN nodes, as long as 
	they are equally distant from a given output node).
	*/

	// for every output node...
	for (var i = 0; i < this.outputs.length; i++) {
		var output = this.outputs[i];

		// add the output node to the current layer
		currentLayer.push(output);

		// how many steps it took this output node to reach the input layer
		var depth = 0;

		/*
		to avoid getting stuck in an infinte loop (this happens when traversing a 
		network with mislabeled recurrent connections due to the toggle and 
		re-enable functions), we must have a threshold
		the maximum amount of layers a network can have is the 
		amount of nodes are in it minus 1
		*/
		var thresh = this.all.length;

		// while we still have nodes in the current layer...
		while (currentLayer.length > 0) {
			var node = currentLayer[0];

			// if the depth has passed the theoretical limit...
			if(depth > thresh) {
				//return imediatly and reset the depth attribute
				this.depth = -1;
				return this;
			}

			// remove the current node because we are evaluating it
			currentLayer.splice(0, 1);

			// for all the node's in comming connections...
			for (var j = 0; j < node.inConnections.length; j++) {
				var connection = node.inConnections[j];

				// check if the connections inNode has already been added to the next layer
				var inNextLayer = !!(nextLayer.includes(connection.inNode));

				// if the connection is not recurrent and it's inNode is not in the next layer...
				if (!connection.isRecur && !inNextLayer) {

					// add the inNode to the next layer
					nextLayer.push(connection.inNode);
				}
			}

			// if there is no more nodes in the current layer...
			if(currentLayer.length === 0) {

				// set the current layer to equal the next layer
				currentLayer = nextLayer;

				// empty the next layer
				nextLayer = [];

				// increase the depth by 1
				depth++;
			}
		}

		/*
		add this depth to the depths array
		we subtract 1 because the current layer will be filled 
		with only INPUT nodes at some point, which doesn't have any in 
		comming connections (so the next layer will be nothing), 
		but we added 1 to depth regardless
		*/
		depths.push(depth - 1)
	}

	// set the depth attribute to the largest depth in the depths array
	this.depth = Math.max.apply(Math, depths);
	
	return this;
};

/*
check if a potential connection between two given nodes is recurrent

the method of checking if a connection is recurrent is simple: 
traverse forward through the network starting at the provided outNode, 
if you end up back at the provided inNode with only traveling through 
forward connections (not recurrent ones), then the connection is recurrent
*/
NEAT.Network.checkRecur = function(inNode, outNode, thresh) {
	// connections flowing out of input nodes are always not recurrent
	if (inNode.type === NEAT.nodeTypes.INPUT ||
		inNode.type === NEAT.nodeTypes.BIAS) return false;

	// a que of all the nodes to be evaluated
	var nodeArray = [outNode];

	/*
	nodes that are waiting in the que or have already been evaluated
	this array is needed to prevent traversing over sections of a network more than once
	*/
	var lookedOver = [];

	var attempts = 0;

	// of there is a node to evaluate, continue
	while (nodeArray.length > 0) {
		// the current node being evaluated
		node = nodeArray[0];

		// remove it from the node que
		nodeArray.splice(0, 1);

		/*
		if this while loop runs longer than intended (node count squared), stop the function
		this can occur in rare cases where recurrent connections are mislabeled as not recurrent 
		(because of the toggle and re-enable functions) which could lead to this while loop running forever 
		if the true condition is never met within the threshold, we have already traversed the 
		entire network and know that this connection isn't recurrent, therefore, return false
		*/
		if (attempts > thresh) {
			return false;
		} else if (node === inNode) {
			/*
			if the current node being evaluated is equal to 
			the provided inNode, then we have ended up back where 
			we started, meaning this is a recurrent connection
			*/
			return true;
		} else {
			// for every connection flowing out of the current node...
			for (var i = 0; i < node.outConnections.length; i++) {
				var connection = node.outConnections[i];
				var alreadyChecked = !!(lookedOver.includes(connection.outNode));

				/*
				skip over any connections that are already recurrent
				if the connections outNode has already been evaluated or 
				is currently in the que, skip over the connection
				*/
				if (!connection.isRecur && !alreadyChecked) {
					// add the connection's outNode to the node que
					nodeArray.push(connection.outNode);

					// add the node to the lookedOver array as well
					lookedOver.push(connection.outNode);
				}
			}
		}

		// the node has been evaluated, add it to lookedOver array
		lookedOver.push(node);
		attempts++;
	}
	return false;
};