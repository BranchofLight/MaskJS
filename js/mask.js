// ? used to denote repetition of part (eg. $!0?)
var rep_char = '?';
var alpha_char = 'X';
var num_char = '#';
var white_char = '_';
var escape_char = '\\';

var mask = function(input, in_mask, options) {
	if (options) {
  	if (options.placeholder) {
    	input.placeholder = options.placeholder;
    }
  }

  if (in_mask.indexOf(rep_char) > -1) {
  	options.first_rep = in_mask.indexOf(rep_char);
    console.log("first_rep: " + options.first_rep);

    if (in_mask.substring(options.first_rep+1).indexOf(rep_char) > -1) {
    	options.second_rep = in_mask.substring(options.first_rep+1).indexOf(rep_char);
      options.second_rep += options.first_rep+1;
      console.log("second_rep: " + options.second_rep);

      if (in_mask.substring(options.second_rep+1).indexOf(rep_char) > -1) {
      	options.third_rep = in_mask.substring(options.second_rep+1).indexOf(rep_char);
      	options.third_rep += options.second_rep+1;
        console.log("third_rep: " + options.third_rep);
      }
    }
  }

  var isSpecialChar = function(c, next) {
    return ((next != escape_char) && (c === rep_char || c === alpha_char ||
           c === white_char || c === num_char || c === escape_char));
  };

  var mask_cursor = 0;
  var keydown_listener = function(e) {
    if (isSpecialChar(in_mask[mask_cursor], in_mask[mask_cursor+1])) {
      switch (in_mask[mask_cursor]) {
        case rep_char:
          console.log("Repeat character");
          break;
        case alpha_char:
          console.log("Alpha character");
          break;
        case white_char:
          console.log("Whitespace character");
          break;
        case num_char:
          console.log("Number character");
          break;
        case escape_char:
          console.log("Escape character");
          break;
      }
    }

    if (e.key != in_mask[mask_cursor]) {
      e.preventDefault();
    } else {
      ++mask_cursor;
    }
  };

  addEventListener("keydown", keydown_listener, {capture: true});
};

mask(document.getElementById('money'), "$###,?", {placeholder: "$0.00"});
