YUI.add("thefan", function (Y) {
	var LaBelleLucie = Y.Solitaire.LaBelleLucie,
	    TheFan = Y.Solitaire.TheFan = instance(LaBelleLucie, {
		initRedeals: Y.Solitaire.noop,

		Tableau: instance(LaBelleLucie.Tableau, {
			Stack: instance(LaBelleLucie.Tableau.Stack, {
			       images: {tableau: "freeslot.png"}
			})
		}),

		Deck: instance(LaBelleLucie.Deck, {
			Stack: instance(LaBelleLucie.Deck.Stack, {
			       images: {}
			})
		}),

		Card: instance(LaBelleLucie.Card, {
			validTableauTarget: function (card) {
				if (!card) {
					return this.rank === 13;
				}

				return card.suit === this.suit && card.rank === this.rank + 1;
			}
		})
	});
}, "1.0.0", {requires: ["labellelucie"]});
