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
		if(!gene.enabled) continue;

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

NEAT.Network.prototype.activate = function() {

};

NEAT.Network.prototype.reset = function() {

};

NEAT.Network.prototype.feedInputs = function(inputArray) {

};

NEAT.Network.prototype.calculateDepth = function() {

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
	if(inNode.type === NEAT.nodeTypes.INPUT) return false;

	// a que of all the nodes to be evaluated
	var nodeArray = [outNode];

	var attempts = 0;

	// of there is a node to evaluate, continue
	while(nodeArray.length > 0) {
		// the current node being evaluated
		node = nodeArray[0];

		// remove it from the node que
		nodeArray.splice(0, 1);

		/*
		if this while loop runs longer than intended, stop the function
		im mostly positive that this will never occur 
		(assuming thresh is a large enough number), just keeping it here to be safe
		*/
		if(attempts > thresh) {
			return false;
		} else if(node === inNode) {
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
				// skip over any connections that are already recurrent
				if(!connection.isRecur) {
					// add the connection's outNode to the node que
					nodeArray.push(connection.outNode);
				}
			}
		}
		attempts++;
	}
	return false;
};