var NEAT = NEAT || {};

// a node in a network
NEAT.Node = function(id, type) {
	this.id = id; // this is only to distinguish from other nodes in the network (only a local id)
	this.type = type; // can either be BIAS, INPUT, HIDDEN, or OUTPUT

	this.inConnections = []; // a list of connections that are going into this node
	this.outConnections = []; // a list of connections that are going out of this node

	this.activeSum = 0; // the sum of all the weighted inputs
	this.output = 0; // the activeSum passed through an activation function
};

// adds an incomming connection to this node, add an outcomming connection to the specified node
NEAT.Node.prototype.addIncomming = function(node, weight, isRecur) {
	// this check might be redundent if we check when mutating to not add incomming connections to input nodes
	if (this.type === NEAT.nodeTypes.INPUT) return;
	var connection = new NEAT.Connection(node, this, weight, isRecur);
	this.inConnections.push(connection);
	node.outConnections.push(connection);
	return this;
};

// resets the node as if it wasn't activated
NEAT.Node.prototype.reset = function() {
	this.output = 0;
	this.activeSum = 0;
	return this;
};

// activates the node with a specified activation function
NEAT.Node.prototype.activate = function(activationFunc) {
	this.output = activationFunc(this.activeSum);
	return this;
};