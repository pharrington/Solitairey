YUI.add("spiderette", function (Y) {

	var Solitaire = Y.Solitaire,
	    Klondike = Solitaire.Klondike,
	    Spiderette = Y.Solitaire.Spiderette = instance(Solitaire.Spider, {
		width: Klondike.width,
		height: Klondike.height,
		deal: Klondike.deal
	    });

	Y.mix(Spiderette.Tableau.stackConfig, Klondike.Tableau.stackConfig, true);
	Y.mix(Spiderette.Foundation.stackConfig, Klondike.Foundation.stackConfig, true);
	Y.mix(Spiderette.Deck, {
		count: 1,
	}, true);
}, "0.0.1", {requires: ["klondike", "spider"]});
