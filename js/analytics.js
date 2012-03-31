YUI.add("analytics", function (Y) {

var Solitaire = Y.Solitaire,
    Analytics = Y.namespace("Solitaire.Analytics"),
    /* minimum number of moves for a new game to be considered started */
    minMoves = 5,
    totalMoves = 0,
    previousGame,
    start = 0;

Y.on("beforeSetup", function () {
	var end = start;

	start = new Date().getTime();

	if (end) {
		Analytics.track("Games", "Played", previousGame, start - end);
	}

	totalMoves = 0;
	previousGame = Solitaire.game.name();
});

Y.on("win", function () {
	var now = new Date().getTime();

	Analytics.track("Games", "Won", Solitaire.game.name(), now - start, true);
	Analytics.track("Games", "Played", Solitaire.game.name(), now - start, true);

	start = 0;
});

Y.on("endTurn", function () {
	totalMoves++;

	if (totalMoves === minMoves) {
		Analytics.track("Games", "New", Solitaire.game.name());
	}
});

Y.on("popup", function (popup) {
	Analytics.track("Menus", "Show", popup);
});

Y.mix(Analytics, {
	/* TODO this interface is copped from GA
	 * think harder
	 */
	track: function (category, event, name, value, nointeract) {
		if (typeof _gaq === "undefined") { return; }
		_gaq.push(["_trackEvent", category, event, name, value, nointeract]);
	}
});

}, "1.0.0", {requires: ["solitaire"]});
