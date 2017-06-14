// TODO:
// - Finish core feature set
// - Make tabs functional
// - Finish features suggested in comments and code below
// - Add keydown, focus and focuslost options for mask()

var DEBUG = true;

// ? used to group a repeating part (eg. $?0?)
var rep_char = '?';
var alpha_char = 'X';
var num_char = '#';
var white_char = '_';
var escape_char = '\\'; // Not implemented, semi-considered in code
var deletes = ["Backspace"]; // Removed delete for now

// Options Object
// html_placeholder : adds a placeholder attribute to the input on the DOM
// mask_placeholder : adds a mask seen as the user types in the input field
// min              : the minimum amount of characters required otherwise default will replace the input value
// default          : the replacement if input loses focusses before the min number of characters is reached
// keydown          : a function to be called on keydown
// keyup            : a function to be called on keyup

if (!DEBUG) {
	document.getElementById('mask').remove();
}

var mask = function(input, in_mask, options) {
	// Stores literals until they should be drawn
	// var buffer = "";
	// Holds the place in the input mask
  var mask_cursor = 0;

	// Checks if c is a special character
  var isSpecialChar = function(c, next) {
    return ((next != escape_char) && (c === rep_char || c === alpha_char ||
           c === white_char || c === num_char || c === escape_char));
  };

	// Shorthand
	var isCursorSpecial = function() {
		return isSpecialChar(in_mask[mask_cursor], in_mask[mask_cursor+1]);
	};

  // Checks if c is a delete character
  var isDelete = function(c) {
    return (deletes.indexOf(c) > -1);
  };

	// Peeks behind the cursor
	var peekBack = function() {
		return in_mask[mask_cursor-1];
	};

	if (DEBUG) {
		for (let i = 0; i < in_mask.length; i++) {
			if (i === 0) {
				document.getElementById('mask').innerHTML += '<span class="active '+i+'">'+in_mask[i]+'</span>';
			} else {
				document.getElementById('mask').innerHTML += '<span class="'+i+'">'+in_mask[i]+'</span>';
			}
		}
	}
	// Checks in_mask for validity
	// Throws error if invalid.
	var validate = function() {
		var group = [];
		var add = false;
		for (let i = 0; i < in_mask.length; i++) {
			if (add && !(in_mask[i] === rep_char && in_mask[i+1] != escape_char)) {
				group.push(in_mask[i]);
			}

			if (in_mask[i] === rep_char && in_mask[i+1] != escape_char) {
				if (add) {
					// Group is finished
					if (group.indexOf(in_mask[i+1]) > -1) {
						// The character after this group exists in this group
						// This would confuse the listeners!
						// (Do we continue in the current group or go to the next one?)
						// Ex. of invalid mask -> ?X,_?X -> alpha first in second group and in first group
						throw "InvalidMaskError: '" + in_mask[i+1] + "' cannot start second group.";
					}
				}
				add = !add;
			}
		}
	}();

	// Finds starting, non-deletable, literals
	var findStartingLiterals = function() {
		if (!isCursorSpecial()) {
			options.last_start_literal = 0;
			for (let i = 0; i < in_mask.length; i++) {
				if (!isSpecialChar(in_mask[i], in_mask[i+1])) {
					options.last_start_literal = i;
				} else {
					break;
				}
			}
		}
	}();

	if (options) {
  	if (options.html_placeholder) {
    	input.placeholder = options.html_placeholder;
    }
  }

	// Increases the cursor's position
	var advanceCursor = function(inc) {
		if (DEBUG) {
			document.getElementsByClassName('active')[0].nextSibling.classList.add("active");
			document.getElementsByClassName('active')[0].classList.remove('active');
		}
		mask_cursor += (inc) ? inc : 1;
		checkGroups();
		// checkLiterals();
	};

	// Move cursor back by dec / 1
	var backCursor = function(dec) {
		if (DEBUG) {
			document.getElementsByClassName('active')[0].previousSibling.classList.add("active");
			document.getElementsByClassName('active')[1].classList.remove('active');
		}
		mask_cursor -= (dec) ? dec : 1;
	};

	var setCursor = function(cursor) {
		mask_cursor = cursor;
		checkGroups();
		// checkLiterals();
	};

  // Adds literals to buffer if needed
  // var checkLiterals = function() {
  //   while (!isCursorSpecial()) {
  //     buffer += in_mask[mask_cursor];
	// 		console.log("Added '" + in_mask[mask_cursor] + "' to the buffer.");
  //     advanceCursor();
  //   }
  // };

	// Checks for groups and handles them accordingly
	var checkGroups = function() {
		if (isCursorSpecial()) {
			switch (in_mask[mask_cursor]) {
				case rep_char:
          console.log("Repeat character");
					if (options.repeat_start != undefined) {
						// Inside repeat group, spotted end, set cursor to beginning of group
						mask_cursor = options.repeat_start;
						if (DEBUG) {
							document.getElementsByClassName('active')[0].classList.remove('active');
							document.getElementsByClassName(options.repeat_start)[0].classList.add("active");
						}
					} else {
						// Found start of group
						options.repeat_start  = mask_cursor;
						options.repeat_end    = in_mask.indexOf(rep_char, mask_cursor+1);
						options.group_trigger = in_mask[options.repeat_end+1];
					}
					advanceCursor();
          break;
      }
		}
	};

  // The core functionality for the masking
  var keydown_listener = function(e) {
		console.log("Down [" + mask_cursor + "]: " + in_mask[mask_cursor]);

    var valid = false;

    switch (in_mask[mask_cursor]) {
      // case alpha_char:
      //   console.log("Alpha character");
      //   break;
      // case white_char:
      //   console.log("Whitespace character");
      //   break;
      case num_char:
        // console.log("Number character");
        if (e.key >= "0" && e.key <= "9") {
          valid = true;
        }
        break;
      // case escape_char:
      //   console.log("Escape character");
      //   break;
    }

		// Cursor literal is being typed
		if (!isCursorSpecial() && e.key === in_mask[mask_cursor]) {
			valid = true;
		}

    if (!valid && !isDelete(e.key)) {
      e.preventDefault();
    } else if (valid) {
      advanceCursor();
    } else if (isDelete(e.key)) {
      if (mask_cursor > 0) {

				// Guide for what to do based on what the cursor is peeking.
				// ----------------------------------------------------
				// Special character OR literal -> X:deleted, O:cursor special, U:cursor literal
				// -> Delete it. Move cursor back. (?OX#?)
				// -> Then check if cursor character is a repeat. (?X#?)YES (?#OX#?)NO
				// -> If yes, go behind repeat end. (?X#O?)
				// Repeat character
				// -> Check if start character
				// -> -> If yes, go behind end.
				// -> -> If no, go behind end (this char) and start group.
      }
    }
  };

  // Adds any literals to beginning of input
  var focus_listener = function(e) {
    if (input.value.length < options.last_start_literal+1) {
			input.value = "";
			for (let i = 0; i < options.last_start_literal+1; i++) {
				input.value += in_mask[i];
				advanceCursor();
			}
		}

		checkGroups();
  };

  // Sets input to default if focus is lost before valid input
  var focus_lost_listener = function(e) {
    if (options.min > 0 && e.target.value.length < options.min && e.target.value.length > 0) {
      e.target.value = options.default;
    }
  };

  input.addEventListener("keydown", keydown_listener);
  input.addEventListener("focusin", focus_listener);
  input.addEventListener("focusout", focus_lost_listener);
};

mask(document.getElementById('money'), "$?###mm,?.##", {
  html_placeholder: "$0.00",
  min: 2,
  default: "$0.00",
});
