YUI.add("tri-towers", function (Y) {
	var Solitaire = Y.Solitaire,
	Pyramid = Y.Solitaire.Pyramid = instance(Solitaire, {
		fields: ["Deck", "Foundation", "Tableau"],
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
					hspacing: 0.6,
					top: function () { return Solitaire.Card.height * 4; },
					left: function { return Solititaire.Card.width * 


		/*
		 * return true if the target is 1 rank away from the this card
		 * Aces and Kings are valid targets for each other
		 */
		Card: instance(Solitaire.Card, {
			validTarget: function (card) {
				if (!(card.field === "foundation" && card === card.stack.last())) { return false; }

				var diff = Math.abs(this.rank - card.rank);

				return diff === 1 || diff === 12;
			}
		}, true)
	}, true);
}, "0.0.1", {requires: ["solitaire"]});
