YUI.add("simple-simon", function (Y) {
	var Solitaire = Y.Solitaire,
	    SimpleSimon = Solitaire.SimpleSimon = instance(Solitaire.Spider, {
		fields: ["Foundation", "Tableau"],

		deal: function () {
			var card,
			    stack = 0,
			    stacks = this.tableau.stacks,
			    last = stacks.length;

			while (card = this.deck.pop()) {
				stacks[stack].push(card.faceUp());			
				stack++;
				if (stack === last) {
					stack = 0;
					last--;
				}
			}
		},

		turnOver: Solitaire.noop,
		Deck: instance(Solitaire.Deck),
		Foundation: instance(Solitaire.Spider.Foundation)
	});

	SimpleSimon.Foundation.stackConfig = {
		total: 4,
		layout: {
			hspacing: 1.25,
			top: 0,
			left: function () { return Solitaire.Card.width * 3.75; }
		}
	};
}, "0.0.1", {requires: ["spider"]});
