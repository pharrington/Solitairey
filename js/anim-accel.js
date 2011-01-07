YUI.add("anim-accel", function (Y) {
	var properties;

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
			"WebkitTransform": {transition: "WebkitTransition", onEnd: "webkitTransitionEnd"},
		    },
		    test;

		for (test in tests) {
			if (!tests.hasOwnProperty(test)) { continue; }

			if (testNode.style[test] !== undefined) {
				properties = tests[test];
				properties.transform = test;
				break;
			}
		}

		if (!properties) { Y.AnimAccel = Y.Anim; }
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
			setter: function (value) {
				var transition = properties.transition,
				    transform = properties.transform,
				    property = "",

				    node = this.get("node"),

				    width = parseFloat(value.width),
				    height = parseFloat(value.height),

				    left = parseFloat(value.left),
				    top = parseFloat(value.top),

				    scaleY, scaleY,
				    result = value;

				this._unaccelTo = Y.merge({}, value);

				result[transition + "TimingFunction"] = this.get("easing");
				result[transition + "Duration"] = this.get("duration") + "s";
				result[transform + "Style"] = "flat";

				/*
				if (!isNaN(width)) {
					scaleX = width / parseFloat(node.getStyle("width"));
					property += "scaleX(" + scaleX + ") ";
				}

				if (!isNaN(height)) {
					scaleY = height / parseFloat(node.getStyle("height"));
					property += "scaleY(" + scaleY + ") ";
				}
				*/

				if (!isNaN(left)) {
					delete result.left;
					left -= parseFloat(node.getStyle("left"));

					if (isNaN(top)) {
						property += "translate3d(" + left + "px,0,0) ";
					}
				}

				if (!isNaN(top)) {
					delete result.top;
					top -= parseFloat(node.getStyle("top"));

					if (isNaN(left)) {
						property += "translate3d(0," + top + "px,0) ";
					}
				}

				if (!(isNaN(top) || isNaN(left))) {
					property += "translate3d(" + left + "px," + top + "px, 0) ";
				}

				result[transform] = property;

				return result;
			}
		}
	};

	Y.extend(AnimAccel, Y.Anim, {
		_start: function () {
			var node = this.get("node"),
			    _node = node._node,
			    style = _node.style,
			    anim = this;

			node.setStyles(this.get("from"));
			node.setStyles(this.get("to"));

			if (!this._beforeEnd) {
				this._beforeEnd = Y.bind(function () {
					style[properties.transform] = "";
					style[properties.transition + "TimingFunction"] = "";
					style[properties.transition + "Duration"] = "";
					style[properties.transform + "Style"] = "";
					node.setStyles(this._unaccelTo);
					_node.removeEventListener(properties.onEnd, this._beforeEnd, false);
					this._end();
				}, this);
			}

			_node.addEventListener(properties.onEnd, this._beforeEnd, false);

			this.fire("start");
		},
	});

	Y.AnimAccel = AnimAccel;
}, "1.0.0", {requires: ["anim"]});
