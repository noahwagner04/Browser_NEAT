var NEAT = NEAT || {};

/*
the genotype of a node
only used to make genome cloning easier
also neccesary for networks that start with some inputs disconnected
*/
NEAT.NodeGene = function(id, type) {
	this.id = id;
	this.type = type;
};