/*
 * Display the foundation seed rank
 */
YUI.add("display-seed-value", function (Y) {
	var Solitaire = Y.Solitaire,
	    Util = Solitaire.Util,
	    supportedGames = ["Agnes", "Canfield"],
	    rankContainer = Util.cacheNode("#seed-value-bar"),
	    rankNode = Util.cacheNode("#seed-value");

	Y.namespace("Solitaire.DisplaySeedValue");

	Y.on("afterSetup", function () {
		if (Game && supportedGames.indexOf(Game.name()) !== -1) {
			rankNode().setContent(Util.mapRank(Util.seedRank()));
			rankContainer().removeClass("hidden");
		} else {
			rankContainer().addClass("hidden");
		}
	});

	Y.on("fieldResize", function (scale, width, height) {
		if (width <= 1185) {
			rankContainer().addClass("bottom");
		} else {
			rankContainer().removeClass("bottom");
		}
	});

}, "0.0.1", {requires: ["solitaire", "util"]});
