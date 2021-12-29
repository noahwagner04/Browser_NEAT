function createGenome(inputs, outputs, population) {
	var id = 0;
	var nodeGenes = [];
	var genes = [];
	for (var i = 0; i < inputs; i++) {
		var nodeGene = undefined;
		if (i === 0) {
			nodeGene = new NEAT.NodeGene(id, NEAT.nodeTypes.BIAS);
		} else {
			nodeGene = new NEAT.NodeGene(id, NEAT.nodeTypes.INPUT);
		}
		nodeGenes.push(nodeGene);
		id++;
	}

	for (var i = 0; i < outputs; i++) {
		var nodeGene = new NEAT.NodeGene(id, NEAT.nodeTypes.OUTPUT);
		nodeGenes.push(nodeGene);
		id++;
	}

	nodeGenes.forEach(nodeGene => {
		if (nodeGene.type === NEAT.nodeTypes.OUTPUT) return;
		nodeGenes.forEach(nodeGene1 => {
			if (nodeGene1 === nodeGene ||
				nodeGene1.type === NEAT.nodeTypes.INPUT ||
				nodeGene1.type === NEAT.nodeTypes.BIAS) return;
			var gene = new NEAT.Gene(nodeGene, nodeGene1, (Math.random() * 2 - 1) * 5, false, true);
			genes.push(gene);
		});
	});
	return new NEAT.Genome(nodeGenes, genes, population);
}

function testNodeClone(nodeGene, clone) {
	var keys = Object.keys(clone);
	for (var key = 0; key < keys.length; key++) {
		if (clone[keys[key]] === nodeGene[keys[key]]) {
			continue;
		} else {
			console.log(`${keys[key]}: ${clone[keys[key]]}`, `${keys[key]}: ${nodeGene[keys[key]]}`);
			return false;
		}
	}
	return true;
}

function testGeneClone(gene, clone) {
	var keys = Object.keys(clone);
	for (var key = 0; key < keys.length; key++) {
		if (keys[key] === "inNodeGene" || keys[key] === "outNodeGene") {
			if (testNodeClone(clone[keys[key]], gene[keys[key]])) {
				continue;
			} else {
				console.log(`${keys[key]}: ${clone[keys[key]]}`, `${keys[key]}: ${gene[keys[key]]}`);
				return false;
			}
		} else if (clone[keys[key]] === gene[keys[key]]) {
			continue;
		} else {
			console.log(`${keys[key]}: ${clone[keys[key]]}`, `${keys[key]}: ${gene[keys[key]]}`);
			return false;
		}
	}
	return true;
}

function testGenomeClone(genome, clone) {
	var i = 0;
	var genesCheck = true;
	var nodeGenesCheck = true;
	clone.nodeGenes.forEach(nodeGene => {
		if (testNodeClone(nodeGene, genome.nodeGenes[i])) {
			i++;
			return;
		} else {
			console.log(nodeGene, genome.nodeGenes[i]);
			nodeGenesCheck = false;
		}
		i++;
	});
	i = 0;
	clone.genes.forEach(gene => {
		if (testGeneClone(gene, genome.genes[i])) {
			i++;
			return;
		} else {
			console.log(gene, genome.genes[i]);
			genesCheck = false;
		}
		i++;
	});
	return genesCheck && nodeGenesCheck
}

function testCloneFunction(amount) {
	for (var i = 0; i < amount; i++) {
		var genome = createGenome(Math.floor(Math.random() * 10 + 1), Math.floor(Math.random() * 10 + 1));
		var clone = genome.clone();
		if (testGenomeClone(genome, clone)) {
			continue;
		} else {
			console.log("test failed", genome, clone);
			return;
		}
	}
	console.log("test succeeded");
}

function printGenome(genome) {
	var clone = genome.clone();
	clone.genes.forEach(gene => {
		var inNode = gene.inNodeGene;
		var outNode = gene.outNodeGene;
		gene.inNodeGene = `id: ${inNode.id} type: ${inNode.type}`;
		gene.outNodeGene = `id: ${outNode.id} type: ${outNode.type}`;
	});
	console.table(clone.genes);
}

function testGenomeToNetwork(genome, network) {
	var connections = [];
	var enabledGenes = [];
	var passed = true;

	// get all the connections from the network and put them into an array
	network.all.forEach(node => {
		node.inConnections.forEach(connection => {
			connections.push({ in: connection.inNode.id,
				out: connection.outNode.id
			});
		});
	});

	genome.genes.forEach(gene => {
		if (gene.enabled) {
			enabledGenes.push(gene);
		}
	});

	// find the gene from the genome that matches each connection
	connections.forEach(connection => {
		var match = enabledGenes.find(gene => {
			if (gene.inNodeGene.id === connection.in &&
				gene.outNodeGene.id === connection.out) {
				return true;
			}
		});

		if (!match) {
			console.log("test failed", connection);
			passed = false;
		}
	});

	// compare the gene length with the amount of connections
	if (connections.length !== enabledGenes.length) {
		console.log("test failed, genome gene count is " + genome.genes.length + " while network connection count is " + connections.length, network, genome);
		passed = false;
	}

	if (passed) {
		return true;
	} else {
		return false;
	}
}

function testNetworkConstruction(trials) {
	for (var i = 0; i < trials; i++) {
		var genome = createGenome(Math.floor(Math.random() * 10 + 1), Math.floor(Math.random() * 10 + 1));
		for (var j = 0; j < 10; j++) {
			genome.mutate(20);
		}
		var network = new NEAT.Network(genome);
		if (!testGenomeToNetwork(genome, network)) {
			console.log("test failed", genome, network);
			return;
		}
	}
	console.log("test succeeded");
}

function XORTest(populationNum, amount, genome) {
	var genomes = [];
	var inputs = [
		[1, 0, 0],
		[1, 1, 0],
		[1, 0, 1],
		[1, 1, 1]
	];
	for (var i = 0; i < populationNum; i++) {
		genomes.push(genome.clone().mutate());
	}
	var winner = undefined;
	var heighestFit = 0;
	for (var i = 0; i < amount; i++) {
		// evaluate the current gen
		for (var j = 0; j < genomes.length; j++) {
			shuffle(inputs);
			var genome = genomes[j];
			genome.fitness = 0;

			var network = new NEAT.Network(genome);
			network.calculateDepth();

			for (var k = 0; k < 4; k++) {
				var input = inputs[k];

				network.feedInputs(input);

				for (var l = 0; l < network.depth; l++) {
					network.activate();
				}
				genome.fitness += evaluateOutput(network.outputs[0].output, input);
				network.reset();
			}
			genome.fitness *= genome.fitness;
			if (genome.fitness > heighestFit) {
				heighestFit = genome.fitness;
				winner = genome;
				console.log(i);
				if (heighestFit > 15.25) {
					console.log("training complete");
					return winner;
				}
			}
		}
		if (i === amount - 1) break;
		// breed the next gen
		var tempGenomes = [];
		for (var j = 0; j < populationNum; j++) {
			var selected = naturallySelectGenome(genomes);
			tempGenomes[j] = selected.clone().mutate();
		}
		genomes = tempGenomes;
	}
	console.log("training failed");
	return winner;
}

function evaluateOutput(output, input) {
	var answer = 0;
	if ((input[1] === 1 && input[2] === 0) || (input[1] === 0 && input[2] === 1)) {
		answer = 1;
	} else if ((input[1] === 0 && input[2] === 0) || (input[1] === 1 && input[2] === 1)) {
		answer = 0;
	}
	return 1 - Math.abs(answer - output);
}

function naturallySelectGenome(genomes) {
	var sum = 0;
	var cumulativeBias = genomes.map(function(x) {
		sum += x.fitness;
		return sum;
	});
	var choice = Math.random() * sum;

	for (var i = 0; i < cumulativeBias.length; i++) {
		if (cumulativeBias[i] > choice) return genomes[i];
	}
}

function testNetworkPreformance(network) {
	var score = 0;
	var inputs = [
		[1, 0, 0],
		[1, 1, 0],
		[1, 0, 1],
		[1, 1, 1]
	];
	for (var k = 0; k < 4; k++) {
		var input = inputs[k];

		network.feedInputs(input);

		for (var l = 0; l < 5; l++) {
			network.activate();
		}
		if (evaluateOutput(network.outputs[0].output, input) > 0.9) {
			console.log("network passed with input: " + inputs[k]);
		}
		score += evaluateOutput(network.outputs[0].output, input);
		network.reset();
	}
	console.log("networks total score is: " + score);
}

function shuffle(array) {
	var currentIndex = array.length,
		randomIndex;

	// While there remain elements to shuffle...
	while (currentIndex != 0) {

		// Pick a remaining element...
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex--;

		// And swap it with the current element.
		[array[currentIndex], array[randomIndex]] = [
			array[randomIndex], array[currentIndex]
		];
	}

	return array;
}

function exportGenome(genome) {
	genome.phenotype = undefined;
	return JSON.stringify(genome);
}
var population = {
	mutateWeightsProb: 0.8,
	mutationPower: 2.5,
	weightCap: 8,
	randomizeWeightProb: 0.1,
	mutateNodeProb: 0.03,
	mutateConnectionProb: 0.05,
	recurrentProb: 0,
	randomNodeSelection: false,
	randomSplitGeneTries: 20,
	mutateConnectionTries: 20,
	hiddenAcivationFunc: NEAT.Activations.leakyReLU,
	reenableProb: 0.025,
	toggleEnableProb: 0.03
};
var genome = createGenome(3, 1);
genome.population = population;