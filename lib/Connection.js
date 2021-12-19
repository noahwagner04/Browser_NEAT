var NEAT = NEAT || {};

// a connection in a network
NEAT.Connection = function(inNode, outNode, weight, isRecur) {
	this.inNode = inNode;
	this.outNode = outNode;
	this.weight = weight;
	this.isRecur = isRecur;
};