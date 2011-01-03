YUI.add("anim-accel", function (Y) {
	var property,
	    onEnd;

	/* test if we have CSS3 transition support
	 * if not, just use ye olde times Y.Anim
	 */
	(function () {
		var testNode = document.body || document.documentElement,
		    tests = {
		    /*
		     * Firefox 4 Beta and and Opera 11 seem extremely inconsistent with actually handling transitions right now
			"MozTransition": {onEnd: "transitionend"},
			"OTransition": {onEnd: "oTransitionEnd"},
		     */
			"WebkitTransition": {onEnd: "webkitTransitionEnd"},
		    },
		    test;

		for (test in tests) {
			if (!tests.hasOwnProperty(test)) { continue; }

			if (testNode.style[test] !== undefined) {
				property = test;
				onEnd = tests[test].onEnd;
				break;
			}
		}

		if (!property) { Y.AnimAccel = Y.Anim; }
	})();

	if (Y.AnimAccel) { return; }

	/*
	 * support found, create Y.AnimAccel class
	 */

	var easingToTransition = {
		easeNone: "linear",
		easeIn: "ease-in",
		easeOut: "ease-out",
		easeBoth: "ease-in-out",
		easeInStrong: "cubic-bezier(0, 0.75, 1, 1)",
		easeOutStrong: "cubic-bezier(0, 0, 0.25, 1)"
	    },
	    DEFAULT_TRANSITION = "linear";

	function AnimAccel(config) {
		AnimAccel.superclass.constructor.apply(this, arguments);
	}

	AnimAccel.ATTRS = {
		easing: {
			value: DEFAULT_TRANSITION,

			setter: function (value) {
				var easings = Y.Easing,
				    easing;

				if (typeof value === "string") {
					if (value in easings) {
						value = easingToTransitions[value];
						return value || DEFAULT_TRANSITION;
					}

					return value;
				}
				
				if (typeof value === "function") {
					for (easing in easings) {
						if (value === easings[easing]) {
							return easingToTransition[easing] || DEFAULT_TRANSITION;
						}
					}
				}
			}
		},

		to: {
			getter: function (value) {
				value[property + "TimingFunction"] = this.get("easing");
				value[property + "Duration"] = this.get("duration") + "s";
				return value;
			}
		}
	};

	Y.extend(AnimAccel, Y.Anim, {
		_start: function () {
			var node = this.get("node"),
			    anim = this;

			node.setStyles(this.get("from"));
			node.setStyles(this.get("to"));

			/*
			node.once(onEnd, function () {
				anim._beforeEnd();
			});
			*/

			// pretty sure this leaks memory. Unfortunately the above doesn't work :\
			node._node.addEventListener(onEnd, function () {
				anim._end();
			}, false);

			this.fire("start");
		},
	});

	Y.AnimAccel = AnimAccel;
}, "1.0.0", {requires: ["anim"]});
