YUI.add("tri-towers", function (Y) {
	var Solitaire = Y.Solitaire,
	TriTowers = Y.Solitaire.TriTowers = instance(Solitaire, {
		fields: ["Deck", "Foundation", "Tableau"],

		deal: function () {
			var card,
			    stack,
			    stacks = this.tableau.stacks,
			    deck = this.deck,

			    i, stackLength;

			for (stack = 0; stack < 4; stack++) {
				stackLength = (stack + 1) * 3;

				for (i = 0; i < stackLength; i++) {
					card = deck.pop();
					stacks[stack].push(card);
					stack === 3 && card.faceUp();
				}
			}
		},

		Deck: {
			field: "deck",
			stackConfig: {
				total: 1,
				layout: {
					hspacing: 0,
					top: function () { Solitaire.Card.height * 4; },
					left: 0
				}
			}
		},

		Tableau: {
			field: "tableau",
			stackConfig: {
				total: 4,
				layout: {
					vspacing: 0.6,
					hspacing: -0.625,
					top: 0,
					left: function () { return Solitaire.Card.width * 3; }
				}
			}
		},

		Foundation: {
			field: "foundation",
			stackConfig: {
				total: 1,
				layout: {
					hspacing: 0,
					top: function () { return Solitaire.Card.height * 4; },
					left: function () { return Solitaire.Card.width * 4; }
				}
			}
		},

		/*
		 * return true if the target is 1 rank away from the this card
		 * Aces and Kings are valid targets for each other
		 */
		Card: instance(Solitaire.Card, {
			validTarget: function (stack) {
				if (stack.field !== "foundation") { return false; }

				var card = stack.last(),
				    diff = Math.abs(this.rank - card.rank);

				return diff === 1 || diff === 12;
			}
		}, true)
	}, true);

	Y.Array.each(TriTowers.fields, function (field) {
		TriTowers[field].Stack = instance(TriTowers.Stack);
	});

	Y.mix(TriTowers.Tableau.Stack, {
		deleteItem: function (card) {
			var cards = this.cards,
			    i = cards.indexOf(card);

			if (i !== -1) { cards[i] = null; }
		},

		setCardPosition: function (card) {
			var last = this.last(),
			    top = this.top,
			    left,
			    tower,
			    index,
			    
			    towerGaps = [3, 2, 1, 0];

			if (last) {
				left = last.left + card.width * 1.25;
				tower = last.tower();
				index = last.index();

				if (index === tower) { left += towerGaps[tower] * card.width; }
			} else {
				left = this.left;
			}

			card.top = top;
			card.left = left;
			card.zIndex = this.index() * 10;
		}
	}, true);

	Y.mix(TriTowers.Deck.Stack, {
		setCardPosition: function (card) {
			var last = this.last();

			card.top = this.top,
			card.left = last ? last.left + card.width * 0.2 : this.left;
			card.zIndex = last ? last.zIndex + 1: this.zIndex + 1;
		}
	}, true);
}, "0.0.1", {requires: ["solitaire"]});
