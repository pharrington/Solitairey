YUI.add("analytics", function (Y) {

var Solitaire = Y.Solitaire,
    Analytics = Y.namespace("Solitaire.Analytics"),
    /* minimum number of moves for a new game to be considered started */
    minMoves = 5,
    totalMoves = 0,
    start = 0;

if (!_gaq) { return; }

Y.on("beforeSetup", function () {
	totalMoves = 0;
	start = new Date().getTime();
});

Y.on("win", function () {
	var now = new Date().getTime();

	Analytics.track("Games", "Won", Solitaire.game.name(), now - start, true);
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
	/* TODO this interface is ridiculously GA influenced
	 * think harder
	 */
	track: function (category, event, name, value, nointeract) {
		_qaq.push(["_trackEvent", category, event, name, value, nointeract]);
	}
});

}, "1.0.0", {requires: ["solitaire"]});
