YUI.add("doubleklondike", function (Y) {
	var Solitaire = Y.Solitaire,
	    Klondike = Solitaire.Klondike,
	    DoubleKlondike = Y.Solitaire.DoubleKlondike = instance(Klondike, {
		Foundation: instance(Klondike.Foundation, {
			stackConfig: {
				total: 8,
				layout: {
					hspacing: 1.25,
					top: 0,
					left: function () { return Solitaire.Card.width * 3.25; }
				}
			},
			field: "foundation",
		}),

		Tableau: instance(Klondike.Tableau, {
			stackConfig: {
				total: 9,
				layout: {
					hspacing: 1.25,
					top: function () { return Solitaire.Card.height * 1.5; },
					left: function () { return Solitaire.Card.width * 2; }
				}
			}
		}),

		Deck: instance(Klondike.Deck, {
			count: 2
		})
	});
}, "1.0.0", {requires: ["freecell"]});
