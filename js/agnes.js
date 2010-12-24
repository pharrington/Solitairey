YUI.add("agnes", function (Y) {
	var Solitaire = Y.Solitaire,
	    Klondike = Solitaire.Klondike,
	    Agnes = Solitaire.Agnes = instance(Klondike, {
		fields: ["Foundation", "Deck", "Waste", "Tableau", "Reserve"],

		deal: function () {
			Klondike.deal.call(this);
			this.deck.stacks[0].last().moveTo(this.foundation.stacks[0]);
			this.turnOver();
		},

		redeal: Solitaire.noop,

		turnOver: function () {
			var deck = this.deck.stacks[0],
			    reserves = this.reserve.stacks,
			    waste = this.waste.stacks,
			    count,
			    target,
			    i;

			if (deck.cards.length < 7) {
				count = 2;
				target = waste;
			} else {
				count = 7;
				target = reserves;
			}

			for (i = 0; i < count; i++) {
				deck.last().faceUp().moveTo(target[i]);
			}
		},

		Waste: instance(Klondike.Waste, {
			stackConfig: {
				total: 2,
				layout: {
					hspacing: 1.5,
					top: 0,
					left: 0
				}
			},

			Stack: instance(Solitaire.Stack, {
				setCardPosition: function (card) {
					var last = this.last(),
					    top = this.top,
					    left = last ? last.left + Solitaire.Card.width * 1.5 : this.left;

					card.top = top;
					card.left = left;
				}
			})
		}),

		Reserve: {
			field: "reserve",
			stackConfig: {
				total: 7,
				layout: {
					vspacing: 1.05,
					top: 0,
					left: function () { return Solitaire.Card.width * 9; }
				}
			},

			Stack: instance(Klondike.Stack)
		}
	    });
}, "0.0.1", {requires: ["klondike"]});
