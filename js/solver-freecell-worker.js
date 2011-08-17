var attempts = 0,
    maxFastAttempts = 150000;

function GameState(obj) {
	if (!obj) { return; }
	var i, stack;

	this.reserve = new Uint8Array(obj.reserve);
	this.foundation = new Uint8Array(obj.foundation);
	this.tableau = [];

	for (i = 0; i < obj.tableau.length; i++) {
		stack = obj.tableau[i];
		this.tableau[i] = [new Uint8Array(stack[0]), stack[1]];
	}
}

GameState.fromState = function (other) {
	var state = new GameState();

	state.tableau = other.tableau;
	state.reserve = other.reserve;
	state.foundation = other.foundation;

	return state;
}

GameState.prototype = {
	reserve: null,
	foundation: null,
	tableau: null,
	rating: null,
	parentMove: null,
	parent: null,
	child: null,

	solved: function () {
		var i, len,
		    foundation = this.foundation;

		for (i = 0, len = 4; i < len; i++) {
			if ((foundation[i] >> 2) !== 13) { return false; }
		}

		return true;
	},

	eachTableau: function (callback) {
		var i, len,
		    stack,
		    tableau = this.tableau;

		for (i = 0, len = tableau.length; i < len; i++) {
			stack = tableau[i];
			callback.call(this, stack[0], stack[1], i);
		}
	},

	validTarget: function (field, value, start) {
		var rank = value >> 2,
		    suit = value & 3,
		    dest,
		    tableau,
		    i, len;
	
		if (!value) { return -1; }

		if (start === undefined) {
			start = 0;
		} else {
			start++;
		}

		switch (field) {
		case "foundation":
			for (i = 0; i < 4; i++ ) {
				dest = this.foundation[i];

				if ((!dest && rank === 1) ||
				    (suit === (dest & 3) &&
				    rank === (dest >> 2) + 1)) {
					return i;
				}
			}
			break;

		case "reserve":
			for (i = 0; i < 4; i++) {
				if (!this.reserve[i]) {
					return i;
				}
			}
			break;

		case "tableau":
			tableau = this.tableau;

			for (i = start, len = tableau.length; i < len; i++) {
				dest = tableau[i][0][tableau[i][1] - 1];

				if (!tableau[i][1] ||
				    (((suit & 1) ^ (dest & 1)) &&
				    (rank === (dest >> 2) - 1))) {
					return i;
				}
			}
			break;
		}

		return -1;
	},

	move: function (sourceField, sourceStack, destField, destStack) {
		var val = this.pop(sourceField, sourceStack);
		this.push(destField, destStack, val);
	},

	pop: function (field, stack) {
		var val,
		    newBuffer,
		    bufferLength,
		    tableau,
		    i, len;

		if (field === "reserve" || field === "foundation") {
			val = this[field][stack];

			this[field] = new Uint8Array(this[field]);
			this[field][stack] = 0;
			return val;
		}

		tableau = this.tableau;
		bufferLength = tableau[stack][1];

		if (!bufferLength) { return 0; }

		val = tableau[stack][0][bufferLength - 1];
		this.copyTableau(stack, bufferLength - 1);
		return val;
	},

	push: function (field, stack, val) {
		var newLength;
		if (!val) { return; }

		if (field === "reserve" || field === "foundation") {
			this[field] = new Uint8Array(this[field]);
			this[field][stack] = val;
			return;
		}

		newLength = this.tableau[stack][1] + 1;
		this.copyTableau(stack, newLength);
		this.tableau[stack][0][newLength - 1] = val;

	},

	copyTableau: function (stack, newLength) {
		var old = this.tableau,
		    tableau = old[stack][0],
		    newBuffer = new Uint8Array(new ArrayBuffer(newLength)),
		    i, len;

		for (i = 0; i < newLength; ++i) {
			newBuffer[i] = tableau[i];
		}

		this.tableau = [];

		for (i = 0, len = old.length; i < len; ++i) {
			if (i !== stack) {
				this.tableau[i] = old[i];
			} else {
				this.tableau[i] = [newBuffer, newLength];
			}
		}
	},

	sort: function () {
		Array.prototype.sort.call(this.reserve);
		Array.prototype.sort.call(this.foundation);
		this.tableau.sort(function (a, b) {
			return a[0][0] - b[0][0];
		});
	},

	_serialized: null,
	// TODO write a real hash function
	serialize: function () {
		if (this._serialized !== null) { return this._serialized; }

		var i, j, len, stack;

		this._serialized = "";
		for (i = 0; i < 4; i++) {
			this._serialized += String.fromCharCode(this.reserve[i]);
		}

		this._serialized += "_";

		for (i = 0; i < 4; i++) {
			this._serialized += String.fromCharCode(this.foundation[i]);
		}

		this._serialized += "_";

		for (i = 0; i < 8; i++) {
			stack = this.tableau[i];

			for (j = 0; j < stack[1]; j++) {
				this._serialized += String.fromCharCode(stack[0][j]) + "_";
			}
		}

		return this._serialized;
	},

	// the search heuristic function
	rateMove: function (sourceField, sourceIndex, destField, destIndex) {
		var RATING_FOUNDATION = 1000,
		    RATING_CLOSEDTABLEAUFOLLOWUP = 20,
		    RATING_FREEFOUNDATIONTARGET = 15,
		    RATING_OPENTABLEAU = 15,
		    RATING_FREETABLEAUTARGET = 10,
		    RATING_OPENRESERVE = 10,
		    RATING_TABLEAU = 2,
		    RATING_RESERVE = -1,
		    RATING_BURYFOUNDATIONTARGET = -5,
		    RATING_CLOSEDTABLEAU = -10,
		rating = 0,
		stack,
		card,
		nextCard,
		followup = false,
		i, length;

		// reward moves to the foundation
		if (destField === "foundation") {
			rating += RATING_FOUNDATION;
		}

		if (sourceField === "tableau") {
			stack = this.tableau[sourceIndex];
			length = stack[1];
			card = stack[0][length - 1];

			// reward an opened tableau slot
			if (length === 1) {
				rating += RATING_OPENTABLEAU;
			}

			// reward unburing foundation targets
			for (i = length - 2; i >= 0; i--) {
				if (this.validTarget("foundation", stack[0][i]) > -1) {
					rating += RATING_FREEFOUNDATIONTARGET - (length - 2 - i) + (13 - (stack[0][i] >> 2));
				}
			}

			// reward a newly discovered tableau-to-tableau move
			if (this.validTarget("tableau", stack[0][length - 2]) > -1) {
				rating += RATING_FREETABLEAUTARGET;
			}
		}

		// reward an opened reserve slot
		if (sourceField === "reserve") {
			rating += RATING_OPENRESERVE;
			card = this.reserve[sourceIndex];
		}
		// reward any move to the tableau
		if (destField === "tableau") {
			rating += RATING_TABLEAU;

			stack = this.tableau[destIndex];
			length = stack[1];
			// punish a move to the tableau that buries a foundation target
			for (i = length - 1; i >= 0; i--) {
				if (this.validTarget("foundation", stack[0][i]) > -1) {
					rating += RATING_BURYFOUNDATIONTARGET * (length - i);
				}
			}

			if (stack[1] === 0) {
				// try not to move a card heading a tableau to an empty tableau
				if (sourceField === "tableau" && this.tableau[sourceIndex][1] === 1) {
					return -1000;
				}

				// reward a move to an empty stack that can be followed up be another move
				for (i = 0; i < 4; i++) {
					nextCard = this.reserve[i];
					if (((nextCard >> 2) === (card >> 2) - 1) &&
					    ((nextCard & 1) ^ (card & 1))) {
						rating += RATING_CLOSEDTABLEAUFOLLOWUP + (nextCard >> 2);
						followup = true;
					}
				}

				for (i = 0; i < 8; i++) {
					stack = this.tableau[i];
					nextCard = stack[0][stack[1] - 1];
					if (((nextCard >> 2) === (card >> 2) - 1) &&
					    ((nextCard & 1) ^ (card & 1))) {
						rating += RATING_CLOSEDTABLEAUFOLLOWUP + (nextCard >> 2);
						followup = true;
					}
				}

				// punish filling a tableau slot with no immediate followup
				if (!followup) {
					rating += RATING_CLOSEDTABLEAU;
				}
			}
		}

		// penalize moving to the reserve
		if (destField === "reserve") {
			rating += RATING_RESERVE;
		}
		return rating;
	},

	transformParentMove: function () {
		var move = this.parentMove,
		    parent = this.parent;

		if (!(move && parent)) { return; }

		move.source[1] = parent.lastCard(move.source[0], move.source[1]);
		move.dest[1] = parent.lastCard(move.dest[0], move.dest[1]);
	},

	lastCard: function (field, index) {
		var stack, length;

		switch (field) {
		case "reserve":
		case "foundation":
			return this[field][index];

		case "tableau":
			stack = this[field][index];
			length = stack[1];

			return stack[0][length - 1];
		}
	},

	becomeChild: function () {
		var parent = this.parent;

		if (!parent) { return; }

		parent.child = this;
		this.transformParentMove();
	}
};

// returns the depth of tree to jump up to, or 0 if the solution is found
function solve(state, depth, visited, movesSinceFoundation, fastSearch) {
	var jumpDepth,
	    maxDepth = 200,
	    sourceIndex, destIndex, length, val,
	    next, sourceField, destField,
	    tableau,
	    move, moves = [],
	    scale = 1,
	    foundFoundation = false,
	    i;

	/*
	 * if the state is the solved board, return
	 * for each reserve and tableau stack, find all valid moves
	 * for each valid move, create a new game state
	 * sort each state by rank, add for each thats undiscoverd, and it as a branch and recurse
	 * stop iterating if a child state is solved
	 */

	if (depth > maxDepth) { return maxDepth; }

	/* when the state is solved
	 * replace the stack index with its associated move with the actual card that was moved
	 * set the parent states child to this state
	 * then jump out of the tree
	 */
	if (state.solved()) {
		state.becomeChild();
		return 0;
	}

	// find moves from the reserve
	for (i = 0; i < 4; i++) {
		val = state.reserve[i];

		if (!val) { continue; }

		destIndex = state.validTarget("foundation", val);
		if (destIndex > -1) {
			moves.push({source: ["reserve", i], dest: ["foundation", destIndex]});
			foundFoundation = true;
		}

		if (foundFoundation) { break; }

		destIndex = 0;
		while ((destIndex = state.validTarget("tableau", val, destIndex)) > -1) {
			moves.push({source: ["reserve", i], dest: ["tableau", destIndex]});
		}
	}

	// find moves from the tableau
	tableau = state.tableau;
	for (i = 0; i < tableau.length; i++) {
		s = tableau[i][0];
		length = tableau[i][1];
		val = s[length - 1];

		if (!val) { continue; }

		destIndex = state.validTarget("foundation", val);
		if (destIndex > -1) {
			moves.push({source: ["tableau", i], dest: ["foundation", destIndex]});
			foundFoundation = true;
		}

		if (foundFoundation) { break; }

		destIndex = state.validTarget("reserve", val);
		if (destIndex > -1) {
			moves.push({source: ["tableau", i], dest: ["reserve", destIndex]});
		}

		destIndex = 0;
		while ((destIndex = state.validTarget("tableau", val, destIndex)) > -1) {
			moves.push({source: ["tableau", i], dest: ["tableau", destIndex]});
		}
	}

	if (foundFoundation) {
		movesSinceFoundation = 0;
	} else {
		movesSinceFoundation++;
	}

	for (i = 0; i < moves.length; i++) {
		move = moves[i];
		next = GameState.fromState(state);

		sourceField = move.source[0];
		sourceIndex = move.source[1];

		destField = move.dest[0];
		destIndex = move.dest[1];

		next.rating = next.rateMove(sourceField, sourceIndex, destField, destIndex);
		next.move(sourceField, sourceIndex, destField, destIndex);
		next.parentMove = move;
		next.parent = state;

		moves[i] = next;
	};

	moves.sort(function (a, b) {
		return b.rating - a.rating;
	});

	// if nothing's been moved to the foundation in many turns, backtrack alot of steps
	if (movesSinceFoundation >= 20) {
		scale = 0.7;
	}

	if (fastSearch && (++attempts > maxFastAttempts)) {
		scale = 0.001;
	}

	for (i = 0; i < moves.length && scale === 1; i++) {
		move = moves[i];
		if (jumpDepth < depth) { break; }
		if (visited[move.serialize()]) {
			if (fastSearch) { break } else { continue };
		}

		visited[move.serialize()] = true;
		jumpDepth = solve(move, depth + 1, visited, movesSinceFoundation, fastSearch);
	}

	if (jumpDepth === 0) {
		state.becomeChild();
	}

	if (jumpDepth === undefined) { jumpDepth = Math.ceil(depth * scale); }
	return jumpDepth;
}

function mapMoves(state) {
	var child = state.child,
	    moves = null,
	    current;

	if (!child) { return; }

	moves = current = child.parentMove;

	while (child = child.child) {
		current.next = child.parentMove;
		current = current.next;
	}

	return moves;
}

function attemptSolution(obj, fastSearch) {
	var state = new GameState(obj);

	attempts = 0;
	solve(state, 1, {}, 0, fastSearch);
	return mapMoves(state);
}

onmessage = function (e) {
	var state,
	    solution,
	    data = e.data;


	if (data.action === "solve") {
		solution = attemptSolution(data.param, true);

		if (!solution) {
			solution = attemptSolution(data.param, false);
		}
		self.postMessage({solution: solution});
	}
};
