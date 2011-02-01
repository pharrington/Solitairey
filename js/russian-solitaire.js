YUI.add("russian-solitaire", function (Y) {

  var Solitaire = Y.Solitaire,
    Yukon = Solitaire.Yukon,
    RussianSolitaire = Solitaire.RussianSolitaire = instance(Yukon, {
      Card: instance(Yukon.Card)
    });

  RussianSolitaire.Card.validTarget = function (stack) {
    var target = stack.last();

    switch (stack.field) {
    case "tableau":
      if (!target) {
         return this.rank === 13;
       } else {
         return !target.isFaceDown && target.suit === this.suit && target.rank === this.rank + 1;
       }
    case "foundation":
      if (!target) {
        return this.rank === 1;
      } else {
        return target.suit === this.suit && target.rank === this.rank - 1;
      }
    default:
      return false;
    }
  };
}, "0.0.1", {requires: ["yukon"]});
