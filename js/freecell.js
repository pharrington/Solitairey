var Freecell = instance(Solitaire, {
	deal: function () {
		var card,
		    stack = 0,
		    stacks = this.tableau.stacks;

		while (card = this.deck.pop()) {
			stacks[stack].push(card);			
			stack++;
			if (stack === 8) { stack = 0; }
		}
		$.each([this.foundation, this.tableau, this.reserve], function () {
			$.each(this.stacks, function () {
				this.createDOMElement();
			});
		});
	},

	openSlots: function (exclude) {
		var total = 0,
		    i,
		    stack,
		    rStacks = this.reserve.stacks,
		    tStacks = this.tableau.stacks;

		for (i = 0; i < 4; i++) {
			stack = rStacks[i];
			!stack.last() && total++;
		}

		for (i = 0; i < 8; i++) {
			stack = tStacks[i];
			exclude !== stack && !tStacks[i].last() && total++;
		}

		return total;
	},

	Stack: instance(Solitaire.Stack),

	Foundation: {
		stackConfig: {
			total: 4,
			layout: {
				spacing: 1.25,
				top: 0,
				right: 0
			}
		},
		field: "foundation",
		draggable: false
	},

	Reserve: {
		stackConfig: {
			total: 4,
			layout: {
				spacing: 1.25,
				top: 0,
				left: 0
			}
		},
		field: "reserve",
		draggable: true
	},

	Tableau: {
		stackConfig: {
			total: 8,
			layout: {
				spacing: 1.25,
				top: function () { return Solitaire.Card.height * 1.5; },
				left: 0
			}
		},
		field: "tableau",
		draggable: true
	},

	Card: instance(Solitaire.Card, {
		validTarget: function (stack) {
			var target = stack.last();

			switch (stack.field) {
			case "tableau":
				if (!target) {
					return true;
				} else {
					return target.color !== this.color && target.rank === this.rank + 1;
				}
				break;
			case "foundation":
				if (!target) {
					return this.rank === 1;
				} else {
					return target.suit === this.suit && target.rank === this.rank - 1;
				}
				break;
			case "reserve":
				return !target;
				break;
			}
		}
	})
});

$.each(["Foundation", "Tableau", "Reserve"], function () {
	Freecell[this].Stack = instance(Freecell.Stack);
});

$.extend(Freecell.Stack, {
	validTarget: function (stack) {
		if (stack.field !== "tableau" ||
		    !this.first().validTarget(stack)) { return false; }

		return this.cards.length <= Freecell.openSlots(stack, this.last()) + 1;
	}
});

$.extend(Freecell.Tableau.Stack, {
	setCardPosition: function (card) {
		var last = this.cards.last(),
		    top = last ? last.top + Solitaire.Card.rankHeight : this.top,
		    left = this.left;

		card.left = left;
		card.top = top;
	}
});

$(function () {
	Freecell.init();
	Freecell.deal();
});
