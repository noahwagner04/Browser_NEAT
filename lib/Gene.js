var NEAT = NEAT || {};

NEAT.Gene = function(inNodeGene, outNodeGene, weight, enabled) {
	this.inNodeGene = inNodeGene;
	this.outNodeGene = outNodeGene;
	this.weight = weight;
	this.enabled = enabled;
};