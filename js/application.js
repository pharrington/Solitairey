(function () {
	var active = {
		name: "klondike",
		game: null
	    },
	    yui = YUI(), Y,
	    games = {
		"klondike": "Klondike",
		"flower-garden": "FlowerGarden",
		"forty-thieves": "FortyThieves",
		"freecell": "Freecell",
		"grandfathers-clock": "GClock",
		"monte-carlo": "MonteCarlo",
		"pyramid": "Pyramid",
		"scorpion": "Scorpion",
		"spider": "Spider",
		"spider1s": "Spider1S",
		"spider2s": "Spider2S",
		"yukon": "Yukon"},

	    extensions = [
		"auto-turnover",
	        "statistics",
		"solitaire-autoplay",
		"solitaire-background-fix"],

	Fade = (function() {
		var el = null,
		    body,
		    css = {
		    position: "absolute",
		    display: "none",
		    backgroundColor: "#000",
		    opacity: 0.7,
		    top: 0,
		    left: 0,
		    width: 0,
		    height: 0,
		    zIndex: 1000,
		},

		element = function() {
			if (el === null) {
				el = Y.Node.create("<div>");
				el.setStyles(css);
				body = Y.one("body").append(el);
			}
			return el;
		};

		return {
			show: function() {
				var el = element();

				css.display = "block";
				css.width = el.get("winWidth");
				css.height = el.get("winHeight");

				el.setStyles(css);

				body.addClass("scrollable");
			},

			hide: function() {
				css.display = "none";
				element().setStyles(css);

				body.removeClass("scrollable");
			}
		};
	}()),

	GameChooser = {
		selected: null,

		init: function () {
			new Y.DD.Drag({
				node: Y.one("#game-chooser"),
				handles: [Y.one("#game-chooser > .titlebar")]
			});
		},

		show: function () {
			!this.selected && this.select(active.name);
			Fade.show();
			Y.one("#game-chooser").addClass("show");
		},

		hide: function () {
			Fade.hide();
			Y.one("#game-chooser").removeClass("show");
		},

		choose: function () {
			if (!this.selected) { return; }

			this.hide();
			playGame(this.selected);
		},

		select: function (game) {
			var node = Y.one("#" + game + "> div");
			
			this.selected !== game && this.unSelect();

			if (node) {
				this.selected = game;
				new Y.Node(document.getElementById(game)).addClass("selected");
				Y.one("#game-chooser-contents").append(node);
			}
		},

		unSelect: function () {
			if (!this.selected) { return; }

			var description = Y.one("#game-chooser-contents > .description");

			new Y.Node(document.getElementById(this.selected)).removeClass("selected");
			Y.one("#" + this.selected).append(description);
			this.selected = null;
		}
	};

	function modules() {
		var modules = extensions.slice(),
		    m;

		for (m in games) {
			if (games.hasOwnProperty(m)) {
				modules.push(m);
			}
		}

		return modules;
	}

	function main(YUI) {
		Y = YUI;

		Y.on("load", load, window);
	}

	function showDescription() {
		GameChooser.select(this._node.parentNode.id);
	}

	function attachEvents() {
		Y.on("click", restart, Y.one("#restart"));
		Y.on("click", function () { GameChooser.show(); }, Y.one("#choose_game"));
		Y.on("click", function () { active.game.undo(); }, Y.one("#undo"));
		Y.on("click", newGame, Y.one("#new_deal"));
		Y.on("click", function () { GameChooser.hide(); }, Y.one("#game-chooser .close"));

		Y.delegate("click", showDescription, "#descriptions", "h2");
		Y.delegate("click", function () { GameChooser.choose(); }, "#game-chooser", ".choose");

		Y.one("document").on("keydown", function (e) {
			e.keyCode === 27 && GameChooser.hide();
		});

		attachResize();
	}

	function attachResize() {
		var timer,
		    delay = 250;

		Y.on("resize", function () {
			clearTimeout(timer);
			timer = setTimeout(resize, delay);
		}, window);
	}

	function resize() {
		active.game.resize(sizeRatio());
		Y.fire("afterResize");
	}

	function sizeRatio() {
		var game = active.game,
		    el = game.container(),
		    width = el.get("winWidth"),
		    height = el.get("winHeight");

		return Math.min(width / game.width(), height / game.height(), 1);
	}

	function playGame(name) {
		var twoWeeks = 1206900000;

		active.name = name;
		active.game = Y.Solitaire[games[name]];
		Y.Cookie.set("options", name, {expires: new Date(new Date().getTime() + twoWeeks)});
		newGame();
	}

	function loadOptions() {
		var options = Y.Cookie.get("options");

		options && (active.name = options);
	}

	function load() {
		var save = Y.Cookie.get("saved-game");

		attachEvents();
		loadOptions();

		if (save) {
			active.game = Y.Solitaire[games[active.name]];
			clearDOM();
			active.game.loadGame(save);
		} else {
			playGame(active.name);
		}

		GameChooser.init();
	}

	function clearDOM() {
		Y.all(".stack, .card").remove();
		active.game.scale(sizeRatio());
	}

	function restart() {
		var init = Y.Cookie.get("initial-game"),
		    game = active.game;

		if (init) {
			clearDOM();
			game.cleanup();
			game.loadGame(init);
			game.save();
		}
	}

	function newGame() {
		var game = active.game;

		clearDOM();
		game.cleanup();
		game.newGame();
	}


	yui.use.apply(yui, modules().concat(main));
}());
