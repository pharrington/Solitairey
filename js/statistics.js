/*
 * record win/lose records, streaks, etc
 */
YUI.add("statistics", function (Y) {
	var loaded,
	    localStorage = window.localStorage;
	    Solitaire = Y.Solitaire;

	Y.on("newGame", function () {
		if (loaded) { recordLose(); }

		loaded = null;
	});

	Y.on("loadGame", function () {
		loaded = Solitaire.game.name();
		saveProgress();
	});

	Y.on("endTurn", function () {
		if (!loaded) {
			loaded = Solitaire.game.name();
			saveProgress();
		}
	});

	Y.on("win", function () {
		loaded = null;

		recordWin();
	});

	function Record(raw) {
		function parse() {
			var entries = raw.split("|");

			entries.splice(entries.length - 1);

			return Y.Array.map(entries, function (entry) {
				entry = entry.split("_");

				return {date: new Date(entry[0]), won: !!entry[1]};
			});
		}

		function won(entry) {
			return entry.won;
		}

		var record = parse();

		return {
			streaks: function () {
				var streaks = [],
				    streak = null;

				Y.Array.each(record, function (entry) {
					if (!entry.won) {
						streak && streaks.push(streak);
						streak = null;
					} else {
						if (!streak) { streak = []; }
						streak.push(entry);
					}
				});

				streak && streaks.push(streak);

				return streaks;
			},

			wins: function () {
				return Y.Array.filter(record, won);
			},

			loses: function () {
				return Y.Array.reject(record, won);
			}
		};
	}

	function record(value) {
		var key = Solitaire.game.name() + "record",
		    record = localStorage[key] || "";

		record += new Date().getTime() + "_" + value + "|";

		localStorage[key] = record;
	}

	function recordLose() {
		record(0);

		clearProgress();
	}

	function recordWin() {
		record(1);

		clearProgress();
	}

	function clearProgress() {
		localStorage.removeItem("currentGame");
	}

	function saveProgress() {
		localStorage["currentGame"] = Solitaire.game.name();
	}

}, "0.0.1", {requires: ["solitaire", "array-extras"]});
