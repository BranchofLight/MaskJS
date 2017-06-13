// ? used to denote repetition of part (eg. $0?)
var rep_char = '?';
var alpha_char = 'X';
var num_char = '#';
var white_char = '_';
var escape_char = '\\';
var deletes = ["Backspace", "Delete"];

var mask = function(input, in_mask, options) {
	if (options) {
  	if (options.placeholder) {
    	input.placeholder = options.placeholder;
    }
  }

  // Checks if c is a special character
  var isSpecialChar = function(c, next) {
    return ((next != escape_char) && (c === rep_char || c === alpha_char ||
           c === white_char || c === num_char || c === escape_char));
  };

  // Checks if c is a delete character
  var isDelete = function(c) {
    return (deletes.indexOf(c) > -1);
  };

  // Adds literals if needed
  var checkLiterals = function(e) {
    var temp = "";
    while (!isSpecialChar(in_mask[mask_cursor], in_mask[mask_cursor+1])) {
      temp += in_mask[mask_cursor];
      ++mask_cursor;
    }

    if (temp) {
      e.target.value += temp;
    }
  };

  // Holds the place in the input mask
  var mask_cursor = 0;
  // The core functionality for the masking
  var keydown_listener = function(e) {
    console.log("Down [" + mask_cursor + "]: " + in_mask[mask_cursor]);
    var valid = false;

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
          if (e.key >= "0" && e.key <= "9") {
            valid = true;
          }
          break;
        case escape_char:
          console.log("Escape character");
          break;
      }
    }

    if (!valid && !isDelete(e.key)) {
      e.preventDefault();
    } else if (valid) {
      ++mask_cursor;
    }
  };

  var keyup_listener = function(e) {
    checkLiterals(e);
    if (isDelete(e.key)) {
      if (mask_cursor > 0) {
        --mask_cursor;
      }
    }

    console.log("Up [" + mask_cursor + "]: " + in_mask[mask_cursor]);
  }

  // Adds any literals to beginning of input
  var focus_listener = function(e) {
    checkLiterals(e);
  };

  // Sets input to default if focus is lost before valid input
  var focus_lost_listener = function(e) {
    if (options.min > 0 && e.target.value.length < options.min && e.target.value.length > 0) {
      e.target.value = options.default;
    }
  };

  input.addEventListener("keydown", keydown_listener);
  input.addEventListener("keyup", keyup_listener);
  input.addEventListener("focusin", focus_listener);
  input.addEventListener("focusout", focus_lost_listener);
};

mask(document.getElementById('money'), "$###,?.##", {
  placeholder: "$0.00",
  min: 5,
  default: "$0.00",
  post: undefined, // will be function that runs on input value on focus lost
});
