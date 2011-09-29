(function () {
	var active = {
		name: "klondike",
		game: null
	    },
	    yui = YUI(), Y,
	    games = {
		"agnes": "Agnes",
		"klondike": "Klondike",
		"klondike1t": "Klondike1T",
		"flower-garden": "FlowerGarden",
		"forty-thieves": "FortyThieves",
		"freecell": "Freecell",
		"golf": "Golf",
		"grandfathers-clock": "GClock",
		"monte-carlo": "MonteCarlo",
		"pyramid": "Pyramid",
		"russian-solitaire": "RussianSolitaire",
		"scorpion": "Scorpion",
		"spider": "Spider",
		"spider1s": "Spider1S",
		"spider2s": "Spider2S",
                "spiderette": "Spiderette",
		"tri-towers": "TriTowers",
		"will-o-the-wisp": "WillOTheWisp",
		"yukon": "Yukon"},

	    extensions = [
		"auto-turnover",
	        "statistics",
		"solver-freecell",
		"solitaire-autoplay",
	        "solitaire-ios",
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

			},

			hide: function() {
				css.display = "none";
				element().setStyles(css);
			}
		};
	}()),

	GameChooser = {
		selected: null,
		fade: false,

		init: function () {
			this.refit();
		},

		refit: function () {
			var node = Y.one("#game-chooser"),
			    height = node.get("winHeight");

			node.setStyle("min-height", height);
		},

		show: function (fade) {
			if (!this.selected) {
				this.select(active.name);
			}

			if (fade) {
				Fade.show();
				this.fade = true;
			}

			Y.one("#game-chooser").addClass("show");
			Y.one("body").addClass("scrollable");
		},

		hide: function () {
			if (this.fade) {
				Fade.hide();
			}

			Y.one("#game-chooser").removeClass("show");
			Y.fire("gamechooser:hide", this);
			Y.one("body").removeClass("scrollable");
		},

		choose: function () {
			if (!this.selected) { return; }

			this.hide();
			playGame(this.selected);
		},

		select: function (game) {
			var node = Y.one("#" + game + "> div"),
			    previous = this.selected;
			
			if (previous !== game) {
				this.unSelect();
			}

			if (node) {
				this.selected = game;
				new Y.Node(document.getElementById(game)).addClass("selected");
			}

			if (previous && previous !== game) {
				Y.fire("gamechooser:select", this);
			}
		},

		unSelect: function () {
			if (!this.selected) { return; }

			new Y.Node(document.getElementById(this.selected)).removeClass("selected");
			this.selected = null;
		}
	},

	/* theres no mechanism yet to load the appropriate deck depending on the scaled card width
	 * so we just load the 122x190 cards and call it a day :/
	 */
	Themes = {
		dondorf: {
			sizes: [61, 79, 95, 122],
			61: {
				hiddenRankHeight: 7,
				rankHeight: 25,
				dimensions: [61, 95]
			},

			79: {
				hiddenRankHeight: 10,
				rankHeight: 32,
				dimensions: [79, 123]
			},

			95: {
				hiddenRankHeight: 12,
				rankHeight: 38,
				dimensions: [95, 148]
			},

			122: {
				hiddenRankHeight: 15,
				rankHeight: 48,
				dimensions: [122, 190]
			}
		},

		snapToSize: function (width) {
			var theme,
			    sizes = theme.sizes;

			width = clamp(width, sizes[0], sizes[sizes.length - 1]) >>> 0;

			while (Y.Array.indexOf(sizes, width) === -1) {
				width++;
			}

			return width;
		},

		load: function (name) {
			var Solitaire = Y.Solitaire,
			    base = Solitaire.Card.base;

			if (!(name in this)) {
				name = "dondorf";
			}

			if (base.theme !== name) {
				this.set(name, 122);
			}
		},

		set: function (name, size) {
			var theme = this[name][size];

			Y.mix(Y.Solitaire.Card.base, {
				theme: name + "/" + size,
				hiddenRankHeight: theme.hiddenRankHeight,
				rankHeight: theme.rankHeight,
				width: theme.dimensions[0],
				height: theme.dimensions[1]
			}, true);
		}
	};


	function modules() {
		var modules = extensions.slice(),
		    m;

		for (m in games) {
			if (games.hasOwnProperty(m)) {
				modules.unshift(m);
			}
		}

		return modules;
	}

	function main(YUI) {
		Y = YUI;

		exportAPI();
		Y.on("domready", load);
	}

	function showDescription() {
		GameChooser.select(this._node.id);
		GameChooser.choose();
	}

	function attachEvents() {
		Y.on("click", restart, Y.one("#restart"));
		Y.on("click", function () { GameChooser.show(false); }, Y.one("#choose_game"));
		Y.on("click", function () { active.game.undo(); }, Y.one("#undo"));
		Y.on("click", newGame, Y.one("#new_deal"));

		Y.on("click", hideChromeStoreLink, Y.one(".chromestore"));

		Y.delegate("click", showDescription, "#descriptions", "li");

                Y.on("click", function () { GameChooser.hide(); }, Y.one("#close-chooser"));
		Y.one("document").on("keydown", function (e) {
			e.keyCode === 27 && GameChooser.hide();
		});

		Y.on("afterSetup", function() {
			active.game.stationary(function () {
				resize()
			});
		});

		attachResize();
	}

	function attachResize() {
		var timer,
		    delay = 250,
		    attachEvent;

		if (window.addEventListener) {
			attachEvent = "addEventListener";
		} else if (window.attachEvent) {
			attachEvent = "attachEvent";
		}

		window[attachEvent](Y.Solitaire.Application.resizeEvent, function () {
			clearTimeout(timer);
			timer = setTimeout(resize, delay);
		}, false);
	}

	function resize() {
		var game = active.game,
		    el = game.container(),
		    padding = Y.Solitaire.padding,
		    offset = Y.Solitaire.offset,
		    width = el.get("winWidth") - padding.x,
		    height = el.get("winHeight") - padding.y,
		    ratio = 1;

		Y.Solitaire.Application.windowHeight = height;
		ratio = Math.min((width - offset.left) / game.width(), (height - offset.top) / game.height());

		active.game.resize(ratio);
		GameChooser.refit();
	}

	function playGame(name) {
		var twoWeeks = 1000 * 3600 * 24 * 14;

		active.name = name;
		active.game = Y.Solitaire[games[name]];
		Y.Cookie.set("options", name, {expires: new Date(new Date().getTime() + twoWeeks)});
		newGame();
	}

	function loadOptions() {
		var options = Y.Cookie.get("options");

		options && (active.name = options);

		Themes.load("dondorf");
	}

	function load() {
		var save = Y.Cookie.get("saved-game");

		attachEvents();
		loadOptions();

		Preloader.preload();
		Preloader.loaded(function () {
			showChromeStoreLink();
			if (save) {
				clearDOM();
				active.game = Y.Solitaire[games[active.name]];
				active.game.loadGame(save);
			} else {
				playGame(active.name);
			}
		});

		GameChooser.init();
	}

	function clearDOM() {
		Y.all(".stack, .card").remove();
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

	function exportAPI() {
		Y.Solitaire.Application = {
			windowHeight: 0,
			resizeEvent: "resize",
			GameChooser: GameChooser,
			newGame: newGame
		};
	}

        function hideChromeStoreLink() {
		var expires = 1000 * 3600 * 24 * 365; // one year

		Y.one(".chromestore").addClass("hidden");
		Y.Cookie.set("disable-chromestore-link", true, {expires: new Date(new Date().getTime() + expires)});
        }

	function showChromeStoreLink() {
		if (Y.UA.chrome && !Y.Cookie.get("disable-chromestore-link", Boolean)) {
			Y.one(".chromestore").removeClass("hidden");
		}
	}

	var Preloader = {
		loadingCount: 0,

		loaded: function (callback) {
			if (this.loadingCount) {
				setTimeout(function () {
					this.loaded(callback);
				}.bind(this), 100);
			} else {
				Y.one(".loading").addClass("hidden");
				callback();
				Fade.hide();
			}
		},
	
		load: function (path) {
			var image = new Image;

			image.onload = function () {
				--this.loadingCount;
			}.bind(this);
			image.src = path;

			this.loadingCount++;
		},

		preload: function () {
			    var rank,
			    icons = ["agnes",
			    	     "flower-garden",
				     "forty-thieves",
				     "freecell",
				     "gclock",
				     "golf",
				     "klondike1t",
				     "klondike",
				     "montecarlo",
				     "pyramid",
				     "scorpion",
				     "spider1s",
				     "spider2s",
				     "spiderette",
				     "spider",
				     "tritowers",
				     "will-o-the-wisp",
				     "yukon"];

			Y.Array.each(["s", "h", "c", "d"], function (suit) {
				for (rank = 1; rank <= 13; rank++) {
					this.load(Y.Solitaire.Card.base.theme + "/" + suit + rank + ".png");
				}
			}, this);

			this.load(Y.Solitaire.Card.base.theme + "/facedown.png");

			Y.Array.each(icons, function (image) {
				this.load("layouts/mini/" + image + ".png");
			}, this);

			Fade.show();
			Y.one(".loading").removeClass("hidden");
		}
	};

	yui.use.apply(yui, modules().concat(main));
}());
