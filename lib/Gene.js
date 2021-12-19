var NEAT = NEAT || {};

// a simple data type that represents the genotype of a single connection
NEAT.Gene = function(inNodeGene, outNodeGene, weight, isRecur, enabled) {
	this.inNodeGene = inNodeGene;
	this.outNodeGene = outNodeGene;
	this.weight = weight;
	this.isRecur = isRecur;
	this.enabled = enabled;
};