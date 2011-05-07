/*
 * Automatically solve a game of Freecell
 */
YUI.add("solver-freecell", function (Y) {
	var f = new Function;
	function instance (proto) {
		f.prototype = proto;
		return new f;
	}

	Y.namespace("Solitaire.Solver.Freecell");

	var Solitaire = Y.Solitaire,
	    FreecellSolver = Solitaire.Solver.Freecell;


	function returner(o) { return o; }

	function copyStack(stack) {
		var copy = instance(stack);

		copy.cards = Y.Array.map(stack.cards, returner);
		return copy;
	}

	function copyField(field) {
		var copy = instance(field);

		copy.stacks = Y.Array.map(field.stacks, returner);

		return copy;
	}

	function replaceStack(field, stack, replacement) {
		field.stacks[Y.Array.indexOf(field.stacks, stack)] = replacement;
	}

	function createState(game, parent) {
		var state;
		
		if (!game) {
			throw "game is undefined or null";
		}

		game = instance(game);

		state = {
			game: game,
			serialized: null,
			parent: parent,
			rating: 0,
			children: []
		};

		return state;
	}

	function hasAncestor(child, state) {
		var parent = child,
		    serialized = state.serialized;

		while (parent = parent.parent) {
			if (parent.serialized === serialized) { return true; }
		}

		return false;
	}

	function doMove(card, oDest, base) {
		var newCard,
		    newState,
		    newGame,
		    oSource,
		    game,
		    source, dest,
		    sourceField, destField;

		game = base.game;
		oSource = card.stack;
		newCard = instance(card);
		source = copyStack(oSource);
		dest = copyStack(oDest);
		newCard.stack = source;

		sourceField = source.field;
		destField = dest.field;

		newState = createState(game, base);
		newGame = newState.game;

		if (source.field !== dest.field) {
			newGame[destField] = copyField(game[destField]);
		}

		newGame[sourceField] = copyField(game[sourceField]);
		replaceStack(newGame[sourceField], oSource, source);
		replaceStack(newGame[destField], oDest, dest);

		source.deleteItem(card);
		dest.push(newCard, true);

		return newState;
	}

	function tableauMoves(card, game) {
		var destStacks = [],
		    cardStack = card.stack;

		game.eachStack(function (stack) {
			if (stack !== cardStack &&
			    card.validTarget(stack)) {
				destStacks.push(stack);
			}
		}, "tableau");

		return destStacks;
	}

	function singleDestinationMove(card, game, field) {
		var dest;

		if (card.stack.field === field) { return; }

		game.eachStack(function (stack) {
			if (!dest &&
			    card.validTarget(stack)) {
				dest = stack;
			}
		}, field);

		return dest;
	}

	var foundationMove = singleDestinationMove.partial("foundation");
	var reserveMove = singleDestinationMove.partial("reserve");

	function proxyStack(stack) {
		var i,
		    card;

		for (i = stack.cards.length - 1; i >= 1; i--) {
			card = stack.cards[i];
			if (!card.validTarget(stack.cards[i - 1])) {
				break;
			}
		}

		return stack.cards[i].createProxyStack();
	}

	function rateMove(source, destination) {
		var head, buried,
		    sourceField, destField,
		    destRating = {
			    tableau: 0,
			    reserve: 10,
			    freeslot: 20
		    },

		    sourceRating = {
			    tableau: 20,
			    reserve: 10,
			    freeslot: 0
		    },
		    rating;

		head = Solitaire.Stack.isPrototypeOf(source) ? source.first() : source;
		buried = head.stack.cards[head.index - 1];

		sourceField = head.stack.field;
		destField = destination.field;

		rating = destRating[destField] + sourceRating[sourceField];
	}

	function step(base, depth) {
		var game = base.game,
		    quit = false,
		    solution = false,
		    child;

		game.eachStack(function (stack) {
			if (quit) { return; }

			var field = stack.field,
			    card = stack.last(),
			    proxyStack,
			    dest,
			    move;

			if (!card ||
			    field === "foundation") { return; }

			dest = foundationMove(card, game);
			if (dest) {
				move = doMove(card, dest, base);
				base.children = [move];
				quit = true;
				if (move.game.isWon()) { solution = true; }
				return;
			}

			proxyStack = proxyStack(stack);

			dest = tableauMoves(proxyStack, game);
			Y.Array.each(dest, function (d) {
				base.children.push(rateMove(proxyStack, d));
			});

			dest = reserveMove(card, game);
			dest && base.children.push(rateMove(card, dest));
		});

		base.children.sort(function (a, b) {
			return a.rating - b.rating;
		});
		
		while (!solution && (child = base.children.shift())) {
			solution = step(child, depth + 1);
		};

		if (solution) {
			base.children = [child];
		}

		return solution;
	}

	Y.mix(FreecellSolver, {
		ish: function () {
			var base = createState(Game, null);
			base.serialized = Game.serialize();
			step(base, 0);
		}
	});
}, "0.0.1", {requires: ["solitaire"]});
